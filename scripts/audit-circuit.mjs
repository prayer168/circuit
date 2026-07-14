#!/usr/bin/env node

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 2) out[argv[i].replace(/^--/, '')] = argv[i + 1];
  return out;
}

function findBrowser(explicit) {
  const candidates = [
    explicit,
    process.env.CHROME_PATH,
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter(Boolean);
  return candidates.find(file => fs.existsSync(file));
}

function mimeType(file) {
  return ({
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.md': 'text/markdown; charset=utf-8'
  })[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

async function startServer(root, entry) {
  const absoluteRoot = path.resolve(root);
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let relative = pathname === '/' ? entry : pathname.replace(/^\/+/, '');
      let file = path.resolve(absoluteRoot, relative);
      if (relative.startsWith('img/') && !fs.existsSync(file)) file = path.resolve(absoluteRoot, 'public', relative);
      if (!file.startsWith(`${absoluteRoot}${path.sep}`)) throw new Error('Forbidden');
      const stat = await fsp.stat(file);
      if (!stat.isFile()) throw new Error('Not a file');
      response.writeHead(200, { 'Content-Type': mimeType(file), 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(response);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, listener) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(listener);
  }

  async evaluate(fn, arg = null) {
    const result = await this.send('Runtime.evaluate', {
      expression: `(${fn.toString()})(${JSON.stringify(arg)})`,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
}

async function launchBrowser(browserPath, url) {
  const profile = await fsp.mkdtemp(path.join(os.tmpdir(), 'circuit-audit-'));
  const child = spawn(browserPath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, url
  ], { stdio: 'ignore', windowsHide: true });
  const portFile = path.join(profile, 'DevToolsActivePort');
  let port;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (fs.existsSync(portFile)) {
      [port] = (await fsp.readFile(portFile, 'utf8')).trim().split(/\r?\n/);
      break;
    }
    if (child.exitCode !== null) throw new Error(`Browser exited early (${child.exitCode})`);
    await delay(50);
  }
  if (!port) throw new Error('Browser DevTools port was not created.');
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
  const target = targets.find(item => item.type === 'page');
  if (!target) throw new Error('No browser page target found.');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const client = new CdpClient(socket);
  const consoleErrors = [];
  const failedResponses = [];
  client.on('Runtime.consoleAPICalled', event => {
    if (event.type === 'error') consoleErrors.push(event.args.map(arg => arg.value || arg.description).join(' '));
  });
  client.on('Runtime.exceptionThrown', event => consoleErrors.push(event.exceptionDetails.text));
  client.on('Network.responseReceived', event => {
    if (event.response.status >= 400) failedResponses.push({ status: event.response.status, url: event.response.url });
  });
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  await delay(700);
  return {
    client, consoleErrors, failedResponses,
    async close() {
      socket.close();
      child.kill();
      await delay(100);
      await fsp.rm(profile, { recursive: true, force: true });
    }
  };
}

function check(id, ok, detail) {
  return { id, ok: Boolean(ok), detail };
}

function markdownReport(report) {
  const lines = [
    '# 電路物理互動稽核報告', '',
    `- 稽核時間：${report.generatedAt}`,
    `- 結果：${report.summary.failed === 0 ? '通過' : '未通過'}`,
    `- 通過／失敗：${report.summary.passed}／${report.summary.failed}`, '',
    '| 檢查項目 | 結果 | 說明 |', '|---|---:|---|'
  ];
  for (const item of report.checks) lines.push(`| ${item.id} | ${item.ok ? '通過' : '失敗'} | ${String(item.detail).replace(/\|/g, '\\|')} |`);
  lines.push('', '## 重跑指令', '', '```powershell', report.rerunCommand, '```', '');
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv);
  const project = path.resolve(args.project || '.');
  const configPath = path.resolve(args.config || path.join(project, 'physics-audit.json'));
  const outputPath = path.resolve(args.output || path.join(project, 'audit', 'physics-audit-report.json'));
  const markdownPath = path.resolve(args.markdown || path.join(project, 'audit', 'physics-audit-report.md'));
  const config = JSON.parse(await fsp.readFile(configPath, 'utf8'));
  const browserPath = findBrowser(args.chrome);
  if (!browserPath) throw new Error('Chrome or Edge was not found.');
  const { server, url } = await startServer(project, config.entry);
  const browser = await launchBrowser(browserPath, url);
  const { client } = browser;
  const checks = [];
  try {
    const ready = await client.evaluate(async () => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        if (document.querySelectorAll('.application-card').length === 6 && document.querySelectorAll('.resource-card').length === 8) return true;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    });
    checks.push(check('資料載入', ready, ready ? '生活應用與資源已載入' : '動態教材資料未完成載入'));

    const structure = await client.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
      return {
        tabs: document.querySelectorAll('[role="tab"]').length,
        apps: document.querySelectorAll('.application-card').length,
        resources: document.querySelectorAll('.resource-card').length,
        duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index)
      };
    });
    checks.push(check('教材結構', structure.tabs === 7 && structure.apps === 6 && structure.resources === 8, JSON.stringify(structure)));
    checks.push(check('SVG／DOM ID 唯一', structure.duplicateIds.length === 0, structure.duplicateIds.length ? structure.duplicateIds.join(', ') : '無重複 ID'));

    const basic = await client.evaluate(selectors => {
      document.querySelector(selectors.basicSwitch).click();
      const demo = document.querySelector(selectors.basicDemo);
      const svg = demo.querySelector('svg').getBoundingClientRect();
      const dots = [...demo.querySelectorAll('.flow-path circle')].map(element => element.getBoundingClientRect());
      return {
        on: demo.dataset.on,
        label: demo.getAttribute('aria-label'),
        contained: dots.every(rect => rect.left >= svg.left && rect.top >= svg.top && rect.right <= svg.right && rect.bottom <= svg.bottom)
      };
    }, config.selectors);
    checks.push(check('完整通路開關', basic.on === 'true' && basic.label.includes('完整通路') && basic.contained, JSON.stringify(basic)));

    const modes = await client.evaluate(async configValue => {
      document.querySelector('#tab-connections').click();
      const results = [];
      for (const [mode, expected] of Object.entries(configValue.modes)) {
        document.querySelector(`[data-mode="${mode}"]`).click();
        const visible = [...document.querySelectorAll('.circuit-diagram')].filter(element => !element.hasAttribute('hidden'));
        const title = document.querySelector('#modeTitle').textContent;
        document.querySelector(configValue.selectors.removeComponent).click();
        const feedback = document.querySelector(configValue.selectors.connectionFeedback).textContent;
        results.push({ mode, visible: visible.length, title, feedback, ok: visible.length === 1 && title === expected.title && feedback.includes(expected.removedEvidence) });
        document.querySelector('#resetConnection').click();
      }
      return results;
    }, config);
    for (const result of modes) checks.push(check(`接法：${result.mode}`, result.ok, JSON.stringify(result)));

    const labAudit = await client.evaluate(configValue => {
      document.querySelector('#tab-lab').click();
      const mode = document.querySelector(configValue.selectors.labMode);
      const fault = document.querySelector(configValue.selectors.labFault);
      mode.value = 'parallel';
      mode.dispatchEvent(new Event('change', { bubbles: true }));
      const circuit = document.querySelector(configValue.selectors.houseCircuit);
      const parallelDiagram = document.querySelector(configValue.selectors.parallelDiagram);
      const preview = {
        parallelClass: circuit.classList.contains('parallel'),
        diagramVisible: getComputedStyle(parallelDiagram).display !== 'none',
        prompt: document.querySelector(configValue.selectors.labFeedback).textContent
      };
      preview.ok = preview.parallelClass && preview.diagramVisible && preview.prompt.includes('目前是燈泡並聯');
      const branchNames = ['one', 'two'];
      const branchGaps = branchNames.map(name => {
        const bulb = parallelDiagram.querySelector(`.lab-svg-bulb.${name} circle`).getBoundingClientRect();
        const left = parallelDiagram.querySelector(`.branch-${name}-left`).getBoundingClientRect();
        const right = parallelDiagram.querySelector(`.branch-${name}-right`).getBoundingClientRect();
        const leftGap = bulb.left - left.right;
        const rightGap = right.left - bulb.right;
        return { name, leftGap, rightGap, ok: Math.abs(leftGap) <= 4 && Math.abs(rightGap) <= 4 };
      });
      const cases = configValue.labCases.map(testCase => {
        mode.value = testCase.mode;
        mode.dispatchEvent(new Event('change', { bubbles: true }));
        fault.checked = testCase.fault;
        fault.dispatchEvent(new Event('change', { bubbles: true }));
        document.querySelectorAll('input[name="prediction"]').forEach(input => { input.checked = input.value === testCase.prediction; });
        document.querySelector(configValue.selectors.runLab).click();
        const label = document.querySelector(configValue.selectors.houseCircuit).getAttribute('aria-label');
        const feedback = document.querySelector(configValue.selectors.labFeedback).textContent;
        return { ...testCase, label, feedback, ok: label.includes(testCase.labelIncludes) && feedback.includes(testCase.feedbackIncludes) };
      });
      return { preview, branchGaps, cases };
    }, config);
    checks.push(check('實驗接法即時同步', labAudit.preview.ok, JSON.stringify(labAudit.preview)));
    checks.push(check('並聯支路接到燈泡端點', labAudit.branchGaps.every(result => result.ok), JSON.stringify(labAudit.branchGaps)));
    for (const result of labAudit.cases) checks.push(check(`故障規則：${result.id}`, result.ok, JSON.stringify(result)));

    const applications = await client.evaluate(async () => {
      document.querySelector('#tab-life').click();
      for (const button of document.querySelectorAll('.application-toggle')) button.click();
      await new Promise(resolve => setTimeout(resolve, 350));
      return [...document.querySelectorAll('.application-card')].map(card => ({
        answerVisible: !card.querySelector('.application-answer').hidden,
        evidenceVisible: Number(getComputedStyle(card.querySelector('.scene-evidence')).opacity) > 0.9,
        photoLoaded: card.querySelector('.photo-visual img')?.complete && card.querySelector('.photo-visual img')?.naturalWidth === 960,
        photoSource: card.querySelector('.photo-visual img')?.getAttribute('src') || ''
      }));
    });
    checks.push(check('生活應用寫實照片與觀察證據', applications.length === 6 && applications.every(item => item.answerVisible && item.evidenceVisible && item.photoLoaded && item.photoSource.endsWith('.webp')), JSON.stringify(applications)));

    const quiz = JSON.parse(await fsp.readFile(path.join(project, 'data', 'quiz.json'), 'utf8'));
    const answerPositions = new Set(quiz.map(item => item.answer));
    checks.push(check('題庫邊界與答案分布', quiz.length === 10 && quiz.every(item => item.options.length === 4 && item.answer >= 0 && item.answer < 4) && answerPositions.size === 4, `10 題；答案位置 ${[...answerPositions].sort().join(', ')}`));

    for (const viewport of config.viewports) {
      await client.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: false });
      const result = await client.evaluate(async () => {
        const details = [];
        for (const tab of document.querySelectorAll('[role="tab"]')) {
          tab.click();
          await new Promise(resolve => setTimeout(resolve, 30));
          details.push({ tab: tab.dataset.tab, width: document.documentElement.scrollWidth, innerWidth });
        }
        return details;
      });
      checks.push(check(`響應式：${viewport.name}`, result.every(item => item.width <= item.innerWidth), JSON.stringify(result)));
    }

    await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const reduced = await client.evaluate(async () => {
      document.querySelector('#tab-connections').click();
      document.querySelector('#playAnimation').click();
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        paused: document.querySelector('.connection-stage').classList.contains('paused'),
        status: document.querySelector('#animationStatus').textContent
      };
    });
    checks.push(check('降低動畫偏好', reduced.paused && reduced.status.includes('降低動畫偏好'), JSON.stringify(reduced)));

    await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    const hiddenAnimation = await client.evaluate(async () => {
      document.querySelector('#tab-connections').click();
      document.querySelector('#playAnimation').click();
      document.querySelector('#tab-life').click();
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        paused: document.querySelector('.connection-stage').classList.contains('paused'),
        playing: document.querySelector('#playAnimation').getAttribute('aria-pressed')
      };
    });
    checks.push(check('隱藏頁籤停止動畫', hiddenAnimation.paused && hiddenAnimation.playing === 'false', JSON.stringify(hiddenAnimation)));

    checks.push(check('瀏覽器主控台', browser.consoleErrors.length === 0, browser.consoleErrors.length ? browser.consoleErrors.join('; ') : '無錯誤'));
    checks.push(check('關鍵請求', browser.failedResponses.length === 0, browser.failedResponses.length ? JSON.stringify(browser.failedResponses) : '無 4xx／5xx'));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }

  const summary = {
    passed: checks.filter(item => item.ok).length,
    failed: checks.filter(item => !item.ok).length
  };
  const report = {
    generatedAt: new Date().toISOString(), project, browser: browserPath,
    summary, checks,
    rerunCommand: 'node .\\scripts\\audit-circuit.mjs --project . --config .\\physics-audit.json --output .\\audit\\physics-audit-report.json --markdown .\\audit\\physics-audit-report.md'
  };
  await fsp.mkdir(path.dirname(outputPath), { recursive: true });
  await fsp.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fsp.writeFile(markdownPath, markdownReport(report), 'utf8');
  console.log(JSON.stringify(summary));
  if (summary.failed) process.exitCode = 1;
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
