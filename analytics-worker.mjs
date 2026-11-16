// Regional decision only. Do not return or log IP addresses or location data.
const RESTRICTED = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH'
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/analytics-policy') return env.ASSETS.fetch(request);
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'Cloudflare-CDN-Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    };
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response(null, {status: 405, headers: {...headers, Allow: 'GET, HEAD'}});
    }
    // Use Cloudflare's trusted metadata, never a caller-supplied country header.
    const country = request.cf && request.cf.country;
    const allowed = ['doencourage.com', 'www.doencourage.com'].includes(url.hostname)
      && typeof country === 'string' && /^[A-Z]{2}$/.test(country)
      && !['XX', 'T1', 'EU', 'A1', 'A2', 'O1'].includes(country)
      && !RESTRICTED.has(country) && request.cf.isEUCountry !== '1'
      && request.headers.get('Sec-GPC') !== '1' && request.headers.get('DNT') !== '1';
    return new Response(request.method === 'HEAD' ? null : JSON.stringify({google_allowed: allowed}), {headers});
  }
};
