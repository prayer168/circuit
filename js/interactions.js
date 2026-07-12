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
  const diagramTitle = document.querySelector('#connectionTitle');
  const diagramDesc = document.querySelector('#connectionDesc');
  const diagrams = [...document.querySelectorAll('.circuit-diagram')];
  const feedback = document.querySelector('#connectionFeedback');
  const title = document.querySelector('#modeTitle');
  const badge = document.querySelector('#modeBadge');
  const steps = document.querySelector('#modeSteps');
  const remove = document.querySelector('#removeComponent');
  const batterySafety = document.querySelector('#batterySafety');
  const modes = {
    'bulb-series': {
      diagram: 'bulbSeriesDiagram', badge: '燈泡串聯', title: '兩顆燈泡共用一條通路', component: '燈泡',
      svgTitle: '燈泡串聯電路', desc: '一顆電池和兩顆燈泡形成單一通路，兩顆燈泡依序接在同一條線路上。',
      steps: ['從電池正極出發', '依序經過兩顆燈泡', '沿同一條路前進', '回到電池負極'],
      feedback: '和一顆燈泡相比，兩顆相同燈泡串聯時通常較暗。',
      broken: '<strong>兩顆都熄滅：</strong>拿掉一顆燈泡後，唯一的通路被切斷。'
    },
    'bulb-parallel': {
      diagram: 'bulbParallelDiagram', badge: '燈泡並聯', title: '兩顆燈泡分別接在兩條支路', component: '燈泡',
      svgTitle: '燈泡並聯電路', desc: '一顆電池連接兩條支路，每條支路各有一顆燈泡，兩端接在共同接點。',
      steps: ['從電池正極出發', '在共同接點分成兩路', '每路各經過一顆燈泡', '會合後回到電池負極'],
      feedback: '兩顆相同燈泡各接在一條支路，亮度通常接近單顆燈泡。',
      broken: '<strong>第 1 顆仍亮：</strong>第 2 支路中斷，但第 1 支路仍是完整通路。'
    },
    'battery-series': {
      diagram: 'batterySeriesDiagram', badge: '電池串聯', title: '第 1 顆正極接第 2 顆負極', component: '電池',
      svgTitle: '電池串聯電路', desc: '兩顆電池頭尾相接，第一顆正極接第二顆負極，再與一顆燈泡形成單一通路。',
      steps: ['確認兩顆電池方向相同', '第 1 顆正極接第 2 顆負極', '剩下兩端接入電路', '電流經燈泡形成通路'],
      feedback: '兩顆相同電池串聯時，電壓效果相加，燈泡通常比使用一顆電池更亮。',
      broken: '<strong>燈泡熄滅：</strong>拿掉一顆電池後，串聯的唯一通路被切斷。'
    },
    'battery-parallel': {
      diagram: 'batteryParallelDiagram', badge: '電池並聯', title: '正極接正極，負極接負極', component: '電池',
      svgTitle: '電池並聯電路', desc: '兩顆同規格電池的正極連在一起、負極連在一起，再與一顆燈泡形成通路。',
      steps: ['確認電池同品牌同規格', '兩顆正極連在一起', '兩顆負極連在一起', '共同兩端接入燈泡電路'],
      feedback: '兩顆相同電池並聯時，燈泡亮度通常接近使用一顆電池，但可使用較久。',
      broken: '<strong>燈泡仍亮：</strong>拿掉一顆後，另一顆仍形成通路，但可使用的時間會縮短。'
    }
  };
  let mode = 'bulb-series';
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
    const config = modes[mode];
    stage.dataset.mode = mode;
    stage.classList.toggle('broken', broken);
    diagrams.forEach(diagram => diagram.toggleAttribute('hidden', diagram.id !== config.diagram));
    document.querySelectorAll('.mode-button').forEach(btn => btn.classList.toggle('selected', btn.dataset.mode === mode));
    badge.textContent = config.badge;
    title.textContent = config.title;
    diagramTitle.textContent = config.svgTitle;
    diagramDesc.textContent = config.desc;
    steps.innerHTML = config.steps.map((step, index) => `<li${index === 0 ? ' class="active"' : ''}>${step}</li>`).join('');
    stepIndex = 0; updateStep();
    remove.textContent = broken ? `第 2 顆${config.component}已拿掉` : `拿掉第 2 顆${config.component}`;
    remove.disabled = broken;
    batterySafety.hidden = mode !== 'battery-parallel';
    if (!broken) feedback.textContent = config.feedback;
    else feedback.innerHTML = config.broken;
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
