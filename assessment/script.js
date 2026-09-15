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
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const tabList = document.querySelector('[role="tablist"]');
  const smallLayout = matchMedia('(max-width:820px)');
  function updateOrientation() { tabList.setAttribute('aria-orientation', smallLayout.matches ? 'horizontal' : 'vertical'); if (!smallLayout.matches) setMenu(false); }
  updateOrientation();
  smallLayout.addEventListener('change', updateOrientation);
  function selectTab(tab, focus = false) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      const previousKey = smallLayout.matches ? 'ArrowLeft' : 'ArrowUp';
      const nextKey = smallLayout.matches ? 'ArrowRight' : 'ArrowDown';
      if (event.key === nextKey) next = (index + 1) % tabs.length;
      if (event.key === previousKey) next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); selectTab(tabs[next], true); }
    });
  });
  const dialog = document.getElementById('sample-dialog');
  const enlarge = document.querySelector('.enlarge');
  enlarge.addEventListener('click', () => {
    const selected = tabs.find(tab => tab.getAttribute('aria-selected') === 'true');
    const sheet = document.getElementById(selected.getAttribute('aria-controls')).cloneNode(true);
    sheet.removeAttribute('id'); sheet.removeAttribute('role'); sheet.removeAttribute('aria-labelledby'); sheet.removeAttribute('tabindex');
    const text = selected.querySelector('strong').textContent.trim();
    document.getElementById('dialog-title').textContent = '책 미리보기 · ' + text;
    document.getElementById('dialog-content').replaceChildren(sheet);
    dialog.showModal(); document.body.classList.add('modal-open');
    document.querySelector('.dialog-close').focus();
  });
  document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); enlarge.focus(); });
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
