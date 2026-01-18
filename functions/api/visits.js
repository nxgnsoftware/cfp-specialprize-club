/**
 * API endpoint for querying visit data
 */

const D1_BINDING = 'cfp_specialprize_club_d1';

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);

  try {
    const db = env[D1_BINDING];
    if (!db) {
      return new Response(JSON.stringify({ error: "Database not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const params = url.searchParams;
    const ip = params.get('ip');
    const startDate = params.get('startDate');
    const endDate = params.get('endDate');
    const country = params.get('country');
    const continent = params.get('continent');
    const region = params.get('region');
    const isEU = params.get('isEU');
    const path = params.get('path');
    const limit = parseInt(params.get('limit')) || 100;
    const offset = parseInt(params.get('offset')) || 0;

    // Build query with filters
    let query = 'SELECT * FROM visits WHERE 1=1';
    const bindings = [];

    if (ip) {
      query += ' AND ip LIKE ?';
      bindings.push(`%${ip}%`);
    }

    if (startDate) {
      query += ' AND timestamp >= ?';
      bindings.push(startDate + 'T00:00:00.000Z');
    }

    if (endDate) {
      query += ' AND timestamp <= ?';
      bindings.push(endDate + 'T23:59:59.999Z');
    }

    if (country) {
      query += ' AND country = ?';
      bindings.push(country);
    }

    if (continent) {
      query += ' AND continent = ?';
      bindings.push(continent);
    }

    if (region) {
      query += ' AND region LIKE ?';
      bindings.push(`%${region}%`);
    }

    if (isEU === 'true') {
      query += ' AND is_eu_country = ?';
      bindings.push('true');
    } else if (isEU === 'false') {
      query += ' AND is_eu_country = ?';
      bindings.push('false');
    }

    if (path) {
      query += ' AND path LIKE ?';
      bindings.push(`%${path}%`);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);

    const stmt = db.prepare(query);
    const results = await stmt.bind(...bindings).all();

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM visits WHERE 1=1';
    const countBindings = [];

    if (ip) {
      countQuery += ' AND ip LIKE ?';
      countBindings.push(`%${ip}%`);
    }

    if (startDate) {
      countQuery += ' AND timestamp >= ?';
      countBindings.push(startDate + 'T00:00:00.000Z');
    }

    if (endDate) {
      countQuery += ' AND timestamp <= ?';
      countBindings.push(endDate + 'T23:59:59.999Z');
    }

    if (country) {
      countQuery += ' AND country = ?';
      countBindings.push(country);
    }

    if (continent) {
      countQuery += ' AND continent = ?';
      countBindings.push(continent);
    }

    if (region) {
      countQuery += ' AND region LIKE ?';
      countBindings.push(`%${region}%`);
    }

    if (isEU === 'true') {
      countQuery += ' AND is_eu_country = ?';
      countBindings.push('true');
    } else if (isEU === 'false') {
      countQuery += ' AND is_eu_country = ?';
      countBindings.push('false');
    }

    if (path) {
      countQuery += ' AND path LIKE ?';
      countBindings.push(`%${path}%`);
    }

    const countStmt = db.prepare(countQuery);
    const countResult = await countStmt.bind(...countBindings).first();

    return new Response(JSON.stringify({
      visits: results.results,
      total: countResult?.total || 0,
      limit,
      offset
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    console.error('Error querying visits:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
