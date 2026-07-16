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

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${backendUrl}/api/alerts`, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return Response.json({
        error: `Backend error: ${res.statusText}`,
        alerts: []
      }, { status: res.status });
    }

    const alerts = await res.json();

    const formattedAlerts = alerts.map(alert => {
      const durationMinutes = calculateDurationMinutes(alert.timestamp);
      const statusString = String(alert.status || '').toLowerCase();
      const titleString = String(alert.title || '').toLowerCase();
      
      // Check if we need to send a webhook
      // It must NOT be 'ok' or 'resolved', must be firing for >= 90 mins, and must NOT be an "info" alert
      if (
        statusString !== 'ok' && 
        statusString !== 'resolved' && 
        statusString !== 'healthy' && 
        durationMinutes >= 90 &&
        !titleString.includes('info')
      ) {
        const uniqueKey = `${alert.title}-${alert.server}-${alert.timestamp}`;
        if (!global.notifiedAlerts.has(uniqueKey)) {
          global.notifiedAlerts.add(uniqueKey);
          notifyGoogleChat(alert, durationMinutes);
        }
      }

      return {
        name: alert.title,
        email: alert.server,
        status: alert.status,
        alertType: alert.category.toLowerCase(),
        durationMinutes,
        timestamp: alert.timestamp,
        description: alert.description,
        isOverdue: shouldBeOverdue(alert.category, durationMinutes)
      };
    });

    return Response.json({ alerts: formattedAlerts });
  } catch (err) {
    console.error('Alert fetch error:', err);
    return Response.json({
      error: 'Backend connection failed. Make sure FastAPI service is running on http://localhost:8000',
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
  const threshold = (category === 'CPU' || category === 'Memory' || category === 'Disk') ? 5 : 90;
  return durationMinutes >= threshold;
}
