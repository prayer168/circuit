const tabs = [...document.querySelectorAll('[role="tab"]')];
const panels = [...document.querySelectorAll('[role="tabpanel"]')];
const prev = document.querySelector('#prevTab');
const next = document.querySelector('#nextTab');
const position = document.querySelector('#tabPosition');
let activeIndex = 0;
let onChange = () => {};

export function showTab(id, focus = false) {
  const index = tabs.findIndex(tab => tab.dataset.tab === id);
  if (index < 0) return;
  activeIndex = index;
  tabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute('aria-selected', selected);
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focus) tab.focus();
  });
  panels.forEach((panel, i) => {
    panel.hidden = i !== index;
    panel.classList.toggle('active', i === index);
  });
  prev.disabled = index === 0;
  next.disabled = index === tabs.length - 1;
  position.textContent = `${index + 1} / ${tabs.length}`;
  onChange(id, index);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function initNavigation(callback) {
  onChange = callback;
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showTab(tab.dataset.tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let target = index;
      if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') target = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = tabs.length - 1;
      showTab(tabs[target].dataset.tab, true);
    });
  });
  document.addEventListener('click', event => {
    const go = event.target.closest('[data-go]');
    if (go) showTab(go.dataset.go);
  });
  prev.addEventListener('click', () => showTab(tabs[activeIndex - 1].dataset.tab));
  next.addEventListener('click', () => showTab(tabs[activeIndex + 1].dataset.tab));
  showTab('mission');
}

