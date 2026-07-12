const STORAGE_KEY = 'electric-circuit-lab-progress-v1';
const allTabs = ['mission', 'light', 'connections', 'lab', 'life', 'quiz', 'resources'];
let visited = new Set();

function render() {
  const percent = Math.round((visited.size / allTabs.length) * 100);
  document.querySelector('#progressText').textContent = `學習進度 ${percent}%`;
  document.querySelector('#progressBar').style.width = `${percent}%`;
  document.querySelector('.progress-track').setAttribute('aria-valuenow', percent);
}

export function initProgress() {
  try { visited = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY)) || []); } catch { visited = new Set(); }
  document.querySelector('#resetProgress').addEventListener('click', () => {
    if (!confirm('要清除所有學習進度與測驗紀錄嗎？')) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('electric-circuit-quiz-best');
    visited = new Set();
    render();
  });
  render();
}

export function markVisited(id) {
  visited.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...visited]));
  render();
}

