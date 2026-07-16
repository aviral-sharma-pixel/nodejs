# Alert Backend Setup

## Python FastAPI Backend for Gmail IMAP Email Monitoring

### Prerequisites
- Python 3.8+
- pip

### Setup Steps

1. **Install dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

2. **Configure environment variables** (`.env.local` in root):
```
GMAIL_EMAIL=alerts@girnarsoft.com
GMAIL_APP_PASSWORD=ktfwvywfzzutwkkz
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

3. **Start the backend:**
```bash
cd backend
python main.py
```

The backend will:
- Connect to Gmail IMAP (imap.gmail.com:993)
- Poll these Gmail labels every 30 seconds: CPU, Memory, Disk, ELK, 5XX
- Fetch unread emails only
- Parse alert info (title, severity, category, server, status)
- Expose REST API on http://localhost:8000
- Broadcast new alerts via WebSocket to connected clients

### API Endpoints

- `GET /api/alerts` - Get all alerts
- `GET /api/alerts/latest` - Get newest alert
- `POST /api/alerts/refresh` - Manually trigger Gmail check
- `GET /health` - Health check
- `WebSocket /ws/alerts` - Real-time alert streaming

### Troubleshooting

**"Connection failed" error:**
- Make sure Gmail credentials are correct in `.env.local`
- Verify Gmail account has 2FA enabled
- Verify app password was generated (not regular password)

**"WebSocket connection failed":**
- Backend must be running on http://localhost:8000
- Check CORS settings (enabled for all origins)
- Check firewall isn't blocking port 8000

**No alerts showing:**
- Make sure Gmail labels (CPU, Memory, Disk, ELK, 5XX) exist in your Gmail
- Send a test email to those labels
- Check backend logs for "fetched X emails"
