import { showTab } from './navigation.js';
let questions = [], index = 0, score = 0, answered = false;

function renderQuestion() {
  const q = questions[index]; answered = false;
  document.querySelector('#questionCount').textContent = `第 ${index + 1} / ${questions.length} 題`;
  document.querySelector('#scoreCount').textContent = `目前答對 ${score} 題`;
  document.querySelector('#quizCard').innerHTML = `<span class="question-tag">${q.type}</span><h2>${q.question}</h2><div class="options">${q.options.map((option, i) => `<button class="option-button" type="button" data-option="${i}">${String.fromCharCode(65 + i)}　${option}</button>`).join('')}</div><div id="answerFeedback" class="feedback" hidden aria-live="polite"></div><div class="quiz-actions"><button class="text-button" type="button" id="reviewButton">回看相關教材</button><button class="primary-button" type="button" id="nextQuestion" hidden>${index === questions.length - 1 ? '查看結果' : '下一題'}</button></div>`;
  document.querySelectorAll('.option-button').forEach(btn => btn.addEventListener('click', () => answer(Number(btn.dataset.option))));
  document.querySelector('#reviewButton').addEventListener('click', () => showTab(q.reviewTab));
  document.querySelector('#nextQuestion').addEventListener('click', nextQuestion);
}

function answer(choice) {
  if (answered) return; answered = true;
  const q = questions[index]; const correct = choice === q.answer;
  if (correct) score += 1;
  document.querySelectorAll('.option-button').forEach((btn, i) => { btn.disabled = true; if (i === q.answer) btn.classList.add('correct'); else if (i === choice) btn.classList.add('wrong'); });
  const feedback = document.querySelector('#answerFeedback'); feedback.hidden = false;
  feedback.classList.toggle('error', !correct); feedback.innerHTML = `<strong>${correct ? '答對了！' : '再想一想。'}</strong> ${q.explanation}`;
  document.querySelector('#scoreCount').textContent = `目前答對 ${score} 題`;
  document.querySelector('#nextQuestion').hidden = false;
}

function nextQuestion() {
  if (index < questions.length - 1) { index += 1; renderQuestion(); return; }
  const best = Math.max(score, Number(localStorage.getItem('electric-circuit-quiz-best') || 0));
  localStorage.setItem('electric-circuit-quiz-best', best);
  document.querySelector('#quizCard').hidden = true;
  const result = document.querySelector('#quizResult'); result.hidden = false;
  const advice = score >= 9 ? '你能用證據解釋電路，已是亮光工程師！' : score >= 7 ? '觀念很穩，再複習故障時的串並聯差異。' : '先回到「讓燈泡亮」與「串聯與並聯」，操作後再挑戰。';
  result.innerHTML = `<h2>挑戰完成</h2><strong>${score} / ${questions.length}</strong><p>${advice}</p><p>最佳紀錄：${best} 題</p><button id="retryQuiz" class="primary-button" type="button">重新挑戰</button>`;
  document.querySelector('#retryQuiz').addEventListener('click', () => { index = 0; score = 0; result.hidden = true; document.querySelector('#quizCard').hidden = false; renderQuestion(); });
}

export function initQuiz(data) { questions = data; renderQuestion(); }

