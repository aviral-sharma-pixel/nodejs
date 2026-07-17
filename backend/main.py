import os
import asyncio
import imaplib
import email
from email.header import decode_header
from email.utils import parsedate_to_datetime
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from pydantic import BaseModel
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor
import json

# Load environment
from pathlib import Path
root_dir = Path(__file__).parent.parent
load_dotenv(root_dir / '.env.local')

# Alert model
class Alert(BaseModel):
    id: str
    title: str
    category: str
    server: str
    status: str
    timestamp: str
    description: str
    firstSeenAt: str
    durationMinutes: int = 0
    emailMessageId: str | None = None

# Gmail labels to monitor (case sensitive based on user's Gmail labels)
GMAIL_LABELS = ["CPU", "Memory", "Disk", "5XX", "ports", "db"]

# Storage
alerts_store: Dict[str, Alert] = {}
seen_email_ids: set = set()
active_connections: List[WebSocket] = []

class GmailService:
    def __init__(self, email_addr: str, app_password: str):
        self.email_addr = email_addr
        self.app_password = app_password
        self.imap = None
    
    def connect(self):
        try:
            print(f"Connecting to Gmail: {self.email_addr}")
            self.imap = imaplib.IMAP4_SSL("imap.gmail.com", 993, timeout=30)
            self.imap.login(self.email_addr, self.app_password)
            print(f"✓ Gmail connected")
            return True
        except Exception as e:
            print(f"✗ Gmail connection failed: {e}")
            return False
    
    def disconnect(self):
        if self.imap:
            try:
                self.imap.close()
                self.imap.logout()
            except:
                pass
    
    def parse_email(self, email_data: bytes) -> dict:
        msg = email.message_from_bytes(email_data)
        
        subject = ""
        if "Subject" in msg:
            decoded = decode_header(msg["Subject"])
            subject = "".join([text.decode(charset) if isinstance(text, bytes) else text for text, charset in decoded])
        
        date_str = msg.get("Date", datetime.now().isoformat())
        
        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    try:
                        body = part.get_payload(decode=True).decode()
                        break
                    except:
                        pass
        else:
            try:
                body = msg.get_payload(decode=True).decode()
            except:
                body = msg.get_payload()
        
        return {
            "subject": subject,
            "date": date_str,
            "body": body,
            "message_id": msg.get('Message-ID')
        }
    
    def extract_alert(self, parsed: dict, label: str) -> Alert:
        raw_subject = parsed["subject"]  # preserve original case
        subject_lower = raw_subject.lower()
        body = parsed["body"].lower()

        # ── 1. Extract status from bracket prefix e.g. "[ok]", "[alerting]", "[no data]" ──
        import re
        bracket_match = re.match(r'^\[([^\]]+)\]\s*', raw_subject)
        if bracket_match:
            tag = bracket_match.group(1).lower()
            if tag in ('ok', 'resolved', 'healthy', 'normal'):
                status = 'ok'
            else:
                # alerting, firing, no data, critical, warning → all fire
                status = 'firing'
            # Strip the bracket prefix from the title
            clean_title = raw_subject[bracket_match.end():].strip()
        else:
            # Fallback: scan for keywords
            status = 'ok' if any(x in subject_lower for x in ['resolved', ' ok ', 'healthy']) else 'firing'
            clean_title = raw_subject.strip()

        # ── 2. Use label as category ──
        category = label

        # ── 3. Extract server/host from subject (Grafana usually puts hostname in subject) ──
        server = 'unknown'
        # Try common Grafana patterns: "hostname_alert_name" or "hostname  alert_name"
        parts = clean_title.split()
        if parts:
            # First word is often the server/host identifier
            first_word = parts[0]
            if '_' in first_word:
                server = first_word.split('_')[0]  # e.g. "crm-bikedekho" from "crm-bikedekho_cpu"
            elif '-' in first_word and len(parts) > 1:
                server = first_word  # e.g. "cd-integration"
            elif len(first_word) > 3:
                server = first_word

        # ── 4. Deterministic logical ID (Category + Server + Title) to correlate firing and ok emails ──
        import hashlib
        safe_title = clean_title[:50].strip().replace(' ', '_').replace('/', '_').replace('\\', '_')
        safe_server = server.replace('/', '_').replace('\\', '_')
        alert_id = f"{label}_{safe_server}_{safe_title}"

        # ── 5. firstSeenAt = NOW (when we ingested it), NOT the email send date ──
        first_seen_at = datetime.now().isoformat()

        return Alert(
            id=alert_id,
            title=clean_title[:150],
            category=category,
            server=server,
            status=status,
            timestamp=parsed["date"],   # original email date (for display)
            description=body[:300],
            firstSeenAt=first_seen_at,  # when WE ingested it
            durationMinutes=0,
            emailMessageId=parsed.get('message_id')
        )
    
    def fetch_alerts(self, limit_per_label=500) -> List[Alert]:
        """Fetch new alerts from Gmail"""
        global seen_email_ids
        alerts = []
        
        try:
            # Test connection
            try:
                self.imap.status("INBOX", "(MESSAGES)")
            except:
                print("Reconnecting...")
                self.disconnect()
                if not self.connect():
                    return []
            
            for label in GMAIL_LABELS:
                try:
                    # Select label
                    status, _ = self.imap.select(label, readonly=True)
                    if status != "OK":
                        status, _ = self.imap.select(f'"{label}"', readonly=True)
                    if status != "OK":
                        print(f"  Label '{label}' not found")
                        continue
                    
                    # Search for emails from the LAST 24 HOURS only
                    yesterday = (datetime.now() - timedelta(days=1)).strftime("%d-%b-%Y")
                    status, email_ids = self.imap.search(None, f'SINCE {yesterday}')
                    if status != "OK":
                        continue
                    
                    email_list = email_ids[0].split()
                    # We only care about the NEWEST emails (end of the list)
                    recent_emails = email_list[-300:]
                    new_ids = [
                        e.decode() if isinstance(e, bytes) else e 
                        for e in recent_emails 
                        if (e.decode() if isinstance(e, bytes) else e) not in seen_email_ids
                    ]
                    
                    # Process up to limit
                    count = 0
                    for email_id in new_ids[:limit_per_label]:
                        email_id_str = email_id.decode() if isinstance(email_id, bytes) else email_id
                        
                        try:
                            status, data = self.imap.fetch(email_id, "(RFC822)")
                            if status == "OK" and data[0]:
                                parsed = self.parse_email(data[0][1])
                                alert = self.extract_alert(parsed, label)
                                alerts.append(alert)
                                seen_email_ids.add(email_id_str)
                                count += 1
                        except:
                            pass
                    
                    if count > 0:
                        print(f"  Label '{label}': fetched {count} alerts")
                
                except Exception as e:
                    print(f"  Label '{label}' error: {e}")
            
            return alerts
        
        except Exception as e:
            print(f"Fetch error: {e}")
            return []

# Global service
gmail_service: Optional[GmailService] = None

async def poll_alerts():
    """Poll Gmail every 30 seconds"""
    print("Poll task started")
    await asyncio.sleep(3)
    
    loop = asyncio.get_event_loop()
    executor = ThreadPoolExecutor(max_workers=1)
    
    poll_num = 0
    while True:
        try:
            poll_num += 1
            if gmail_service:
                print(f"\n[POLL {poll_num}] Fetching alerts...")
                new_alerts = await loop.run_in_executor(executor, gmail_service.fetch_alerts)
                print(f"[POLL {poll_num}] Got {len(new_alerts)} alerts")
                
                if new_alerts:
                    for alert in new_alerts:
                        if alert.status == 'firing':
                            if alert.id not in alerts_store or alerts_store[alert.id].status == 'ok':
                                alerts_store[alert.id] = alert
                                print(f"  Started firing: {alert.title[:40]} | {alert.category}")
                        elif alert.status == 'ok':
                            if alert.id in alerts_store and alerts_store[alert.id].status == 'firing':
                                # Calculate locked duration
                                try:
                                    from email.utils import parsedate_to_datetime
                                    start_dt = parsedate_to_datetime(alerts_store[alert.id].timestamp).astimezone().replace(tzinfo=None)
                                    end_dt = parsedate_to_datetime(alert.timestamp).astimezone().replace(tzinfo=None)
                                    dur = max(0, int((end_dt - start_dt).total_seconds() / 60))
                                except Exception as e:
                                    dur = 0
                                alerts_store[alert.id].status = 'ok'
                                alerts_store[alert.id].durationMinutes = dur
                                print(f"  Resolved: {alert.title[:40]} | dur: {dur}m")
                    print(f"[POLL {poll_num}] Total in store: {len(alerts_store)}")
                    
                    # Broadcast to WebSocket
                    for ws in active_connections:
                        try:
                            await ws.send_json({"type": "new_alerts", "count": len(alerts_store)})
                        except:
                            pass
            
            await asyncio.sleep(30)
        except Exception as e:
            print(f"[POLL] Error: {e}")
            import traceback
            traceback.print_exc()
            await asyncio.sleep(30)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global gmail_service
    import sys
    sys.stdout.flush()
    sys.stderr.flush()
    
    print("=== STARTING BACKEND ===", flush=True)
    email = os.getenv("GMAIL_EMAIL")
    password = os.getenv("GMAIL_APP_PASSWORD")
    print(f"Gmail: {email}", flush=True)
    
    if email and password:
        gmail_service = GmailService(email, password)
        if gmail_service.connect():
            print("Starting poll task...", flush=True)
            asyncio.create_task(poll_alerts())
            print("Poll task created", flush=True)
    
    yield
    
    # Shutdown
    print("Shutting down...", flush=True)
    if gmail_service:
        gmail_service.disconnect()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/alerts")
async def get_alerts():
    """Get all alerts with calculated duration from original email timestamp"""
    now = datetime.now()
    result_alerts = []

    for alert in alerts_store.values():
        # ── Duration is calculated dynamically if firing, otherwise use locked duration ──
        if alert.status == 'firing':
            try:
                from email.utils import parsedate_to_datetime
                import datetime as dt_mod
                email_dt = parsedate_to_datetime(alert.timestamp)
                # Convert email_dt to local naive datetime
                email_dt_local = email_dt.astimezone().replace(tzinfo=None)
                duration = max(0, int((now - email_dt_local).total_seconds() / 60))
            except Exception as e:
                duration = 0
        else:
            duration = alert.durationMinutes

        result_alerts.append({
            "id":              alert.id,
            "title":          alert.title,
            "name":           alert.title,
            "email":          alert.server,
            "server":         alert.server,
            "status":         alert.status,
            "alertType":      alert.category.lower(),
            "category":       alert.category,
            "durationMinutes": duration,
            "timestamp":      alert.timestamp,
            "firstSeenAt":    alert.firstSeenAt,
            "description":    alert.description,
            "emailMessageId": alert.emailMessageId
        })

    return {"alerts": result_alerts}

@app.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        await websocket.send_json({
            "type": "initial",
            "alerts": [a.dict() for a in alerts_store.values()]
        })
        
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)

@app.post("/api/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    if alert_id in alerts_store:
        del alerts_store[alert_id]
    return {"success": True}

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "alerts": len(alerts_store),
        "seen_emails": len(seen_email_ids)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
