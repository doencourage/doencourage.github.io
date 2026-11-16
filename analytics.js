/* Cookie-free Cloudflare statistics; Google Analytics requires an explicit choice. */
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
  const maxAge = 180 * 24 * 60 * 60 * 1000;
  let started = false;
  let choice = readChoice();
  let panel;
  let settingsButton;

  function readChoice() {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      return saved && Date.now() < saved.expires && ['yes', 'no'].includes(saved.value) ? saved.value : null;
    } catch (_) { return null; }
  }

  function cleanURL(value, originOnly = false) {
    try {
      const url = new URL(value, location.origin);
      return /^https?:$/.test(url.protocol) ? url.origin + (originOnly ? '/' : url.pathname) : '';
    } catch (_) { return ''; }
  }

  function start() {
    if (started || choice !== 'yes') return;
    started = true;
    window['ga-disable-' + id] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    const gtag = window.gtag;
    gtag('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    gtag('consent', 'update', {analytics_storage: 'granted'});
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

  function removeAnalyticsCookies() {
    document.cookie.split(';').forEach(item => {
      const name = item.split('=')[0].trim();
      if (name !== '_ga' && !name.startsWith('_ga_')) return;
      ['', '; domain=' + location.hostname, '; domain=.doencourage.com'].forEach(domain => {
        document.cookie = name + '=; Max-Age=0; path=/' + domain + '; SameSite=Lax; Secure';
      });
    });
  }

  function choose(value) {
    choice = value;
    try { localStorage.setItem(key, JSON.stringify({value, expires: Date.now() + maxAge})); } catch (_) { /* Current page choice still applies. */ }
    panel.hidden = true;
    settingsButton.focus({preventScroll: true});
    if (value === 'yes') start();
    else {
      window['ga-disable-' + id] = true;
      removeAnalyticsCookies();
      if (started) location.reload();
    }
  }

  function render() {
    const preferences = document.createElement('div');
    preferences.className = 'analytics-preferences';
    settingsButton = document.createElement('button');
    settingsButton.type = 'button';
    settingsButton.textContent = '방문 통계 설정';
    settingsButton.addEventListener('click', () => {
      panel.hidden = false;
      panel.querySelector('button').focus();
    });
    preferences.append(settingsButton);
    document.body.append(preferences);
    panel = document.createElement('section');
    panel.className = 'analytics-consent';
    panel.setAttribute('aria-label', 'Google 방문 통계 선택');
    panel.innerHTML = '<div><strong>Google 방문 통계 선택</strong><p>허용하면 Google Analytics 쿠키로 페이지 이용 통계를 수집합니다. 허용하지 않아도 사이트를 이용할 수 있습니다. <a href="/privacy/#analytics">자세히</a></p></div><div class="analytics-actions"><button type="button" data-choice="no">거부</button><button type="button" data-choice="yes">허용</button></div>';
    panel.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => choose(button.dataset.choice)));
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'analytics-close';
    closeButton.textContent = '닫기';
    closeButton.addEventListener('click', () => {
      panel.hidden = true;
      settingsButton.focus({preventScroll: true});
    });
    panel.append(closeButton);
    // Only the footer settings button opens this optional GA4 panel.
    panel.hidden = true;
    document.body.append(panel);
    if (choice === 'yes') start();
  }

  document.addEventListener('click', event => {
    if (!started || choice !== 'yes' || !event.target.closest) return;
    const link = event.target.closest('a[href]');
    if (!link) return;
    let host;
    try { host = new URL(link.href).hostname.replace(/^www\./, ''); } catch (_) { return; }
    const stores = {'product.kyobobook.co.kr': 'kyobo', 'kyobobook.co.kr': 'kyobo', 'yes24.com': 'yes24', 'aladin.co.kr': 'aladin', 'smartstore.naver.com': 'naver'};
    if (stores[host]) window.gtag('event', 'bookstore_click', {send_to: id, store_name: stores[host]});
  });
  window.addEventListener('storage', event => {
    if (event.key !== key) return;
    const updated = readChoice();
    if (updated === choice) return;
    choice = updated;
    if (started && choice !== 'yes') {
      window['ga-disable-' + id] = true;
      removeAnalyticsCookies();
      location.reload();
    } else if (choice === 'yes') { panel.hidden = true; start(); }
    else panel.hidden = true;
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, {once: true});
  else render();
})();
