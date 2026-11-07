/* Decide mouse intent independently from the CSS colour transition. */
(() => {
  const root = document.documentElement;
  if (root.hasAttribute('data-interaction-managed')) return;
  const selector = 'a[href], button, summary, select, [role="button"], label.choice';
  const finePointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const DWELL = 100, QUIET = 60, MOVEMENT = 6, EXIT_GRACE = 60;
  let candidate = null, active = null, fading = null, pressed = null;
  let intentTimer = 0, exitTimer = 0, fadeTimer = 0;
  const eligible = element => element?.isConnected &&
    !element.matches(':disabled, [aria-disabled="true"]') && !element.closest('[inert]') &&
    !(element.matches('label.choice') && element.querySelector('input:disabled'));
  const targetOf = node => {
    const element = node instanceof Element ? node.closest(selector) : null;
    return eligible(element) ? element : null;
  };
  const cancelIntent = () => { clearTimeout(intentTimer); intentTimer = 0; };
  const trimPoints = (points, now) => {
    // Retain the sample just before the window: dropping it would make the
    // latest movement appear stationary before a full quiet interval elapsed.
    while (points.length > 1 && points[1].time <= now - QUIET) points.shift();
  };
  const clearPressed = () => {
    if (pressed) pressed.element.removeAttribute('data-interaction-pressed');
    pressed = null;
  };
  const snapOff = element => {
    if (!element) return;
    element.setAttribute('data-interaction-snap', '');
    element.removeAttribute('data-interaction-hover');
    // Flush the old highlight before another element starts to fade in.
    getComputedStyle(element).backgroundColor;
    requestAnimationFrame(() => element.removeAttribute('data-interaction-snap'));
  };
  const outDuration = element => {
    const value = getComputedStyle(element).getPropertyValue('--interaction-out').trim();
    return parseFloat(value) * (value.endsWith('ms') ? 1 : 1000) || 0;
  };
  const finishExit = () => {
    exitTimer = 0;
    if (!active || candidate?.element === active) return;
    if (fading && fading !== active) snapOff(fading);
    clearTimeout(fadeTimer);
    fading = active; active = null;
    fading.removeAttribute('data-interaction-hover');
    fadeTimer = setTimeout(() => { fading = null; fadeTimer = 0; }, outDuration(fading) + 34);
  };
  const activate = element => {
    cancelIntent(); clearTimeout(exitTimer); exitTimer = 0;
    clearTimeout(fadeTimer); fadeTimer = 0;
    if (active && active !== element) snapOff(active);
    if (fading && fading !== element) snapOff(fading);
    fading = null; active = element;
    element.setAttribute('data-interaction-hover', '');
  };
  const resetHover = () => {
    cancelIntent(); clearTimeout(exitTimer); clearTimeout(fadeTimer);
    exitTimer = fadeTimer = 0; candidate = null;
    snapOff(active); if (fading !== active) snapOff(fading);
    active = fading = null;
  };
  const resetAll = () => { resetHover(); clearPressed(); };
  const checkIntent = () => {
    intentTimer = 0;
    if (!candidate) return;
    const now = performance.now(), current = candidate;
    if (!finePointer.matches || !eligible(current.element) ||
        targetOf(document.elementFromPoint(current.x, current.y)) !== current.element) {
      candidate = null; return;
    }
    trimPoints(current.points, now);
    const quiet = current.points.every(point => Math.hypot(point.x - current.x, point.y - current.y) <= MOVEMENT);
    if (now - current.entered >= DWELL && quiet) activate(current.element);
    else intentTimer = setTimeout(checkIntent, Math.max(8, Math.min(16, DWELL - (now - current.entered))));
  };
  const consider = (element, x, y) => {
    const now = performance.now();
    if (candidate?.element === element && element) {
      candidate.x = x; candidate.y = y;
      candidate.points.push({x, y, time: now});
      trimPoints(candidate.points, now);
      return;
    }
    cancelIntent();
    candidate = element ? {element, entered: now, x, y, points: [{x, y, time: now}]} : null;
    if (active === element && element) {
      clearTimeout(exitTimer); exitTimer = 0; return;
    }
    // A return during the fade resumes from the current colour, not from zero.
    if (fading === element && element) { activate(element); return; }
    if (active && !exitTimer) exitTimer = setTimeout(finishExit, EXIT_GRACE);
    if (element) intentTimer = setTimeout(checkIntent, DWELL);
  };
  const mouse = event => event.pointerType === 'mouse' && finePointer.matches;
  const follow = event => {
    if (!mouse(event)) return;
    if (event.buttons) { resetHover(); return; }
    consider(targetOf(event.target), event.clientX, event.clientY);
  };
  document.addEventListener('pointerover', follow, {passive: true});
  document.addEventListener('pointerout', event => {
    if (!mouse(event)) return;
    if (!event.relatedTarget) { resetHover(); return; }
    if (targetOf(event.target) !== targetOf(event.relatedTarget))
      consider(targetOf(event.relatedTarget), event.clientX, event.clientY);
  }, {passive: true});
  document.addEventListener('pointermove', event => {
    if (pressed && event.pointerId === pressed.id && Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > 8) clearPressed();
    follow(event);
  }, {passive: true});
  document.addEventListener('pointerdown', event => {
    clearPressed(); cancelIntent();
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    resetHover();
    const element = targetOf(event.target);
    if (!element) return;
    pressed = {element, id: event.pointerId, x: event.clientX, y: event.clientY};
    element.setAttribute('data-interaction-pressed', '');
  }, {passive: true});
  document.addEventListener('pointerup', event => {
    clearPressed();
    if (mouse(event) && !intentTimer && candidate?.element !== active) {
      candidate = null; follow(event);
    }
  }, {passive: true});
  document.addEventListener('pointercancel', resetAll, {passive: true});
  document.addEventListener('scroll', resetAll, {capture: true, passive: true});
  document.addEventListener('visibilitychange', resetAll);
  document.addEventListener('keydown', resetHover, {capture: true});
  // Keep a keyboard-focused header link fully visible in the horizontal menu.
  document.addEventListener('focusin', event => {
    const link = event.target.closest?.('.site-header .site-menu a');
    const nav = link?.closest('.site-menu');
    if (!nav || nav.scrollWidth <= nav.clientWidth) return;
    const item = link.getBoundingClientRect(), viewport = nav.getBoundingClientRect();
    const offset = item.left < viewport.left ? item.left - viewport.left :
      item.right > viewport.right ? item.right - viewport.right : 0;
    if (offset) nav.scrollLeft += offset;
  });
  window.addEventListener('blur', resetAll);
  window.addEventListener('pagehide', resetAll);
  window.addEventListener('resize', resetAll);
  finePointer.addEventListener('change', resetAll);
  document.addEventListener('interaction:reset', resetAll);
  new MutationObserver(() => {
    if ((active && !eligible(active)) || (candidate && !eligible(candidate.element)) ||
        (fading && !eligible(fading))) resetHover();
    if (pressed && !eligible(pressed.element)) clearPressed();
  }).observe(document, {childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'inert']});
  root.setAttribute('data-interaction-managed', '');
})();
