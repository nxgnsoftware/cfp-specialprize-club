/**
 * Cloudflare Worker with New Relic instrumentation for cfp-specialprize-club
 */

// Import New Relic for Cloudflare Workers
import newrelic from '@newrelic/cloudflare-worker';

// Define your main worker handler
export default {
  async fetch(request, env, ctx) {
    // Enable New Relic monitoring
    return newrelic.instrumentFetch(async () => {
      try {
        // Log the request path for tracking
        const url = new URL(request.url);
        newrelic.addCustomAttribute('path', url.pathname);
        
        // Handle specific routes
        if (url.pathname === "/api/beacon") {
          return handleBeaconRequest(request, env);
        }
        
        // For all other requests, serve static assets
        return env.ASSETS.fetch(request);
        
      } catch (error) {
        // New Relic will automatically capture this error
        console.error('Error in worker:', error);
        
        // Notify New Relic of the error with additional context
        newrelic.noticeError(error, {
          request_url: request.url,
          method: request.method
        });
        
        return new Response('Internal Server Error', { status: 500 });
      }
    })(request, env, ctx);
  },
};

// Handle beacon data collection
async function handleBeaconRequest(request, env) {
  try {
    const data = await request.json();
    
    // Add tracking data to New Relic
    newrelic.addCustomAttribute('visitor_ip', data.visitor_ip);
    newrelic.addCustomAttribute('visitor_cookie', data.cookie);
    newrelic.addCustomAttribute('visitor_referrer', data.referrer);
    
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
    newrelic.noticeError(error, { request_type: "beacon" });
    return new Response(JSON.stringify({ status: "error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}