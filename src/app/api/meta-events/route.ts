import { NextRequest, NextResponse } from 'next/server';

const PIXEL_ID = '1312240497468073';
const CAPI_TOKEN = process.env.FACEBOOK_CAPI_TOKEN;
const API_VERSION = 'v20.0';

export async function POST(request: NextRequest) {
  if (!CAPI_TOKEN) {
    return NextResponse.json({ error: 'CAPI token not configured' }, { status: 500 });
  }

  let body: {
    event_name: string;
    event_id: string;
    event_source_url?: string;
    client_user_agent?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { event_name, event_id, event_source_url, client_user_agent } = body;

  if (!event_name || !event_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const allowedEvents = ['Lead', 'Contact', 'PageView'];
  if (!allowedEvents.includes(event_name)) {
    return NextResponse.json({ error: 'Event not allowed' }, { status: 400 });
  }

  // Captura IP real a partir dos headers da request
  const forwarded = request.headers.get('x-forwarded-for');
  const clientIp = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || '';
  const userAgent = client_user_agent || request.headers.get('user-agent') || '';

  const eventPayload = {
    data: [
      {
        event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_id,
        action_source: 'website',
        event_source_url: event_source_url || 'https://www.gerenciamentofotovoltaico.com.br',
        user_data: {
          client_ip_address: clientIp,
          client_user_agent: userAgent,
        },
      },
    ],
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('[Meta CAPI] Error:', result);
      return NextResponse.json({ error: 'CAPI request failed', detail: result }, { status: 500 });
    }

    return NextResponse.json({ success: true, events_received: result.events_received ?? 1 });
  } catch (err) {
    console.error('[Meta CAPI] Fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
