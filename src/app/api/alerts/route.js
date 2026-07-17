if (!global.notifiedAlerts) {
  global.notifiedAlerts = new Set();
}

const WEBHOOK_URL = "https://chat.googleapis.com/v1/spaces/AAQAIe_njCE/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=NTmJ7kdUTV3k54f1Yq0Q8BG5Dy0xmjTQF06SpWvpdCY";

async function notifyGoogleChat(alert, durationMinutes) {
  const payload = {
    text: `🚨 *OVERDUE GRAFANA ALERT*\n*Name*: ${alert.title}\n*Email*: <mailto:${alert.server}|${alert.server}>\n*Duration*: ${durationMinutes} minutes\n*Details*: ${alert.description}`
  };
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('Failed to send webhook', err);
  }
}

export async function GET(request) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${backendUrl}/api/alerts`, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return Response.json({
        error: `Backend error: ${res.statusText}`,
        alerts: []
      }, { status: res.status });
    }

    const data = await res.json();
    const alerts = data.alerts || [];

    const formattedAlerts = alerts.map(alert => {
      // Backend now calculates duration correctly from firstSeenAt
      const durationMinutes = typeof alert.durationMinutes === 'number' ? alert.durationMinutes : 0;
      const statusString    = String(alert.status || '').toLowerCase();
      const titleString     = String(alert.name || alert.title || '').toLowerCase();
      const category        = (alert.alertType || alert.category || 'unknown').toLowerCase();

      // Send Google Chat webhook for overdue firing alerts (not ok/resolved, not info)
      const isActive  = statusString !== 'ok' && statusString !== 'resolved' && statusString !== 'healthy';
      const isOverdue = shouldBeOverdue(category, durationMinutes);

      if (isActive && isOverdue && !titleString.includes('info')) {
        const uniqueKey = `${alert.id || alert.name}-${alert.status}`;
        if (!global.notifiedAlerts.has(uniqueKey)) {
          global.notifiedAlerts.add(uniqueKey);
          notifyGoogleChat(
            { name: alert.name || alert.title, server: alert.server || alert.email, description: alert.description },
            durationMinutes
          );
        }
      }

      return {
        id:             alert.id,
        name:           alert.name || alert.title || 'Unknown Alert',
        email:          alert.email || alert.server || 'unknown',
        status:         alert.status,
        alertType:      category,
        durationMinutes,
        timestamp:      alert.timestamp,
        firstSeenAt:    alert.firstSeenAt,
        description:    alert.description,
        isOverdue:      isActive && isOverdue,
      };
    });

    return Response.json({ alerts: formattedAlerts });
  } catch (err) {
    console.error('[ALERTS API] Error:', err?.message);
    return Response.json({
      error: `Backend connection failed: ${err?.message}. Make sure FastAPI is running on http://localhost:8000`,
      alerts: []
    }, { status: 500 });
  }
}

function calculateDurationMinutes(timestamp) {
  try {
    const alertTime = new Date(timestamp).getTime();
    const now = Date.now();
    return Math.floor((now - alertTime) / 60000);
  } catch {
    return 0;
  }
}

function shouldBeOverdue(category, durationMinutes) {
  // Infrastructure alerts: 5-minute threshold (these need immediate action)
  const quickThreshold = ['cpu', 'memory', 'disk', 'port', 'db'];
  // Service/HTTP alerts: 90-minute threshold
  const threshold = quickThreshold.includes(category.toLowerCase()) ? 5 : 90;
  return durationMinutes >= threshold;
}
