import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const body = request.headers.get('x-jira-config');
    let JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN;

    if (body) {
      // Credentials passed from client
      const config = JSON.parse(body);
      JIRA_DOMAIN = process.env.JIRA_DOMAIN; // Always use domain from env
      JIRA_EMAIL = config.email;
      JIRA_API_TOKEN = config.password;
    } else {
      // Fallback to .env for backward compatibility
      JIRA_DOMAIN = process.env.JIRA_DOMAIN;
      JIRA_EMAIL = process.env.JIRA_EMAIL;
      JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
    }

    if (!JIRA_DOMAIN || !JIRA_EMAIL || !JIRA_API_TOKEN) {
      return NextResponse.json({ error: 'Jira credentials not configured', issues: [] }, { status: 401 });
    }

    // Get tickets that are either:
    // 1. Not done (active tickets)
    // 2. Done but updated in last 7 days (recently closed - for reference only)
    const jql = '(assignee = currentUser() AND statusCategory != Done) OR (assignee = currentUser() AND statusCategory = Done AND updated >= -7d) ORDER BY updated DESC';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    // Try API v2 first (for self-hosted Jira Server)
    const response = await fetch(`https://${JIRA_DOMAIN}/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=50`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: `Jira API error: ${response.status}`, issues: [] }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ issues: data.issues || [] });
  } catch (error) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Jira API request timed out', issues: [] }, { status: 504 });
    }
    return NextResponse.json({ error: error.message, issues: [] }, { status: 500 });
  }
}
