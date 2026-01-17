/**
 * API endpoint for beacon data collection
 */

const D1_BINDING = 'cfp_specialprize_club_d1';

export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const db = env[D1_BINDING];
    const data = await request.json();

    if (db) {
      await db.prepare(
        `INSERT INTO visits (ip, timestamp, user_agent, cookie, referrer, url)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        data.visitor_ip,
        data.timestamp,
        data.user_agent,
        data.cookie,
        data.referrer,
        data.uri
      ).run();
    }

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('Error handling beacon:', error);
    return new Response(JSON.stringify({ status: "error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
