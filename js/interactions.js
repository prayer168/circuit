export function initBasicCircuit() {
  const button = document.querySelector('#basicSwitch');
  const demo = document.querySelector('#basicDemo');
  const feedback = document.querySelector('#basicFeedback');
  const setState = on => {
    demo.dataset.on = on;
    button.setAttribute('aria-pressed', on);
    button.textContent = on ? '開關：閉合' : '開關：斷開';
    button.style.background = on ? '#23946f' : '';
    demo.setAttribute('aria-label', on ? '開關閉合，形成完整通路，燈泡發亮' : '開關斷開，電路有缺口，燈泡不亮');
    feedback.innerHTML = on ? '<strong>現在是通路：</strong>路徑完整，電流經過燈泡再回到電池。' : '<strong>現在是斷路：</strong>路有缺口，電流無法繞一圈。';
  };
  button.addEventListener('click', () => setState(demo.dataset.on !== 'true'));
  document.querySelector('#resetBasic').addEventListener('click', () => setState(false));
}

export function initConnectionComparison() {
  const stage = document.querySelector('.connection-stage');
  const series = document.querySelector('#seriesDiagram');
  const parallel = document.querySelector('#parallelDiagram');
  const feedback = document.querySelector('#connectionFeedback');
  const title = document.querySelector('#modeTitle');
  const badge = document.querySelector('#modeBadge');
  const steps = document.querySelector('#modeSteps');
  const remove = document.querySelector('#removeBulb');
  let mode = 'series';
  let broken = false;
  let stepIndex = 0;
  let playing = false;
  let slow = false;
  let stepTimer;
  const updateStep = () => [...steps.children].forEach((item, i) => item.classList.toggle('active', i === stepIndex));
  const stopTimer = () => { clearInterval(stepTimer); stepTimer = undefined; };
  const startTimer = () => {
    stopTimer(); playing = true; stage.classList.remove('paused');
    stepTimer = setInterval(() => { stepIndex = (stepIndex + 1) % 4; updateStep(); }, slow ? 1800 : 900);
  };
  const render = () => {
    stage.dataset.mode = mode;
    stage.classList.toggle('broken', broken);
    series.hidden = mode !== 'series';
    parallel.hidden = mode !== 'parallel';
    document.querySelectorAll('.mode-button').forEach(btn => btn.classList.toggle('selected', btn.dataset.mode === mode));
    badge.textContent = mode === 'series' ? '串聯' : '並聯';
    title.textContent = mode === 'series' ? '電流依序經過兩顆燈泡' : '電流在節點分成兩條支路';
    steps.innerHTML = mode === 'series' ? '<li class="active">從電池出發</li><li>經過第 1 顆燈泡</li><li>再經過第 2 顆燈泡</li><li>回到電池</li>' : '<li class="active">從電池出發</li><li>在節點分成兩路</li><li>各經過一顆燈泡</li><li>會合後回到電池</li>';
    stepIndex = 0; updateStep();
    remove.textContent = broken ? '第 2 顆已拿掉' : '拿掉第 2 顆燈泡';
    remove.disabled = broken;
    if (!broken) feedback.textContent = mode === 'series' ? '兩顆燈泡共用一條路，亮度通常比單顆時暗。' : '每顆燈泡各有一條支路，亮度通常較接近單顆燈泡。';
    else feedback.innerHTML = mode === 'series' ? '<strong>全部熄滅：</strong>唯一的路被切斷了。' : '<strong>第 1 顆仍亮：</strong>它所在的支路依然完整。';
  };
  document.querySelectorAll('.mode-button').forEach(btn => btn.addEventListener('click', () => { mode = btn.dataset.mode; broken = false; render(); }));
  remove.addEventListener('click', () => { broken = true; render(); });
  document.querySelector('#playAnimation').addEventListener('click', startTimer);
  document.querySelector('#pauseAnimation').addEventListener('click', () => { playing = false; stopTimer(); stage.classList.add('paused'); });
  document.querySelector('#slowAnimation').addEventListener('click', event => { slow = !slow; event.currentTarget.setAttribute('aria-pressed', slow); event.currentTarget.textContent = slow ? '1× 正常' : '½ 慢速'; stage.classList.toggle('slow', slow); if (playing) startTimer(); });
  document.querySelector('#replayAnimation').addEventListener('click', () => { stepIndex = 0; updateStep(); startTimer(); });
  document.querySelector('#resetConnection').addEventListener('click', () => { broken = false; stepIndex = 0; playing = false; stopTimer(); stage.classList.add('paused'); render(); });
  render();
}

export function initLab() {
  const modeInput = document.querySelector('#labMode');
  const faultInput = document.querySelector('#labFault');
  const circuit = document.querySelector('#houseCircuit');
  const feedback = document.querySelector('#labFeedback');
  document.querySelector('#runLab').addEventListener('click', () => {
    const mode = modeInput.value;
    const fault = faultInput.checked;
    const prediction = document.querySelector('input[name="prediction"]:checked')?.value;
    circuit.className = `house-circuit ${mode}${fault ? ' fault' : ''}`;
    const actual = fault ? (mode === 'series' ? 'both-off' : 'one-on') : 'both-on';
    circuit.setAttribute('aria-label', fault ? (mode === 'series' ? '第 2 顆燈泡故障，串聯的兩顆燈泡都不亮' : '第 2 顆燈泡故障，並聯的第 1 顆仍亮') : `兩顆燈泡${mode === 'series' ? '串聯' : '並聯'}且正常發亮`);
    if (!fault) feedback.innerHTML = `<strong>觀察結果：</strong>兩顆都亮。${mode === 'series' ? '它們共用一條路。' : '它們各有一條支路。'}`;
    else feedback.innerHTML = `<strong>${prediction === actual ? '預測成功！' : '再比對一次：'}</strong>${mode === 'series' ? '串聯的唯一通路被故障處切斷，兩顆都不亮。' : '並聯的第 1 條支路仍完整，所以第 1 顆繼續亮。'}`;
  });
  document.querySelector('#resetLab').addEventListener('click', () => {
    modeInput.value = 'series'; faultInput.checked = false;
    document.querySelectorAll('input[name="prediction"]').forEach(input => input.checked = false);
    circuit.className = 'house-circuit series';
    feedback.innerHTML = '<strong>操作提示：</strong>選擇接法、預測結果，再按「驗證結果」。';
  });
}

const sceneSvg = type => {
  const scenes = {
    flashlight:'<path d="M55 72h92l42 24-42 24H55z" class="scene-safe"/><path d="M188 84l70-28v80l-70-28z" fill="#fff3c4"/><circle cx="82" cy="96" r="15" class="scene-accent pulse"/>',
    home:'<path d="M58 103l72-55 72 55v70H58z" class="scene-safe"/><rect x="84" y="116" width="35" height="57" fill="#fff"/><rect x="143" y="116" width="35" height="30" class="scene-accent pulse"/><path d="M130 48v-22" class="scene-line"/>',
    string:'<path d="M35 55q95 75 215 0" class="scene-line"/><circle cx="67" cy="81" r="16" class="scene-accent pulse"/><circle cx="120" cy="101" r="16" class="scene-accent pulse"/><circle cx="175" cy="97" r="16" class="scene-danger"/><circle cx="225" cy="76" r="16" class="scene-accent pulse"/>',
    powerstrip:'<rect x="38" y="62" width="210" height="86" rx="26" class="scene-safe"/><circle cx="86" cy="105" r="20" fill="#fff"/><circle cx="145" cy="105" r="20" fill="#fff"/><circle cx="204" cy="105" r="20" fill="#fff"/><path d="M248 105h30" class="scene-line"/>',
    breaker:'<rect x="77" y="35" width="130" height="135" rx="18" fill="#fff" stroke="#143d59" stroke-width="7"/><rect x="115" y="58" width="55" height="78" rx="12" class="scene-danger move"/><path d="M142 137v25" class="scene-line"/>',
    safety:'<path d="M120 30l100 165H20z" fill="#fff3c4" stroke="#143d59" stroke-width="7"/><path d="M128 65l-30 65h32l-16 42 54-72h-33l18-35z" class="scene-danger"/><path d="M233 56q25 23 0 46q-25-23 0-46z" fill="#4aa8d8"/>'
  };
  return `<svg class="app-visual" viewBox="0 0 280 200" role="img" aria-label="${type} 生活情境圖解">${scenes[type]}</svg>`;
};

export function renderApplications(items) {
  document.querySelector('#applicationGrid').innerHTML = items.map(item => `<article class="application-card">${sceneSvg(item.visual)}<div class="content"><span class="principle-chip">${item.principle}</span><h2>${item.title}</h2><p>${item.description}</p><p class="think"><strong>想一想：</strong>${item.question}</p></div></article>`).join('');
}
