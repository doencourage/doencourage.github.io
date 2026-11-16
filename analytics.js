/* Automatic public-page analytics; Google starts only after the regional gate. */
(() => {
  'use strict';
  const ownScript = document.currentScript;
  const id = ownScript && ownScript.dataset.measurementId;
  if (!/^G-[A-Z0-9]+$/.test(id || '') || window.__doencourageAnalytics) return;
  if (!['doencourage.com', 'www.doencourage.com'].includes(location.hostname)) return;
  if (/^\/(?:form|submission|editor|content|_작업)(?:\/|\.|$)/i.test(decodeURI(location.pathname))) return;
  window.__doencourageAnalytics = true;
  const cloudflareToken = ownScript.dataset.cloudflareToken;
  if (/^[a-f0-9]{32}$/.test(cloudflareToken || '')) {
    const beacon = document.createElement('script');
    beacon.type = 'module';
    beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    beacon.setAttribute('data-cf-beacon', JSON.stringify({token: cloudflareToken}));
    document.head.append(beacon);
  }
  const key = 'doencourage-analytics-consent-v1';
  let started = false;

  function optedOut() {
    if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1') return true;
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      return Boolean(saved && saved.value === 'no' && Date.now() < saved.expires);
    } catch (_) { return true; }
  }

  function cleanURL(value, originOnly = false) {
    try {
      const url = new URL(value, location.origin);
      return /^https?:$/.test(url.protocol) ? url.origin + (originOnly ? '/' : url.pathname) : '';
    } catch (_) { return ''; }
  }

  function stop() {
    window['ga-disable-' + id] = true;
    document.cookie.split(';').forEach(item => {
      const name = item.split('=')[0].trim();
      if (name !== '_ga' && !name.startsWith('_ga_')) return;
      ['', '; domain=' + location.hostname, '; domain=.doencourage.com'].forEach(domain => {
        document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax; Secure' + domain;
      });
    });
  }

  function start() {
    if (optedOut()) { stop(); return; }
    if (started) return;
    started = true;
    window['ga-disable-' + id] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    const gtag = window.gtag;
    // This permission applies only after the server has allowed this region.
    gtag('consent', 'default', {
      analytics_storage: 'granted', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    gtag('set', 'allow_google_signals', false);
    gtag('set', 'allow_ad_personalization_signals', false);
    gtag('js', new Date());
    const canonical = document.querySelector('link[rel="canonical"]');
    const page = canonical && canonical.href.startsWith(location.origin + '/') ? canonical.href : location.href;
    gtag('config', id, {
      page_location: cleanURL(page),
      page_referrer: cleanURL(document.referrer, true),
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: 180 * 24 * 60 * 60,
      cookie_update: false
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.append(script);
  }

  async function initializeGoogle() {
    if (optedOut()) { stop(); return; }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch('/analytics-policy', {
        credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
        signal: controller.signal
      });
      if (!response.ok) { stop(); return; }
      const policy = await response.json();
      if (policy.google_allowed === true) start();
      else stop();
    } catch (_) { stop(); }
    finally { clearTimeout(timeout); }
  }

  document.addEventListener('click', event => {
    if (!started || window['ga-disable-' + id] || !event.target.closest) return;
    const link = event.target.closest('a[href]');
    if (!link) return;
    let host;
    try { host = new URL(link.href).hostname.replace(/^www\./, ''); } catch (_) { return; }
    const stores = {'product.kyobobook.co.kr': 'kyobo', 'kyobobook.co.kr': 'kyobo', 'yes24.com': 'yes24', 'aladin.co.kr': 'aladin', 'smartstore.naver.com': 'naver'};
    if (stores[host]) window.gtag('event', 'bookstore_click', {send_to: id, store_name: stores[host]});
  });
  window.addEventListener('storage', event => {
    if (event.key !== key || !optedOut()) return;
    stop();
    if (started) location.reload();
  });
  void initializeGoogle();
})();
