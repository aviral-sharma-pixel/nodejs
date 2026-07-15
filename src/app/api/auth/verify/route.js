import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;
    const domain = process.env.JIRA_DOMAIN;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (!domain) {
      return NextResponse.json({ error: 'Jira domain not configured on server' }, { status: 500 });
    }

    const authHeader = `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Test connection by fetching current user
    const response = await fetch(`https://${domain}/rest/api/2/myself`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      console.error(`Jira auth error: ${response.status}`, error.substring(0, 200));
      return NextResponse.json(
        { error: `Authentication failed: ${response.status}. Please verify your email and password.` },
        { status: response.status }
      );
    }

    const userData = await response.json();
    return NextResponse.json({ success: true, user: userData });
  } catch (error) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Jira API request timed out. Please try again.' }, { status: 504 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
