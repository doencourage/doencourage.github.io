/* Touch feedback follows the same target as the eventual click. */
(() => {
  let pressed = null;
  const clear = () => {
    if (pressed) pressed.element.removeAttribute('data-interaction-pressed');
    pressed = null;
  };
  document.addEventListener('pointerdown', event => {
    clear();
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    const element = event.target.closest?.('a[href], button, summary, select, [role="button"]');
    if (!element || element.matches(':disabled, [aria-disabled="true"]')) return;
    pressed = {element, id: event.pointerId, x: event.clientX, y: event.clientY};
    element.setAttribute('data-interaction-pressed', '');
  }, {passive: true});
  document.addEventListener('pointermove', event => {
    if (pressed && event.pointerId === pressed.id && Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > 8) clear();
  }, {passive: true});
  for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, clear, {passive: true});
  document.addEventListener('scroll', clear, {capture: true, passive: true});
  document.addEventListener('visibilitychange', clear);
  window.addEventListener('blur', clear);
})();
