import { initNavigation } from './navigation.js';
import { initProgress, markVisited } from './progress.js';
import { initBasicCircuit, initConnectionComparison, initLab, renderApplications } from './interactions.js';
import { initQuiz } from './quiz.js';

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`無法載入 ${path}`);
  return response.json();
}

function renderResources(resources) {
  const icons = {'互動模擬':'🧪','學習單':'📝','互動教材':'🧩','教學影片':'🎬','教學設計':'📘','知識閱讀':'🔎','科普文章':'🔬','重點整理':'💡'};
  document.querySelector('#resourceGrid').innerHTML = resources.map(resource => `<a class="resource-card" href="${resource.url}" target="_blank" rel="noopener noreferrer"><span class="resource-icon" aria-hidden="true">${icons[resource.type] || '🔗'}</span><span><span class="resource-meta">${resource.type}・${resource.grade}</span><h2>${resource.title}</h2><p>${resource.description}</p><span class="resource-check">來源：${resource.source}・查核：${resource.checkedDate}</span></span></a>`).join('');
}

async function start() {
  initProgress();
  initNavigation(id => markVisited(id));
  initBasicCircuit();
  initConnectionComparison();
  initLab();
  try {
    const [content, quiz, resources] = await Promise.all([loadJson('./data/content.json'), loadJson('./data/quiz.json'), loadJson('./data/resources.json')]);
    renderApplications(content.applications);
    initQuiz(quiz);
    renderResources(resources);
  } catch (error) {
    console.error(error);
    document.querySelector('#applicationGrid').innerHTML = '<p class="feedback error">生活應用資料載入失敗，請重新整理頁面。</p>';
    document.querySelector('#quizCard').innerHTML = '<p class="feedback error">題庫載入失敗，請重新整理頁面。</p>';
    document.querySelector('#resourceGrid').innerHTML = '<p class="feedback error">教材資料載入失敗，請重新整理頁面。</p>';
  }
}

start();
