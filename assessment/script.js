(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.site-menu');
  const setMenu = (open, returnFocus = false) => {
    menuButton.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    menuButton.querySelector('span').textContent = open ? '−' : '＋';
    if (returnFocus) menuButton.focus();
  };
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header') && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false, true);
  });
  const smallLayout = matchMedia('(max-width:820px)');
  smallLayout.addEventListener('change', () => { if (!smallLayout.matches) setMenu(false); });
  const mobileCta = document.querySelector('.mobile-cta');
  const hero = document.querySelector('.hero');
  const pricePanel = document.querySelector('.price-panel');
  const footer = document.querySelector('.site-footer');
  let updateQueued = false;
  function updateCta() {
    const price = pricePanel.getBoundingClientRect();
    const end = footer.getBoundingClientRect();
    const priceVisible = price.top < innerHeight && price.bottom > 0;
    mobileCta.hidden = !smallLayout.matches || hero.getBoundingClientRect().bottom > 0 || priceVisible || end.top < innerHeight;
    updateQueued = false;
  }
  addEventListener('scroll', () => { if (!updateQueued) { updateQueued = true; requestAnimationFrame(updateCta); } }, {passive:true});
  addEventListener('resize', updateCta); updateCta();
})();

// Keep previously shared service section links working.
(() => {
  const sections = {diff: 'story', gap: 'report-to-book', author: 'why-book', apply: 'tiers'};
  function resolveSection() {
    const destination = sections[location.hash.slice(1)];
    if (destination) location.replace('#' + destination);
  }
  addEventListener('hashchange', resolveSection);
  resolveSection();
})();
