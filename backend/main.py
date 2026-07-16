import os
import asyncio
import imaplib
import email
from email.header import decode_header
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor
import json
import threading

# Load .env.local from root directory
import sys
from pathlib import Path
root_dir = Path(__file__).parent.parent
load_dotenv(root_dir / '.env.local')

# Alert model
class Alert(BaseModel):
    id: str
    title: str
    severity: str
    category: str
    server: str
    status: str
    timestamp: str
    description: str
    raw_email: str

# Gmail labels to monitor
GMAIL_LABELS = ["CPU", "Memory", "Disk", "5XX"]

# Alert ID counter for uniqueness
alert_id_counter = 0

# In-memory alert storage with timestamp tracking
alerts_store = {}  # {alert_id: Alert}
seen_email_ids = set()  # Track which emails we've already processed
latest_alert: Optional[Alert] = None
active_connections: List[WebSocket] = []

class GmailService:
    def __init__(self, email_addr: str, app_password: str):
        self.email_addr = email_addr
        self.app_password = app_password
        self.imap = None
        
    def connect(self):
        try:
            print(f"Attempting to connect to Gmail: {self.email_addr}")
            self.imap = imaplib.IMAP4_SSL("imap.gmail.com", 993, timeout=30)
            self.imap.login(self.email_addr, self.app_password)
            print(f"✓ Connected to Gmail: {self.email_addr}")
            return True
        except imaplib.IMAP4.error as e:
            print(f"Gmail IMAP error: {e}")
            print(f"Possible causes:")
            print(f"  - App password may be incorrect")
            print(f"  - Gmail account may not have IMAP enabled")
            print(f"  - 2FA not enabled on account")
            print(f"  - Network/firewall blocking Gmail")
            return False
        except Exception as e:
            print(f"Gmail connection error: {type(e).__name__}: {e}")
            print(f"Email: {self.email_addr}")
            import traceback
            traceback.print_exc()
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
            decoded_subject = decode_header(msg["Subject"])
            subject = "".join([text.decode(charset) if isinstance(text, bytes) else text 
                              for text, charset in decoded_subject])
        
        from_addr = msg.get("From", "unknown")
        date_str = msg.get("Date", datetime.now().isoformat())
        
        body = ""
        html_body = ""
        
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                try:
                    if content_type == "text/plain":
                        body = part.get_payload(decode=True).decode()
                    elif content_type == "text/html":
                        html_body = part.get_payload(decode=True).decode()
                except:
                    pass
        else:
            try:
                body = msg.get_payload(decode=True).decode()
            except:
                body = msg.get_payload()
        
        return {
            "subject": subject,
            "from": from_addr,
            "date": date_str,
            "body": body,
            "html": html_body,
            "raw": email_data.decode(errors='ignore')
        }
    
    def extract_alert_info(self, parsed_email: dict, label: str = None) -> Alert:
        subject = parsed_email["subject"].lower()
        body = (parsed_email["body"] + " " + parsed_email["html"]).lower()
        
        # Determine severity
        severity = "info"
        if "critical" in subject or "error" in subject or "failed" in subject:
            severity = "critical"
        elif "warning" in subject or "alert" in subject:
            severity = "warning"
        
        # Use the Gmail label as category, fallback to parsing subject
        category = label if label else "general"
        if not label:
            for label_name in GMAIL_LABELS:
                if label_name.lower() in subject:
                    category = label_name
                    break
        
        # Extract server info from subject (often has server name)
        server = "unknown"
        subject_parts = subject.split()
        for i, part in enumerate(subject_parts):
            if "server" in part.lower() and i + 1 < len(subject_parts):
                server = subject_parts[i + 1]
                break
        
        # If server not found in subject, try body
        if server == "unknown" and "server" in body:
            parts = body.split("server")
            if len(parts) > 1:
                server_part = parts[1].split()[0:2]
                server = " ".join(server_part)
        
        # Determine status based on subject keywords
        status = "firing"
        if "resolved" in subject or "ok" in subject or "healthy" in subject:
            status = "ok"
        
        global alert_id_counter
        alert_id_counter += 1
        alert_id = f"{int(datetime.now().timestamp())}_{alert_id_counter}"
        
        return Alert(
            id=alert_id,
            title=parsed_email["subject"],
            severity=severity,
            category=category,
            server=server,
            status=status,
            timestamp=parsed_email["date"],
            description=parsed_email["body"][:200],
            raw_email=parsed_email["raw"][:500]
        )
    
    def fetch_unread_emails(self, max_emails_per_label=20) -> List[Alert]:
        """Fetch unread emails from Gmail labels. Limit to max_emails_per_label per label to avoid timeout."""
        global seen_email_ids
        alerts = []
        try:
            # Reconnect if connection is lost
            try:
                if self.imap:
                    # Test if connection is still alive
                    status, _ = self.imap.status("INBOX", "(MESSAGES)")
                    if status != "OK":
                        raise Exception("Connection test failed")
            except:
                print("IMAP connection lost, reconnecting...")
                self.disconnect()
                if not self.connect():
                    return []
            
            for label in GMAIL_LABELS:
                try:
                    # Try with simpler label format first
                    status, mailbox = self.imap.select(label)
                    if status != "OK":
                        # Try with quoted format
                        status, mailbox = self.imap.select(f'"{label}"')
                    if status != "OK":
                        print(f"Couldn't select label {label}")
                        continue
                    
                    status, email_ids = self.imap.search(None, "UNSEEN")
                    if status != "OK":
                        print(f"Search failed for {label}")
                        continue
                    
                    email_id_list = email_ids[0].split()
                    new_emails = [eid for eid in email_id_list if (eid.decode() if isinstance(eid, bytes) else eid) not in seen_email_ids]
                    print(f"Label {label}: Found {len(email_id_list)} unread, {len(new_emails)} new")
                    
                    # Limit processing to avoid timeout
                    for email_id in new_emails[:max_emails_per_label]:
                        email_id_str = email_id.decode() if isinstance(email_id, bytes) else email_id
                        
                        try:
                            status, email_data = self.imap.fetch(email_id, "(RFC822)")
                            if status == "OK" and email_data[0] and email_data[0][1]:
                                parsed = self.parse_email(email_data[0][1])
                                # Pass the label name to extract_alert_info
                                alert = self.extract_alert_info(parsed, label=label)
                                alerts.append(alert)
                                seen_email_ids.add(email_id_str)
                                print(f"  Processed email from {label}: {alert.title[:60]}")
                                
                                # Mark as read after successfully processing
                                self.imap.store(email_id, "+FLAGS", "\\Seen")
                        except Exception as e:
                            print(f"Error processing email in {label}: {type(e).__name__}: {e}")
                except Exception as e:
                    print(f"Error with label {label}: {type(e).__name__}: {e}")
                    import traceback
                    traceback.print_exc()
            
            return alerts
        except Exception as e:
            print(f"Error fetching emails: {e}")
            import traceback
            traceback.print_exc()
            return []

# Initialize Gmail service
gmail_service: Optional[GmailService] = None

async def poll_gmail():
    """Background task to poll Gmail every 30 seconds"""
    global latest_alert
    
    print("Starting Gmail polling task...")
    await asyncio.sleep(2)  # Wait for startup to complete
    
    loop = asyncio.get_event_loop()
    executor = ThreadPoolExecutor(max_workers=1)
    
    while True:
        try:
            if gmail_service and gmail_service.imap:
                print(f"Polling Gmail for new alerts... (tracking {len(seen_email_ids)} emails)")
                # Run blocking IMAP operations in thread pool
                new_alerts = await loop.run_in_executor(executor, gmail_service.fetch_unread_emails)
                print(f"Found {len(new_alerts)} new alerts, total in store: {len(alerts_store)}")
                
                for alert in new_alerts:
                    alerts_store[alert.id] = alert
                    latest_alert = alert
                    print(f"New alert: {alert.title} (Category: {alert.category})")
                    
                    # Broadcast to connected WebSocket clients
                    for connection in active_connections:
                        try:
                            await connection.send_json({
                                "type": "new_alert",
                                "alert": alert.dict()
                            })
                        except:
                            pass
            
            await asyncio.sleep(30)
        except Exception as e:
            print(f"Error in poll_gmail: {e}")
            await asyncio.sleep(30)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global gmail_service
    email_addr = os.getenv("GMAIL_EMAIL")
    app_password = os.getenv("GMAIL_APP_PASSWORD")
    
    if not email_addr or not app_password:
        print("ERROR: GMAIL_EMAIL and GMAIL_APP_PASSWORD not set")
    else:
        gmail_service = GmailService(email_addr, app_password)
        if gmail_service.connect():
            asyncio.create_task(poll_gmail())
    
    yield
    
    # Shutdown
    if gmail_service:
        gmail_service.disconnect()

app = FastAPI(title="Alert Backend", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST API Endpoints

@app.get("/api/alerts", response_model=List[Alert])
async def get_alerts():
    """Get all active alerts"""
    return list(alerts_store.values())

@app.get("/api/alerts/latest", response_model=Optional[Alert])
async def get_latest_alert():
    """Get newest alert"""
    return latest_alert

@app.post("/api/alerts/refresh")
async def refresh_alerts():
    """Manually trigger Gmail check"""
    if not gmail_service:
        return {"error": "Gmail service not configured"}
    
    new_alerts = gmail_service.fetch_unread_emails()
    
    for alert in new_alerts:
        alerts_store[alert.id] = alert
    
    return {"fetched": len(new_alerts), "total": len(alerts_store)}

# WebSocket Endpoint

@app.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time alert updates"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        # Send current alerts on connect
        await websocket.send_json({
            "type": "initial",
            "alerts": [alert.dict() for alert in alerts_store.values()]
        })
        
        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    
    except WebSocketDisconnect:
        active_connections.remove(websocket)

@app.post("/api/alerts/clear")
async def clear_alerts(body: dict = None):
    """Clear alerts by category or all alerts"""
    global alerts_store
    
    if body and body.get("category"):
        category = body["category"].upper()
        alerts_to_remove = [aid for aid, alert in alerts_store.items() if alert.category.upper() == category]
        for aid in alerts_to_remove:
            del alerts_store[aid]
        return {"cleared": len(alerts_to_remove), "category": category, "remaining": len(alerts_store)}
    else:
        cleared_count = len(alerts_store)
        alerts_store.clear()
        return {"cleared": cleared_count, "message": "All alerts cleared", "remaining": 0}

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "alerts_count": len(alerts_store)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
