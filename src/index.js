/**
 * Cloudflare Worker for cfp-specialprize-club
 * Includes server-side visit tracking without client-side JavaScript
 */

const D1_BINDING = 'cfp_specialprize_club_d1';

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      // Handle API routes
      if (url.pathname === "/api/beacon") {
        return handleBeaconRequest(request, env);
      }

      if (url.pathname === "/api/visits") {
        return handleVisitsQuery(request, env, url);
      }

      // Track all HTML page visits server-side (skip assets like images, CSS, JS)
      if (shouldTrackRequest(request, url)) {
        // Don't await - let tracking happen in background
        ctx.waitUntil(trackVisit(request, env, url));
      }

      // For all other requests, serve static assets
      return env.ASSETS.fetch(request);

    } catch (error) {
      console.error('Error in worker:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};

// Determine if request should be tracked
function shouldTrackRequest(request, url) {
  // Only track GET requests
  if (request.method !== 'GET') return false;

  // Skip common asset types
  const assetExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot'];
  const pathname = url.pathname.toLowerCase();
  if (assetExtensions.some(ext => pathname.endsWith(ext))) return false;

  // Skip API endpoints and settings page
  if (pathname.startsWith('/api/')) return false;
  if (pathname === '/settings' || pathname === '/settings.html') return false;

  // Track HTML pages and root path
  return true;
}

// Server-side visit tracking
async function trackVisit(request, env, url) {
  try {
    const db = env[D1_BINDING];
    if (!db) return;

    // Extract visitor data from request headers
    const visitorData = {
      ip: request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For'),
      timestamp: new Date().toISOString(),
      user_agent: request.headers.get('User-Agent'),
      referrer: request.headers.get('Referer') || '',
      url: url.origin,
      uri: url.href,
      path: url.pathname,
      query: url.search,

      // Cloudflare-specific data (available server-side)
      country: request.cf?.country || '',
      city: request.cf?.city || '',
      timezone: request.cf?.timezone || '',
      latitude: request.cf?.latitude || '',
      longitude: request.cf?.longitude || '',
      asn: request.cf?.asn || '',
      colo: request.cf?.colo || '', // Cloudflare datacenter

      // Request details
      protocol: url.protocol,
      language: request.headers.get('Accept-Language')?.split(',')[0] || '',
      http_version: request.cf?.httpProtocol || '',
    };

    await db.prepare(
      `INSERT INTO visits (
        ip, timestamp, user_agent, referrer, url, uri, path, query,
        country, city, timezone, latitude, longitude, asn, colo,
        protocol, language, http_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      visitorData.ip,
      visitorData.timestamp,
      visitorData.user_agent,
      visitorData.referrer,
      visitorData.url,
      visitorData.uri,
      visitorData.path,
      visitorData.query,
      visitorData.country,
      visitorData.city,
      visitorData.timezone,
      visitorData.latitude,
      visitorData.longitude,
      visitorData.asn,
      visitorData.colo,
      visitorData.protocol,
      visitorData.language,
      visitorData.http_version
    ).run();

    // Log for debugging
    console.log('Visit tracked:', {
      ip: visitorData.ip,
      path: visitorData.path,
      country: visitorData.country,
      referrer: visitorData.referrer
    });

  } catch (error) {
    console.error('Error tracking visit:', error);
  }
}

// Handle beacon data collection
async function handleBeaconRequest(request, env) {
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

// Handle visits query API for reporting
async function handleVisitsQuery(request, env, url) {
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
      bindings.push(startDate);
    }

    if (endDate) {
      query += ' AND timestamp <= ?';
      bindings.push(endDate + 'T23:59:59.999Z');
    }

    if (country) {
      query += ' AND country = ?';
      bindings.push(country);
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
      countBindings.push(startDate);
    }

    if (endDate) {
      countQuery += ' AND timestamp <= ?';
      countBindings.push(endDate + 'T23:59:59.999Z');
    }

    if (country) {
      countQuery += ' AND country = ?';
      countBindings.push(country);
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
