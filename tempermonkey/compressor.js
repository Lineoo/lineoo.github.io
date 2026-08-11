// ==UserScript==
// @name         自动音量均衡器
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  自动将视频响度归一化到统一目标电平（AGC 方案，含悬浮控制面板）
// @author       You
// @match        *://*.bilibili.com/*
// @match        *://*.youtube.com/*
// @match        *://*.iqiyi.com/*
// @match        *://*.youku.com/*
// @match        *://*.v.qq.com/*
// @match        *://*.acfun.cn/*
// @match        *://*.mgtv.com/*
// @match        *://*.ixigua.com/*
// @match        *://*.douyin.com/*
// @match        *://*.kuaishou.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
      :root {
        --agc-bg: #f2f2f6;
        --agc-text: #2a2a3a;
        --agc-accent: #7e7ea0;
        --agc-card: #e6e6ee;
        --agc-muted: #9494a8;
        --agc-bar-bg: #d4d4e0;
        --agc-border: #d0d0dc;
        --agc-blue: #78a0d8;
        --agc-amber: #c8a860;
        --agc-green: #50a070;
        --agc-red: #c05050;
        --agc-shadow: rgba(0,0,0,0.10);
        --agc-btn-hover: #5e5e80;
        --agc-btn-muted: #c8c8d8;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --agc-bg: #0e0e16;
          --agc-text: #c4c4d8;
          --agc-accent: #8e8eb0;
          --agc-card: #1c1c2a;
          --agc-muted: #68687c;
          --agc-bar-bg: #2a2a3c;
          --agc-border: #282838;
          --agc-blue: #7aa0d0;
          --agc-amber: #c0a060;
          --agc-green: #58b878;
          --agc-red: #d86868;
          --agc-shadow: rgba(0,0,0,0.45);
          --agc-btn-hover: #6e6e90;
          --agc-btn-muted: #2a2a3c;
        }
      }
      .__vEq-card { padding:8px 12px; margin:8px 0; background:var(--agc-card); border-radius:8px; }
      .__vEq-card-tight { padding:6px 12px; }
      .__vEq-meter-row { display:flex; justify-content:space-between; font-size:12px; margin-bottom:3px; }
      .__vEq-bar { width:100%; height:6px; background:var(--agc-bar-bg); border-radius:3px; overflow:hidden; }
      .__vEq-bar-f { height:100%; border-radius:3px; }
      .__vEq-group-title { font-size:10px; color:var(--agc-muted); text-transform:uppercase; letter-spacing:1px; margin:10px 0 6px; }
      .__vEq-slider-row { margin-bottom:6px; }
      .__vEq-slider-label { display:flex; justify-content:space-between; font-size:12px; margin-bottom:2px; }
      .__vEq-slider { width:100%; height:3px; accent-color:var(--agc-accent); cursor:pointer; }
      .__vEq-header { display:flex; justify-content:space-between; align-items:center; cursor:move; padding-bottom:8px; border-bottom:1px solid var(--agc-border); }
      .__vEq-header-actions { display:flex; align-items:center; gap:8px; }
      .__vEq-header-btn { cursor:pointer; line-height:1; }
      .__vEq-toggle-row { display:flex; align-items:center; gap:10px; padding:8px 12px; }
      .__vEq-toggle { position:relative; display:inline-block; width:40px; height:22px; cursor:pointer; }
      .__vEq-toggle-input { opacity:0; width:0; height:0; }
      .__vEq-toggle-track { position:absolute; inset:0; border-radius:22px; transition:background .3s; }
      .__vEq-toggle-knob { position:absolute; top:2px; width:18px; height:18px; background:#fff; border-radius:50%; transition:left .3s; }
      .__vEq-footer { margin-top:8px; padding-top:8px; border-top:1px solid var(--agc-border); font-size:11px; color:var(--agc-muted); text-align:center; }
      .__vEq-sliders { max-height:340px; overflow-y:auto; padding-right:4px; }
      .__vEq-canvas { display:block; width:100%; border-radius:4px; margin:4px 0; }
      #__vEqBtn { position:fixed; z-index:2147483647; bottom:20px; right:20px; width:44px; height:44px; border-radius:50%; background:var(--agc-accent); color:#fff; cursor:pointer; display:none; align-items:center; justify-content:center; font-weight:bold; font-size:10px; font-family:sans-serif; user-select:none; transition:background .2s; }
      #__vEqBtn:hover { background:var(--agc-btn-hover); }
      #__vEqBtn.--muted { background:var(--agc-btn-muted); }
      #__vEqPanel { position:fixed; z-index:2147483647; bottom:76px; right:20px; width:330px; background:var(--agc-bg); color:var(--agc-text); border-radius:12px; font:14px/1.5 sans-serif; padding:16px; display:none; user-select:none; }
    `;
    document.head.appendChild(style);

    const DEFAULTS = {
        targetLevel: -18,
        maxGain: 24,
        minGain: -18,
        gainBias: 0,
        rmsWindow: 5,
        levelBase: -18,
        levelSteep: 1.05,
        tauBase: 20,
        tauSteep: 0.5,
        initLevel: -18
    };
    const STORE_KEY = '__agcState';

    let CONFIG = Object.assign({}, DEFAULTS);
    let isEnabled = true;

    (function loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORE_KEY));
            if (saved && typeof saved === 'object') {
                isEnabled = saved._enabled ?? true;
                delete saved._enabled;
                Object.assign(CONFIG, saved);
            }
        } catch (e) {}
    })();

    function saveState() {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify({ _enabled: isEnabled, ...CONFIG }));
        } catch (e) {}
    }

    function resetConfig() {
        Object.assign(CONFIG, DEFAULTS);
        isEnabled = true;
        saveState();
        setEnabled(true);
        updateUI();
    }
    const processedSources = new WeakSet();
    const activeChains = new Map();

    const PANEL_ID = '__vEqPanel';
    const BTN_ID = '__vEqBtn';
    let agcIntervalId = null;
    let ui = null;

    const MAX_CHAINS = 8;

    function applyAGC(video) {
        if (!video || typeof video !== 'object' || processedSources.has(video)) return;
        if (activeChains.size >= MAX_CHAINS) return;

        let audioContext;
        try {
            if (window._volumeEqualizerContext && window._volumeEqualizerContext.state === 'suspended') {
                audioContext = window._volumeEqualizerContext;
                audioContext.resume().catch(e => console.warn('AGC: 恢复音频上下文失败', e));
            } else if (window._volumeEqualizerContext && window._volumeEqualizerContext.state === 'running') {
                audioContext = window._volumeEqualizerContext;
            } else {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                window._volumeEqualizerContext = audioContext;
            }
        } catch (e) {
            console.warn('AGC: 创建AudioContext失败', e);
            return;
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume().catch(e => console.warn('AGC: 恢复音频上下文失败', e));
        }

        let source;
        try {
            source = audioContext.createMediaElementSource(video);
        } catch (e) {
            if (!processedSources.has(video)) {
                const retry = () => applyAGC(video);
                video.addEventListener('loadedmetadata', retry, { once: true });
                video.addEventListener('canplay', retry, { once: true });
            }
            return;
        }

        const shelf = audioContext.createIIRFilter(
            [1.53512485958697, -2.69169618940638, 1.19839281085285],
            [1.0, -1.69065929318241, 0.73248077421585]
        );
        const hp = audioContext.createIIRFilter(
            [1.0, -2.0, 1.0],
            [1.0, -1.99004745483398, 0.99007225036621]
        );

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;

        source.connect(shelf);
        shelf.connect(hp);
        hp.connect(analyser);
        analyser.connect(audioContext.destination);

        processedSources.add(video);

        const chain = {
            source, analyser, audioContext, video,
            state: 'measuring',
            gainNode: null, currentGain: 0, smoothedDb: CONFIG.initLevel
        };
        activeChains.set(video, chain);

        video.addEventListener('emptied', () => {
            const c = activeChains.get(video);
            if (c) {
                c.state = 'measuring';
                c.currentGain = 0;
                c.smoothedDb = CONFIG.initLevel;
                if (c.gainNode) {
                    try { c.gainNode.disconnect(); } catch (e) {}
                    c.gainNode = null;
                    try { c.analyser.disconnect(); } catch (e) {}
                    c.analyser.connect(audioContext.destination);
                }
            }
        });

        console.log('AGC: 已对视频应用自动增益控制', video);
        updateUI();
    }

    function setEnabled(enabled) {
        isEnabled = enabled;
        saveState();
        for (const [, chain] of activeChains) {
            if (!chain.gainNode) continue;
            try {
                chain.analyser.disconnect();
                if (enabled) {
                    chain.analyser.connect(chain.gainNode);
                    chain.gainNode.connect(chain.audioContext.destination);
                } else {
                    chain.analyser.connect(chain.audioContext.destination);
                    chain.gainNode.gain.value = 1;
                }
            } catch (e) {
                console.warn('AGC: 切换状态失败', e);
            }
        }
        updateUI();
    }

    function setConfig(key, value) {
        CONFIG[key] = value;
        saveState();
        updateUI();
    }

    const AUDIO_THRESHOLD = -45;

    function promoteChain(chain) {
        chain.state = 'active';
        const gn = chain.audioContext.createGain();
        gn.gain.value = Math.pow(10, chain.currentGain / 20);
        chain.gainNode = gn;
        try { chain.analyser.disconnect(); } catch (e) {}
        chain.analyser.connect(gn);
        gn.connect(chain.audioContext.destination);
        updateUI();
    }

    function agcLoop() {
        const chains = [...activeChains.values()];
        if (chains.length === 0) return;
        const dt = 0.05;
        for (const chain of chains) {
            try {
                if (chain.audioContext.state !== 'running') continue;

                const data = new Float32Array(chain.analyser.fftSize);
                chain.analyser.getFloatTimeDomainData(data);
                let sumSq = 0;
                for (let i = 0; i < data.length; i++) sumSq += data[i] * data[i];
                const rms = Math.sqrt(sumSq / data.length);
                const instantDb = 20 * Math.log10(Math.max(rms, 1e-10));

                if (chain.state === 'measuring') {
                    if (!isEnabled) continue;
                    if (instantDb > AUDIO_THRESHOLD) promoteChain(chain);
                    continue;
                }

                const outputDb = instantDb + chain.currentGain;
                const levelWeight = Math.pow(CONFIG.levelSteep, outputDb - CONFIG.levelBase);

                if (levelWeight > 1e-6) {
                    const rmsCoeff = 1 - Math.exp(-dt / CONFIG.rmsWindow);
                    const step = Math.min(levelWeight * rmsCoeff, 1);
                    chain.smoothedDb += (instantDb - chain.smoothedDb) * step;
                }

                let desiredDb = CONFIG.targetLevel - chain.smoothedDb;
                desiredDb = Math.max(CONFIG.minGain, Math.min(CONFIG.maxGain, desiredDb));

                const error = Math.abs(desiredDb - chain.currentGain);
                const tau = Math.max(CONFIG.tauBase * Math.exp(-CONFIG.tauSteep * error), 0.01);
                const coeff = 1 - Math.exp(-dt / tau);
                chain.currentGain += (desiredDb - chain.currentGain) * coeff;

                if (isEnabled && chain.gainNode) {
                    chain.gainNode.gain.value = Math.pow(10, (chain.currentGain + CONFIG.gainBias) / 20);
                }
            } catch (e) { /* skip this chain */ }
        }
        updateMeters();
    }

    function processAllVideos() {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            if (!processedSources.has(video)) applyAGC(video);
        });
    }

    function setupObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeName === 'VIDEO') {
                        applyAGC(node);
                    } else if (node.nodeName === 'DIV' || node.nodeType === 1) {
                        const videos = node.querySelectorAll('video');
                        videos.forEach(video => applyAGC(video));
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // --- UI ---

    function createFloatingUI() {
        if (document.getElementById(PANEL_ID)) return;

        const btn = document.createElement('div');
        btn.id = BTN_ID;
        document.body.appendChild(btn);

        let dragY = null, dragBias = 0, dragged = false;
        btn.addEventListener('mousedown', e => {
            dragY = e.clientY;
            dragBias = CONFIG.gainBias;
            dragged = false;
            e.preventDefault();
        });
        document.addEventListener('mousemove', e => {
            if (dragY === null) return;
            const dy = dragY - e.clientY;
            if (Math.abs(dy) > 2) dragged = true;
            const raw = Math.max(-12, Math.min(12, dragBias + dy * 0.2));
            CONFIG.gainBias = Math.round(raw * 10) / 10;
            const gainDb = activeChains.size > 0 ? [...activeChains.values()][0].currentGain : 0;
            btn.textContent = `${(gainDb + CONFIG.gainBias) >= 0 ? '+' : ''}${(gainDb + CONFIG.gainBias).toFixed(1)} dB`;
        });
        document.addEventListener('mouseup', e => {
            if (dragY === null) return;
            dragY = null;
            if (dragged) {
                setConfig('gainBias', CONFIG.gainBias);
            } else {
                togglePanel();
            }
        });

        const panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.innerHTML = buildPanelHTML();
        document.body.appendChild(panel);

        ui = {
            btn,
            panel,
            header: panel.querySelector('#__vEqHeader'),
            count: panel.querySelector('#__vEqCount'),
            toggle: panel.querySelector('#__vEqToggle'),
            toggleSlider: panel.querySelector('#__vEqSlider'),
            toggleKnob: panel.querySelector('#__vEqSlider span'),
            status: panel.querySelector('#__vEqStatus'),
            avgBar: panel.querySelector('#__vEqAvgBar'),
            avgLbl: panel.querySelector('#__vEqAvgDb'),
            gainBar: panel.querySelector('#__vEqGainBar'),
            gainLbl: panel.querySelector('#__vEqGainDb'),
            reset: panel.querySelector('#__vEqReset'),
            close: panel.querySelector('#__vEqClose'),
            canvasL: panel.querySelector('#__vEqCanvasL'),
            canvasT: panel.querySelector('#__vEqCanvasT'),
        };

        makeDraggable(panel);
        attachPanelEvents(panel);
    }

    function buildPanelHTML() {
        const active = activeChains.size;
        const groups = [
            { title: '响度规格', items: [
                { key: 'targetLevel', label: '目标响度', unit: 'LKFS', min: -30, max: -10, step: 0.5 },
                { key: 'maxGain', label: '最大增益', unit: 'dB', min: 0, max: 30, step: 1 },
                { key: 'minGain', label: '最小增益', unit: 'dB', min: -30, max: 0, step: 1 },
                { key: 'gainBias', label: '增益偏置', unit: 'dB', min: -12, max: 12, step: 0.5 }
            ]},
            { title: '响度测算', canvas: '__vEqCanvasL', items: [
                { key: 'rmsWindow', label: '测算时间', unit: 's', min: 0.2, max: 5, step: 0.2 },
                { key: 'levelBase', label: '电平基准', unit: 'LKFS', min: -60, max: 0, step: 1 },
                { key: 'levelSteep', label: '权重基数', unit: '', min: 1.01, max: 1.3, step: 0.01 }
            ]},
            { title: '增益执行', canvas: '__vEqCanvasT', items: [
                { key: 'tauBase', label: '执行时间', unit: 's', min: 10, max: 120, step: 5 },
                { key: 'tauSteep', label: '误差陡度', unit: '', min: 0.1, max: 2, step: 0.05 }
            ]},
            { title: '高级选项', items: [
                { key: 'initLevel', label: '初始响度', unit: 'LKFS', min: -30, max: -10, step: 1 }
            ]}
        ];

        let sliders = groups.map(g => {
            const title = `<div class="__vEq-group-title">${g.title}</div>`;
            const canvas = g.canvas ? `<canvas id="${g.canvas}" class="__vEq-canvas" width="268" height="70"></canvas>` : '';
            const rows = g.items.map(p => {
                const val = CONFIG[p.key];
                return `
                <div class="__vEq-slider-row">
                    <div class="__vEq-slider-label">
                        <span>${p.label}</span>
                        <span id="__vEqVal_${p.key}">${val}${p.unit}</span>
                    </div>
                    <input type="range" id="__vEqRange_${p.key}" class="__vEq-slider"
                        data-key="${p.key}" data-unit="${p.unit}"
                        min="${p.min}" max="${p.max}" step="${p.step}" value="${val}">
                </div>`;
            }).join('');
            return title + canvas + rows;
        }).join('');

        return `
            <div id="__vEqHeader" class="__vEq-header">
                <span style="font-weight:bold;font-size:15px">\u{1F50A} AGC \u{97F3}\u{91CF}\u{5F52}\u{4E00}\u{5316}</span>
                <div class="__vEq-header-actions">
                    <span id="__vEqCount" style="font-size:12px;color:var(--agc-muted)">${active} \u{4E2A}\u{89C6}\u{9891}</span>
                    <span id="__vEqReset" class="__vEq-header-btn" style="font-size:14px" title="\u{91CD}\u{7F6E}\u{9ED8}\u{8BA4}">\u{21BA}</span>
                    <span id="__vEqClose" class="__vEq-header-btn" style="font-size:18px">&times;</span>
                </div>
            </div>
            <div class="__vEq-card __vEq-toggle-row" style="margin-top:10px">
                <span style="font-size:13px">\u{5F00}\u{542F}\u{5747}\u{8861}</span>
                <label class="__vEq-toggle">
                    <input type="checkbox" id="__vEqToggle" ${isEnabled ? 'checked' : ''} class="__vEq-toggle-input">
                    <span id="__vEqSlider" class="__vEq-toggle-track" style="background:${isEnabled ? 'var(--agc-accent)' : 'var(--agc-bar-bg)'}">
                        <span class="__vEq-toggle-knob" style="left:${isEnabled ? '20px' : '2px'}"></span>
                    </span>
                </label>
                <span id="__vEqStatus" style="font-size:12px;color:${isEnabled ? 'var(--agc-green)' : 'var(--agc-red)'}">${isEnabled ? '\u{5DF2}\u{542F}\u{7528}' : '\u{5DF2}\u{7981}\u{7528}'}</span>
            </div>
            <div class="__vEq-card">
                <div class="__vEq-meter-row">
                    <span>\u{5E73}\u{5747}\u{54CD}\u{5EA6}</span>
                    <span id="__vEqAvgDb">-\u221E LKFS</span>
                </div>
                <div class="__vEq-bar">
                    <div id="__vEqAvgBar" class="__vEq-bar-f" style="width:0%;background:var(--agc-blue)"></div>
                </div>
            </div>
            <div class="__vEq-card">
                <div class="__vEq-meter-row">
                    <span>\u{5F53}\u{524D}\u{589E}\u{76CA}</span>
                    <span id="__vEqGainDb">+0.0 dB</span>
                </div>
                <div class="__vEq-bar">
                    <div id="__vEqGainBar" class="__vEq-bar-f" style="width:50%;background:var(--agc-amber)"></div>
                </div>
            </div>
            <div class="__vEq-sliders">
                ${sliders}
            </div>
            <div class="__vEq-footer">
                \u{53C2}\u{6570}\u{5B9E}\u{65F6}\u{751F}\u{6548} \u{B7} \u{62D6}\u{52A8}\u{6807}\u{9898}\u{680F}\u{79FB}\u{52A8}\u{9762}\u{677F}
            </div>`;
    }

    function togglePanel() {
        if (!ui) return;
        const show = ui.panel.style.display === 'none';
        ui.panel.style.display = show ? 'block' : 'none';
        ui.btn.classList.toggle('--muted', show);
        if (show) updateUI();
    }

    function updateMeters() {
        const chains = [...activeChains.values()];
        const chain = chains[0];
        if (!chain || !ui) return;

        const avgDb = chain.smoothedDb;
        const gainDb = chain.currentGain;

        const aPct = Math.max(0, Math.min((avgDb + 45) / 45 * 100, 100));
        ui.avgBar.style.width = aPct + '%';
        ui.avgLbl.textContent = avgDb > -70 ? `${avgDb.toFixed(1)} LKFS` : '-\u221E LKFS';

        const total = CONFIG.maxGain - CONFIG.minGain || 1;
        const gPct = ((gainDb - CONFIG.minGain) / total) * 100;
        ui.gainBar.style.width = Math.max(0, Math.min(gPct, 100)) + '%';
        ui.gainLbl.textContent = `${gainDb >= 0 ? '+' : ''}${gainDb.toFixed(1)} dB`;

        ui.btn.textContent = `${(gainDb + CONFIG.gainBias) >= 0 ? '+' : ''}${(gainDb + CONFIG.gainBias).toFixed(1)} dB`;
        drawCurves(gainDb);
    }

    function drawCurves(curGain) {
        if (!ui || ui.panel.style.display === 'none') return;
        const cs = getComputedStyle(ui.panel);
        const blue = cs.getPropertyValue('--agc-blue').trim();
        const amber = cs.getPropertyValue('--agc-amber').trim();
        const text = cs.getPropertyValue('--agc-text').trim();
        const muted = cs.getPropertyValue('--agc-muted').trim();
        const tick = cs.getPropertyValue('--agc-bar-bg').trim();
        const green = cs.getPropertyValue('--agc-green').trim();

        const chain = [...activeChains.values()][0];
        if (!chain) return;

        const curErr = Math.abs(CONFIG.targetLevel - chain.smoothedDb - chain.currentGain);

        // --- Canvas 1: Level → Weight ---
        const c1 = ui.canvasL;
        if (!c1) return;
        const ctx1 = c1.getContext('2d');
        const W = c1.width, H = c1.height, P = 8;
        ctx1.clearRect(0, 0, W, H);

        // Axes
        ctx1.strokeStyle = tick; ctx1.lineWidth = 0.5;
        ctx1.beginPath(); ctx1.moveTo(P, H-P); ctx1.lineTo(W-P, H-P); ctx1.stroke();
        ctx1.beginPath(); ctx1.moveTo(P, P); ctx1.lineTo(P, H-P); ctx1.stroke();

        // Labels
        ctx1.fillStyle = muted; ctx1.font = '8px sans-serif';
        ctx1.fillText('-50', P, H-P-2);
        ctx1.fillText('0 LKFS', W-P-28, H-P-2);
        ctx1.fillText('steep^(x-base)', P+4, P+8);

        // Curve
        const pmax = CONFIG.maxGain - CONFIG.minGain;
        ctx1.beginPath(); ctx1.strokeStyle = blue; ctx1.lineWidth = 1;
        let first = true;
        for (let px = 0; px <= 1; px += 0.005) {
            const x = -50 + px * 50;
            const w = Math.pow(CONFIG.levelSteep, x - CONFIG.levelBase);
            const sx = P + px * (W - 2*P);
            // Scale Y so that weight=pmax maps to top
            const sy = H - P - Math.min(w / pmax, 1) * (H - 2*P);
            if (first) { ctx1.moveTo(sx, sy); first = false; }
            else ctx1.lineTo(sx, sy);
        }
        ctx1.stroke();

        // Current point
        if (chain.state === 'active') {
            const outDb = chain.smoothedDb + curGain;
            const curW = Math.pow(CONFIG.levelSteep, outDb - CONFIG.levelBase);
            const cx = P + ((outDb + 50) / 50) * (W - 2*P);
            const cy = H - P - Math.min(curW / pmax, 1) * (H - 2*P);
            ctx1.fillStyle = green; ctx1.beginPath(); ctx1.arc(cx, cy, 3, 0, Math.PI*2); ctx1.fill();
        }

        // --- Canvas 2: Error → τ ---
        const c2 = ui.canvasT, ctx2 = c2.getContext('2d');
        ctx2.clearRect(0, 0, W, H);

        ctx2.strokeStyle = tick; ctx2.lineWidth = 0.5;
        ctx2.beginPath(); ctx2.moveTo(P, H-P); ctx2.lineTo(W-P, H-P); ctx2.stroke();
        ctx2.beginPath(); ctx2.moveTo(P, P); ctx2.lineTo(P, H-P); ctx2.stroke();

        ctx2.fillStyle = muted; ctx2.font = '8px sans-serif';
        ctx2.fillText('0 dB', P, H-P-2);
        const maxErr = Math.max(CONFIG.maxGain, Math.abs(CONFIG.minGain)) * 1.5;
        ctx2.fillText(`${maxErr.toFixed(0)} dB`, W-P-16, H-P-2);
        ctx2.fillText(`${CONFIG.tauBase.toFixed(0)}s`, P+4, P+8);

        // Curve
        ctx2.beginPath(); ctx2.strokeStyle = amber; ctx2.lineWidth = 1;
        first = true;
        for (let px = 0; px <= 1; px += 0.005) {
            const e = px * maxErr;
            const tau = Math.max(CONFIG.tauBase * Math.exp(-CONFIG.tauSteep * e), 0.01);
            const sx = P + px * (W - 2*P);
            const sy = H - P - (tau / CONFIG.tauBase) * (H - 2*P);
            if (first) { ctx2.moveTo(sx, sy); first = false; }
            else ctx2.lineTo(sx, sy);
        }
        ctx2.stroke();

        // Current point
        if (chain.state === 'active') {
            const cx = P + (curErr / maxErr) * (W - 2*P);
            const ctau = Math.max(CONFIG.tauBase * Math.exp(-CONFIG.tauSteep * curErr), 0.01);
            const cy = H - P - (ctau / CONFIG.tauBase) * (H - 2*P);
            ctx2.fillStyle = green; ctx2.beginPath(); ctx2.arc(cx, cy, 3, 0, Math.PI*2); ctx2.fill();
        }
    }

    function updateUI() {
        if (!ui) return;
        const activeCount = [...activeChains.values()].filter(c => c.state === 'active').length;
        ui.count.textContent = `${activeCount}/${activeChains.size} 个视频`;
        ui.toggle.checked = isEnabled;
        ui.toggleSlider.style.background = isEnabled ? 'var(--agc-accent)' : 'var(--agc-bar-bg)';
        ui.toggleKnob.style.left = isEnabled ? '20px' : '2px';
        ui.status.textContent = isEnabled ? '已启用' : '已禁用';
        ui.status.style.color = isEnabled ? 'var(--agc-green)' : 'var(--agc-red)';

        ['targetLevel', 'maxGain', 'minGain', 'gainBias', 'rmsWindow', 'levelBase', 'levelSteep', 'tauBase', 'tauSteep', 'initLevel'].forEach(key => {
            const valEl = document.getElementById(`__vEqVal_${key}`);
            const range = document.getElementById(`__vEqRange_${key}`);
            if (valEl && range) {
                range.value = CONFIG[key];
                valEl.textContent = `${CONFIG[key]}${range.dataset.unit || ''}`;
            }
        });

        if (ui.btn) ui.btn.style.display = activeCount > 0 ? 'flex' : 'none';
    }

    function attachPanelEvents(panel) {
        panel.addEventListener('change', e => {
            const t = e.target;
            if (t.id && t.id.startsWith('__vEqRange_')) {
                setConfig(t.dataset.key, parseFloat(t.value));
            }
        });
        panel.addEventListener('input', e => {
            const t = e.target;
            if (t.id && t.id.startsWith('__vEqRange_')) {
                const el = document.getElementById(`__vEqVal_${t.dataset.key}`);
                if (el) el.textContent = `${t.value}${t.dataset.unit || ''}`;
            }
        });
        ui.toggle.addEventListener('change', e => setEnabled(e.target.checked));
        ui.reset.addEventListener('click', resetConfig);
        ui.close.addEventListener('click', () => {
            ui.panel.style.display = 'none';
            ui.btn.classList.remove('--muted');
        });
    }

    function makeDraggable(panel) {
        if (!ui || !ui.header) return;
        let ox, oy, mx, my, dragging = false;
        const header = ui.header;
        header.addEventListener('mousedown', e => {
            dragging = true;
            ox = e.clientX; oy = e.clientY;
            mx = panel.offsetLeft; my = panel.offsetTop;
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            e.preventDefault();
        });
        function onMove(e) {
            if (!dragging) return;
            panel.style.left = (mx + e.clientX - ox) + 'px';
            panel.style.top = (my + e.clientY - oy) + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        }
        function onUp() {
            dragging = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
    }

    // --- Init ---

    function init() {
        processAllVideos();
        setupObserver();
        createFloatingUI();

        agcIntervalId = setInterval(agcLoop, 50);

        setInterval(() => {
            for (const [video, chain] of activeChains) {
                if (!document.body.contains(video)) {
                    try { chain.analyser.disconnect(); } catch (e) {}
                    activeChains.delete(video);
                }
            }
        }, 5000);

        setInterval(processAllVideos, 2000);
        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                setTimeout(processAllVideos, 500);
            }
        }, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
