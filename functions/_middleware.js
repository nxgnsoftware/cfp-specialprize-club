/**
 * Middleware for cfp-specialprize-club
 * Handles canonical domain redirect and server-side visit tracking
 */

const D1_BINDING = 'cfp_specialprize_club_d1';
const CANONICAL_HOST = 'specialprize.club';

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const originalHost = url.hostname;

  // Check if this is a non-canonical domain (pages.dev, etc.)
  const isNonCanonical = originalHost !== CANONICAL_HOST &&
                         originalHost !== 'localhost' &&
                         !originalHost.includes('127.0.0.1');

  // For pages.dev visits: track with 301 response code, then redirect
  if (isNonCanonical) {
    if (shouldTrackRequest(request, url)) {
      context.waitUntil(trackVisit(request, env, url, originalHost, 301));
    }
    const redirectUrl = new URL(url.pathname + url.search, `https://${CANONICAL_HOST}`);
    return Response.redirect(redirectUrl.toString(), 301);
  }

  // For canonical domain: get response first, then track with actual status code
  const response = await next();

  if (shouldTrackRequest(request, url)) {
    context.waitUntil(trackVisit(request, env, url, originalHost, response.status));
  }

  return response;
}

function shouldTrackRequest(request, url) {
  if (request.method !== 'GET') return false;

  const assetExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot'];
  const pathname = url.pathname.toLowerCase();
  if (assetExtensions.some(ext => pathname.endsWith(ext))) return false;

  if (pathname.startsWith('/api/')) return false;
  if (pathname === '/settings' || pathname === '/settings.html') return false;

  return true;
}

async function trackVisit(request, env, url, originalHost, responseCode) {
  try {
    const db = env[D1_BINDING];
    if (!db) return;

    const visitorData = {
      // Core fields
      ip: request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '',
      timestamp: new Date().toISOString(),
      user_agent: request.headers.get('User-Agent') || '',
      referrer: request.headers.get('Referer') || '',
      url: url.origin,
      uri: url.href,
      path: url.pathname,
      query: url.search,
      original_host: originalHost || url.hostname,
      response_code: String(responseCode || ''),
      // Geolocation from Cloudflare
      country: request.cf?.country || '',
      city: request.cf?.city || '',
      region: request.cf?.region || '',
      region_code: request.cf?.regionCode || '',
      continent: request.cf?.continent || '',
      postal_code: request.cf?.postalCode || '',
      metro_code: request.cf?.metroCode || '',
      timezone: request.cf?.timezone || '',
      latitude: request.cf?.latitude || '',
      longitude: request.cf?.longitude || '',
      is_eu_country: request.cf?.isEUCountry ? 'true' : 'false',
      // Network info from Cloudflare
      asn: request.cf?.asn || '',
      colo: request.cf?.colo || '',
      protocol: url.protocol,
      http_version: request.cf?.httpProtocol || '',
      tls_version: request.cf?.tlsVersion || '',
      tls_cipher: request.cf?.tlsCipher || '',
      // Client info from headers
      language: request.headers.get('Accept-Language')?.split(',')[0] || '',
      accept_encoding: request.headers.get('Accept-Encoding') || '',
      client_hints_ua: request.headers.get('Sec-CH-UA') || '',
      client_hints_platform: request.headers.get('Sec-CH-UA-Platform') || '',
      client_hints_mobile: request.headers.get('Sec-CH-UA-Mobile') || '',
    };

    await db.prepare(
      `INSERT INTO visits (
        ip, timestamp, user_agent, referrer, url, uri, path, query, original_host, response_code,
        country, city, region, region_code, continent, postal_code, metro_code,
        timezone, latitude, longitude, is_eu_country,
        asn, colo, protocol, http_version, tls_version, tls_cipher,
        language, accept_encoding, client_hints_ua, client_hints_platform, client_hints_mobile
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      visitorData.ip,
      visitorData.timestamp,
      visitorData.user_agent,
      visitorData.referrer,
      visitorData.url,
      visitorData.uri,
      visitorData.path,
      visitorData.query,
      visitorData.original_host,
      visitorData.response_code,
      visitorData.country,
      visitorData.city,
      visitorData.region,
      visitorData.region_code,
      visitorData.continent,
      visitorData.postal_code,
      visitorData.metro_code,
      visitorData.timezone,
      visitorData.latitude,
      visitorData.longitude,
      visitorData.is_eu_country,
      visitorData.asn,
      visitorData.colo,
      visitorData.protocol,
      visitorData.http_version,
      visitorData.tls_version,
      visitorData.tls_cipher,
      visitorData.language,
      visitorData.accept_encoding,
      visitorData.client_hints_ua,
      visitorData.client_hints_platform,
      visitorData.client_hints_mobile
    ).run();

  } catch (error) {
    // Log errors server-side only - no sensitive info exposed
    console.error('Visit tracking error');
  }
}
