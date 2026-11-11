/* Immediate pointer feedback; motion follows the user's input and preferences. */
(() => {
  const root = document.documentElement;
  if (root.hasAttribute('data-interaction-managed')) return;
  const selector = 'a[href], button, summary, select, [role="button"], label.choice';
  const finePointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let active = null, pressed = null;
  const cooling = new Map();
  const eligible = element => element?.isConnected &&
    !element.matches(':disabled, [aria-disabled="true"]') && !element.closest('[inert]') &&
    !(element.matches('label.choice') && element.querySelector('input:disabled'));
  const targetOf = node => {
    const element = node instanceof Element ? node.closest(selector) : null;
    return eligible(element) ? element : null;
  };
  const forget = element => {
    clearTimeout(cooling.get(element));
    cooling.delete(element);
  };
  const snapOff = element => {
    if (!element) return;
    forget(element);
    element.setAttribute('data-interaction-snap', '');
    element.removeAttribute('data-interaction-hover');
    element.removeAttribute('data-interaction-pressed');
    getComputedStyle(element).backgroundColor;
    requestAnimationFrame(() => element.removeAttribute('data-interaction-snap'));
  };
  const clearPressed = (immediate = false) => {
    if (!pressed) return;
    if (immediate) snapOff(pressed.element);
    else pressed.element.removeAttribute('data-interaction-pressed');
    pressed = null;
  };
  const setHover = element => {
    if (active === element) return;
    if (active) {
      const previous = active;
      previous.removeAttribute('data-interaction-hover');
      forget(previous);
      // Keep fading elements available for immediate scroll/blur cleanup.
      cooling.set(previous, setTimeout(() => cooling.delete(previous), 220));
    }
    active = element;
    if (active) {
      forget(active);
      active.setAttribute('data-interaction-hover', '');
    }
  };
  const resetHover = () => {
    snapOff(active); active = null;
    for (const element of [...cooling.keys()]) snapOff(element);
  };
  const resetAll = () => { resetHover(); clearPressed(true); };
  const mouse = event => event.pointerType === 'mouse' && finePointer.matches;
  const follow = event => {
    if (!mouse(event)) return;
    if (event.buttons) { resetHover(); return; }
    setHover(targetOf(event.target));
  };
  document.addEventListener('pointerover', follow, {passive: true});
  document.addEventListener('pointerout', event => {
    if (!mouse(event)) return;
    if (!event.relatedTarget) { resetHover(); return; }
    setHover(targetOf(event.relatedTarget));
  }, {passive: true});
  document.addEventListener('pointermove', event => {
    if (pressed && event.pointerId === pressed.id &&
        Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > 8) clearPressed(true);
    follow(event);
  }, {passive: true});
  document.addEventListener('pointerdown', event => {
    clearPressed(true);
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    resetHover();
    const element = targetOf(event.target);
    if (!element) return;
    pressed = {element, id: event.pointerId, x: event.clientX, y: event.clientY};
    element.setAttribute('data-interaction-pressed', '');
  }, {passive: true});
  document.addEventListener('pointerup', event => {
    clearPressed();
    if (mouse(event)) follow(event);
  }, {passive: true});
  document.addEventListener('pointercancel', resetAll, {passive: true});
  document.addEventListener('scroll', resetAll, {capture: true, passive: true});
  document.addEventListener('visibilitychange', resetAll);
  document.addEventListener('keydown', resetHover, {capture: true});
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
    if (active && !eligible(active)) resetHover();
    for (const element of [...cooling.keys()]) if (!eligible(element)) snapOff(element);
    if (pressed && !eligible(pressed.element)) clearPressed(true);
  }).observe(document, {childList: true, subtree: true, attributes: true,
    attributeFilter: ['disabled', 'aria-disabled', 'inert']});
  root.setAttribute('data-interaction-managed', '');

  // Keep native disclosure timing, keyboard support, hash links and layout.
  // Only the revealed contents fade/settle; closing never waits for animation.
  const disclosures = new Map();
  const cancelDisclosure = details => {
    for (const animation of disclosures.get(details) || []) animation.cancel();
    disclosures.delete(details);
  };
  document.addEventListener('toggle', event => {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement)) return;
    cancelDisclosure(details);
    if (!details.open || reducedMotion.matches) return;
    const animations = [...details.children].filter(child => child.tagName !== 'SUMMARY' && !child.hidden)
      .map(child => child.animate([
        {opacity: 0.35, transform: 'translateY(4px)'},
        {opacity: 1, transform: 'translateY(0)'}
      ], {duration: 180, easing: 'ease-out'}));
    disclosures.set(details, animations);
    Promise.all(animations.map(animation => animation.finished.catch(() => {}))).then(() => {
      if (disclosures.get(details) === animations) disclosures.delete(details);
    });
  }, true);

  // One small introduction on touch devices; home only, never the book controls.
  const homeBook = document.querySelector('.home-page .book-stage-link .book-object');
  const touchLayout = matchMedia('(hover: none) and (pointer: coarse)');
  let bookObserver = null, bookAnimation = null, bookPlayed = false;
  const finishBook = () => {
    bookObserver?.disconnect(); bookObserver = null;
    bookAnimation?.cancel(); bookAnimation = null;
    if (homeBook && bookPlayed) homeBook.dataset.homeBookMotion = 'played';
  };
  const observeBook = () => {
    bookObserver?.disconnect(); bookObserver = null;
    if (!homeBook || bookPlayed || !touchLayout.matches || reducedMotion.matches ||
        !('IntersectionObserver' in window)) return;
    homeBook.dataset.homeBookMotion = 'ready';
    bookObserver = new IntersectionObserver(entries => {
      if (document.hidden || !entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.45)) return;
      bookPlayed = true;
      bookObserver.disconnect(); bookObserver = null;
      homeBook.dataset.homeBookMotion = 'running';
      bookAnimation = homeBook.animate([
        {transform: 'translateY(-8px) rotateY(0deg)'},
        {transform: 'translateY(-8px) rotateY(8deg)', offset: 0.45},
        {transform: 'translateY(-8px) rotateY(0deg)'}
      ], {duration: 600, easing: 'ease-in-out'});
      bookAnimation.finished.then(finishBook, finishBook);
    }, {threshold: 0.45});
    bookObserver.observe(homeBook);
  };
  reducedMotion.addEventListener('change', () => {
    resetAll();
    for (const details of [...disclosures.keys()]) cancelDisclosure(details);
    if (reducedMotion.matches) finishBook(); else observeBook();
  });
  touchLayout.addEventListener('change', () => { finishBook(); observeBook(); });
  window.addEventListener('pagehide', finishBook);
  window.addEventListener('pageshow', observeBook);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) finishBook(); else observeBook();
  });
  homeBook?.closest('a').addEventListener('pointerdown', () => { bookPlayed = true; finishBook(); }, {passive: true});
  observeBook();
})();
