/**
 * Cloudflare Worker for cfp-specialprize-club
 * Includes server-side visit tracking without client-side JavaScript
 */

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      // Track all HTML page visits server-side (skip assets like images, CSS, JS)
      if (shouldTrackRequest(request, url)) {
        // Don't await - let tracking happen in background
        ctx.waitUntil(trackVisit(request, env, url));
      }

      // Handle specific routes
      if (url.pathname === "/api/beacon") {
        return handleBeaconRequest(request, env);
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

  // Skip API endpoints
  if (pathname.startsWith('/api/')) return false;

  // Track HTML pages and root path
  return true;
}

// Server-side visit tracking
async function trackVisit(request, env, url) {
  try {
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

    // Store in D1 database if configured
    if (env.securus_d1_binding) {
      await env.securus_d1_binding.prepare(
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
    }

    // Log for debugging (visible in wrangler tail)
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
    const data = await request.json();

    // Store in D1 database if configured
    if (env.securus_d1_binding) {
      await env.securus_d1_binding.prepare(
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