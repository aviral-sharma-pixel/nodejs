import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const { id } = await params; // params is a Promise, must await it

  let JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN, estimate = '1h', isBulkClose = false;

  try {
    const body = await request.json();
    
    if (body.jiraConfig) {
      // Credentials passed from client
      JIRA_DOMAIN = process.env.JIRA_DOMAIN; // Always use domain from env
      JIRA_EMAIL = body.jiraConfig.email;
      JIRA_API_TOKEN = body.jiraConfig.password;
    } else {
      // Fallback to .env for backward compatibility
      JIRA_DOMAIN = process.env.JIRA_DOMAIN;
      JIRA_EMAIL = process.env.JIRA_EMAIL;
      JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
    }

    // Parse the estimate from request body
    if (body.estimate) {
      estimate = body.estimate;
    }

    // Check if this is a bulk close request
    if (body.isBulkClose) {
      isBulkClose = true;
    }
  } catch (e) {
    // No body or invalid JSON, use defaults from .env
    JIRA_DOMAIN = process.env.JIRA_DOMAIN;
    JIRA_EMAIL = process.env.JIRA_EMAIL;
    JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
  }

  if (!JIRA_DOMAIN || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    return NextResponse.json({ error: 'Jira credentials are not fully configured.' }, { status: 401 });
  }

  const authHeader = `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // 1. Fetch available transitions for the ticket
    const transitionsResponse = await fetch(`https://${JIRA_DOMAIN}/rest/api/2/issue/${id}/transitions`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    if (!transitionsResponse.ok) {
      clearTimeout(timeoutId);
      const error = await transitionsResponse.text();
      console.error(`Jira API error for ${id}:`, transitionsResponse.status, error.substring(0, 200));
      return NextResponse.json({ error: `Jira error ${transitionsResponse.status}` }, { status: transitionsResponse.status });
    }

    const transitionsData = await transitionsResponse.json();
    const transitions = transitionsData.transitions || [];

    console.log(`All transitions for ${id}:`, JSON.stringify(transitions, null, 2));

    // Get current ticket status to determine which transition to use
    const ticketResponse = await fetch(`https://${JIRA_DOMAIN}/rest/api/2/issue/${id}`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    if (!ticketResponse.ok) {
      clearTimeout(timeoutId);
      return NextResponse.json({ error: 'Failed to fetch ticket status' }, { status: 500 });
    }

    const ticketData = await ticketResponse.json();
    const currentStatusName = ticketData.fields.status.name.toLowerCase();
    const assigneeEmail = ticketData.fields.assignee?.emailAddress;

    console.log(`Current status for ${id}: ${currentStatusName}`);
    console.log(`Ticket assigned to: ${assigneeEmail}, Current user: ${JIRA_EMAIL}`);

    // Safety check: ensure ticket is assigned to the current user
    if (assigneeEmail && assigneeEmail !== JIRA_EMAIL) {
      clearTimeout(timeoutId);
      return NextResponse.json({ 
        error: `Security: This ticket is assigned to ${assigneeEmail}, not you. You cannot transition tickets assigned to others.` 
      }, { status: 403 });
    }

    // For bulk close, use ANY available transition that leads to a done status
    let targetTransition = null;
    
    if (isBulkClose) {
      // For bulk close, try to find direct "Done" status transition first
      targetTransition = transitions.find(t => {
        const key = t.to.statusCategory?.key?.toLowerCase() || '';
        return key === 'done';
      });
      
      // If no direct done transition and this is bulk close, still try to find any transition
      // This handles workflows where you must go through intermediate states
      if (!targetTransition && transitions.length > 0) {
        targetTransition = transitions[0];
      }
    } else {
      // For individual close, follow normal workflow
      // If in CREATE TICKET/TO DO status → use "Start" transition
      if (currentStatusName.includes('create') || currentStatusName.includes('backlog') || currentStatusName === 'to do') {
        targetTransition = transitions.find(t => {
          const name = t.name.toLowerCase();
          return name === 'start' || name.includes('start');
        });
      } else {
        // If in any other status → use "Done" transition
        targetTransition = transitions.find(t => {
          const name = t.to.name.toLowerCase();
          const key = t.to.statusCategory?.key?.toLowerCase() || '';
          return key === 'done' || name === 'done' || name.includes('done');
        });
      }
    }

    if (!targetTransition) {
      clearTimeout(timeoutId);
      const availableTransitions = transitions.map(t => `${t.name} → ${t.to.name}`).join(', ');
      console.log(`No valid transition found for ${id}. Available: ${availableTransitions}`);
      return NextResponse.json({ 
        error: `No transition available for this ticket. Status may already be final.`,
        debug: transitions
      }, { status: 400 });
    }

    // 3. Execute the transition
    // First, fetch transition metadata to see what fields are available
    const transitionMetadataResponse = await fetch(
      `https://${JIRA_DOMAIN}/rest/api/2/issue/${id}/transitions?expand=transitions.fields`,
      {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        },
        signal: controller.signal
      }
    );

    let availableFields = {};
    try {
      if (transitionMetadataResponse.ok) {
        const metadataData = await transitionMetadataResponse.json();
        const transitionMetadata = metadataData.transitions?.find(t => t.id === targetTransition.id);
        
        if (transitionMetadata?.fields) {
          console.log(`Available fields for transition ${targetTransition.id}:`, Object.keys(transitionMetadata.fields));
          availableFields = transitionMetadata.fields;
        }
      }
    } catch (err) {
      console.error(`Error fetching transition metadata: ${err.message}`);
    }

    const transitionBody = {
      transition: {
        id: targetTransition.id
      }
    };

    // For "Start" transition, include timetracking field if available
    if (targetTransition.name.toLowerCase() === 'start') {
      if (availableFields['timetracking']) {
        transitionBody.fields = {
          timetracking: {
            originalEstimate: estimate || '1h'
          }
        };
        console.log(`Transition body for ${id}:`, JSON.stringify(transitionBody, null, 2));
      }
    }

    const transitionRequestResponse = await fetch(`https://${JIRA_DOMAIN}/rest/api/2/issue/${id}/transitions`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transitionBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!transitionRequestResponse.ok) {
      const errorText = await transitionRequestResponse.text();
      console.error(`Jira transition error for ${id}:`, transitionRequestResponse.status, errorText);
      return NextResponse.json({ error: `Failed to transition: ${transitionRequestResponse.status}`, details: errorText }, { status: transitionRequestResponse.status });
    }

    // After successful transition, check if ticket is now in Done status
    const finalStatusResponse = await fetch(`https://${JIRA_DOMAIN}/rest/api/2/issue/${id}`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    let isDone = false;
    if (finalStatusResponse.ok) {
      const finalTicketData = await finalStatusResponse.json();
      const finalStatus = finalTicketData.fields?.status?.statusCategory?.key?.toLowerCase() || '';
      isDone = finalStatus === 'done';
      console.log(`After transition, ticket ${id} status: ${finalTicketData.fields.status.name}, isDone: ${isDone}`);
    }

    return NextResponse.json({ success: true, message: 'Ticket closed successfully.', isDone: isDone });
  } catch (error) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Jira API request timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
