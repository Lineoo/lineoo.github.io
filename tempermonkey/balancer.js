// ==UserScript==
// @name         音量均衡器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  AGC 动态音量归一化
// @author       Lineoo
// @match        *://*.bilibili.com/*
// @match        *://*.youtube.com/*
// @match        *://*.iqiyi.com/*
// @match        *://*.youku.com/*
// @match        *://*.curveV.qq.com/*
// @match        *://*.acfun.cn/*
// @match        *://*.mgtv.com/*
// @match        *://*.ixigua.com/*
// @match        *://*.douyin.com/*
// @match        *://*.kuaishou.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const DEFAULTS = {
        enabled: true,
        target: -18,
        curveU: -18,
        curveV: 0.03,
        curveW: 0.2,
    };

    const STORE_KEY = '__agcConfig';
    let CONFIG = Object.assign({}, DEFAULTS);

    function loadConfig() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORE_KEY));
            if (saved && typeof saved === 'object') Object.assign(CONFIG, saved);
        } catch (e) { }
    }

    function saveConfig() {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(CONFIG));
        } catch (e) { }
    }

    loadConfig();

    class AGCBalancer {
        constructor(source, analyser, gain) {
            this.source = source;
            this.analyser = analyser;
            this.gain = gain;
            this.active = false;
            this.current = CONFIG.target;
            this.instant = this.current;
            this.samples = new Float32Array(analyser.fftSize);
        }

        weight(error) {
            const { curveU: u, curveV: v, curveW: w } = CONFIG;
            return 2 * v * Math.exp(w * (error - u)) * (1 - Math.pow(2, -(error * error) / (u * u)));
        }

        process(dt) {
            this.analyser.getFloatTimeDomainData(this.samples);
            let sumSq = 0;
            for (let i = 0; i < this.samples.length; i++) {
                sumSq += this.samples[i] * this.samples[i];
            }

            if (sumSq < 1e-10) { return; }

            const rms = Math.sqrt(sumSq / this.samples.length);
            const instant = 20 * Math.log10(rms);

            this.instant = instant;
            this.active = true;
            ui.btn.style.display = 'flex';

            const error = instant - this.current;
            const step = Math.max(Math.min(this.weight(error) * (1 - Math.exp(-dt)), 1), 0);
            this.current += (instant - this.current) * step;

            this.gain.gain.value = CONFIG.enabled ? Math.pow(10, (CONFIG.target - this.current) / 20) : 1;
        }
    }

    // Chains //

    const MAX_CHAINS = 8;
    const activeChains = new Map();

    function getAudioContext() {
        const ctx = window._agcAudioContext;
        if (ctx && ctx.state !== 'closed') {
            if (ctx.state === 'suspended') ctx.resume().catch(() => { });
            return ctx;
        }
        const fresh = new (window.AudioContext || window.webkitAudioContext)();
        window._agcAudioContext = fresh;
        return fresh;
    }

    function attachToVideo(video) {
        if (!video || activeChains.has(video)) return;
        if (activeChains.size >= MAX_CHAINS) return;

        const ctx = getAudioContext();

        let source;
        try {
            source = ctx.createMediaElementSource(video);
        } catch (e) {
            video.addEventListener('loadedmetadata', () => attachToVideo(video), { once: true });
            video.addEventListener('canplay', () => attachToVideo(video), { once: true });
            return;
        }

        const balancer = buildChain(source, ctx);
        activeChains.set(video, balancer);

        video.addEventListener('emptied', () => {
            const balancer = activeChains.get(video);
            if (!balancer) return;
            balancer.active = false;
            balancer.current = CONFIG.target;
            balancer.instant = balancer.current;
        });

        console.log('AGC: 已捕获视频', video);
    }

    function buildChain(source, ctx) {
        const shelf = ctx.createIIRFilter(
            [1.53512485958697, -2.69169618940638, 1.19839281085285],
            [1.0, -1.69065929318241, 0.73248077421585]
        );
        const highpass = ctx.createIIRFilter(
            [1.0, -2.0, 1.0],
            [1.0, -1.99004745483398, 0.99007225036621]
        );

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;

        const gain = ctx.createGain();
        const balancer = new AGCBalancer(source, analyser, gain);

        source.connect(shelf);
        shelf.connect(highpass);
        highpass.connect(analyser);

        source.connect(gain);
        gain.connect(ctx.destination);

        return balancer;
    }

    // UI //

    const AGC_CSS = `
      :root {
        --agc-bg: #ffffff;
        --agc-color: #1a1a1a;
        --agc-border: #d0d0d0;
        --agc-hover: #f0f0f0;
        --agc-curve: #4a90d9;
        --agc-level: #9acbff;
        --agc-fill: #d6ebff;
        --agc-param: #ffd482;
        --agc-muted: #9494a8;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --agc-bg: #000000;
          --agc-color: #f2f2f2;
          --agc-border: #595959;
          --agc-hover: #1a1a1a;
          --agc-curve: #7aa0d0;
          --agc-level: #1c62ad;
          --agc-fill: #16324f;
          --agc-param: #aa7001;
          --agc-muted: #68687c;
        }
      }
      #__vAGCButton {
        position: fixed;
        z-index: 2147483647;
        right: 20px;
        bottom: 20px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: var(--agc-bg);
        color: var(--agc-color);
        border: 1px solid var(--agc-border);
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: normal;
        font-family: sans-serif;
        user-select: none;
        transition: background .2s;
      }
      #__vAGCButton:hover {
        background: var(--agc-hover);
      }
      #__vAGCPanel {
        display: flex;
        flex-direction: column;
        position: fixed;
        z-index: 2147483647;
        right: 20px;
        bottom: 76px;
        width: 300px;
        background: var(--agc-bg);
        color: var(--agc-color);
        border: 1px solid var(--agc-border);
        border-radius: 12px;
        display: none;
        padding: 16px;
        font: 14px/1.5 sans-serif;
        user-select: none;
      }
      .__vAGCPanelHeader {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--agc-border);
      }
      .__vAGCTitle {
        font-weight: bold;
        font-size: 15px;
      }
      #__vAGCCount {
        font-weight: normal;
        font-size: 10px;
        color: var(--agc-muted);
      }
      .__vAGCActions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .__vAGCActions button {
        background: none;
        color: var(--agc-color);
        border: none;
        border-radius: 50%;
        width: 22px;
        height: 22px;
        font-size: 14px;
        line-height: 1;
        padding: 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background .2s;
      }
      .__vAGCActions button:hover {
        background: var(--agc-hover);
      }
      .__vAGCActions button.off {
        color: var(--agc-muted);
      }
      .__vAGCSlider {
        -webkit-appearance: none;
        appearance: none;
        flex: 1;
        min-width: 0;
        background: transparent;
      }
      .__vAGCSlider::-webkit-slider-runnable-track {
        height: 8px;
        border-radius: 4px;
        background: linear-gradient(to right, var(--agc-level) var(--fill, 50%), var(--agc-hover) var(--fill, 50%));
      }
      .__vAGCSlider::-moz-range-track {
        height: 8px;
        border-radius: 4px;
        background: linear-gradient(to right, var(--agc-level) var(--fill, 50%), var(--agc-hover) var(--fill, 50%));
      }
      .__vAGCSlider.__vAGCCurve::-webkit-slider-runnable-track {
        background: linear-gradient(to right, var(--agc-param) var(--fill, 50%), var(--agc-hover) var(--fill, 50%));
      }
      .__vAGCSlider.__vAGCCurve::-moz-range-track {
        background: linear-gradient(to right, var(--agc-param) var(--fill, 50%), var(--agc-hover) var(--fill, 50%));
      }
      .__vAGCSlider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 8px;
        margin-top: -5px;
        border-radius: 4px;
        background: var(--agc-color);
        border: none;
        cursor: pointer;
        transition: background .2s;
      }
      .__vAGCSlider::-moz-range-thumb {
        width: 18px;
        height: 8px;
        border-radius: 4px;
        background: var(--agc-color);
        border: none;
        cursor: pointer;
        transition: background .2s;
      }
      .__vAGCSlider::-webkit-slider-thumb:hover {
        background: var(--agc-muted);
      }
      .__vAGCSlider::-moz-range-thumb:hover {
        background: var(--agc-muted);
      }
      .__vAGCCanvas {
        display: block;
        width: 100%;
        margin-top: 12px;
        border-radius: 6px;
        border: 1px solid var(--agc-border);
      }
      .__vAGCWeight {
        aspect-ratio: 16 / 9;
      }
      .__vAGCLoudness {
        aspect-ratio: 16 / 4;
      }
      .__vAGCRow {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 12px;
      }
      .__vAGCRow + .__vAGCRow {
        margin-top: 4px;
      }
      .__vAGCLabel {
        flex: 0 0 auto;
        min-width: 48px;
        text-align: right;
        font-size: 12px;
        color: var(--agc-muted);
      }
    `;

    const AGC_HTML = `
      <div id="__vAGCButton">AGC</div>
      <div id="__vAGCPanel">
        <div class="__vAGCPanelHeader">
          <span class="__vAGCTitle">音量平衡 <span id="__vAGCCount"></span></span>
          <span class="__vAGCActions">
            <button id="__vAGCGain" title="开关">⏻</button>
            <button id="__vAGCReset" title="重置">↺</button>
            <button id="__vAGCClose" title="关闭">×</button>
          </span>
        </div>
        <canvas id="__vAGCWeight" class="__vAGCCanvas __vAGCWeight"></canvas>
        <canvas id="__vAGCLoudness" class="__vAGCCanvas __vAGCLoudness"></canvas>
        <div class="__vAGCRow"><span class="__vAGCLabel">目标</span><input type="range" id="__vAGCLevel" class="__vAGCSlider" data-key="target" min="-30" max="-10" step="0.001"></div>
        <div class="__vAGCRow"><span class="__vAGCLabel">曲线 U</span><input type="range" id="__vAGCCurveU" class="__vAGCSlider __vAGCCurve" data-key="curveU" min="-40" max="-1" step="0.001"></div>
        <div class="__vAGCRow"><span class="__vAGCLabel">曲线 V</span><input type="range" id="__vAGCCurveV" class="__vAGCSlider __vAGCCurve" data-key="curveV" min="0.001" max="0.1" step="0.001"></div>
        <div class="__vAGCRow"><span class="__vAGCLabel">指数</span><input type="range" id="__vAGCCurveW" class="__vAGCSlider __vAGCCurve" data-key="curveW" min="0.05" max="0.3" step="0.001"></div>
      </div>
    `;

    let ui = null;

    function createUI() {
        if (ui) return;

        const style = document.createElement('style');
        style.textContent = AGC_CSS;
        document.head.appendChild(style);

        const container = document.createElement('div');
        container.innerHTML = AGC_HTML;
        document.body.appendChild(container);

        ui = {
            btn: document.getElementById('__vAGCButton'),
            panel: document.getElementById('__vAGCPanel'),
            weight: document.getElementById('__vAGCWeight'),
            loudness: document.getElementById('__vAGCLoudness'),
            count: document.getElementById('__vAGCCount'),
            gain: document.getElementById('__vAGCGain'),
            level: document.getElementById('__vAGCLevel'),
            curveU: document.getElementById('__vAGCCurveU'),
            curveV: document.getElementById('__vAGCCurveV'),
            curveW: document.getElementById('__vAGCCurveW'),
            close: document.getElementById('__vAGCClose'),
            reset: document.getElementById('__vAGCReset'),
        };

        ui.gain.addEventListener('click', () => {
            CONFIG.enabled = !CONFIG.enabled;
            ui.gain.classList.toggle('off', !CONFIG.enabled);
            saveConfig();
        });

        function wireParamSlider(input, key) {
            input.value = CONFIG[input.dataset.key];
            const updateFill = () => {
                const pct = (input.value - input.min) / (input.max - input.min) * 100;
                input.style.setProperty('--fill', pct + '%');
            };
            input.addEventListener('input', () => {
                CONFIG[input.dataset.key] = parseFloat(input.value);
                updateFill();
                drawCharts();
            });
            input.addEventListener('change', () => {
                updateFill();
                saveConfig();
            });
            updateFill();
        }

        wireParamSlider(ui.level);
        wireParamSlider(ui.curveU);
        wireParamSlider(ui.curveV);
        wireParamSlider(ui.curveW);

        ui.btn.addEventListener('click', () => {
            const show = ui.panel.style.display !== 'flex';
            ui.panel.style.display = show ? 'flex' : 'none';
            if (show) drawCharts();
        });

        ui.close.addEventListener('click', () => {
            ui.panel.style.display = 'none';
        });

        ui.reset.addEventListener('click', () => {
            Object.assign(CONFIG, DEFAULTS);
            ui.gain.classList.toggle('off', !CONFIG.enabled);
            for (const input of [ui.level, ui.curveU, ui.curveV, ui.curveW]) {
                input.value = CONFIG[input.dataset.key];
                const pct = (input.value - input.min) / (input.max - input.min) * 100;
                input.style.setProperty('--fill', pct + '%');
            }
            saveConfig();
            drawCharts();
        });
    }

    function prepareCanvas(canvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return null;
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);
        return { ctx, width: rect.width, height: rect.height };
    }

    function drawCharts() {
        const balancer = [...activeChains.values()].find(b => b.active);
        if (!balancer) return;
        drawWeightChart(balancer);
        drawLoudnessChart(balancer);
    }

    function drawWeightChart(balancer) {
        const view = prepareCanvas(ui.weight);
        if (!view) return;
        const { ctx, width, height } = view;

        const wPadding = 10, hPadding = 20;
        const limXMin = -25, limXMax = 25;
        const limYMin = 0, limYMax = 0.1;

        const axisXMin = wPadding, axisXMax = width - wPadding;
        const axisYMin = height - hPadding, axisYMax = hPadding;
        const axisXLen = axisXMax - axisXMin, axisYLen = axisYMin - axisYMax;

        const toX = err => axisXMin + ((err - limXMin) / (limXMax - limXMin)) * axisXLen;
        const toY = w => axisYMin - ((w - limYMin) / (limYMax - limYMin)) * axisYLen;
        const curveY = y => Math.max(axisYMax - height, Math.min(axisYMin + height, y));
        const pointY = y => Math.max(axisYMax, Math.min(axisYMin, y));

        const cs = getComputedStyle(document.documentElement);
        const color = name => cs.getPropertyValue(name).trim();
        const border = color('--agc-border');
        const muted = color('--agc-muted');
        const curve = color('--agc-curve');
        const fill = color('--agc-fill');

        // axis
        ctx.strokeStyle = border;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(axisXMin, axisYMin); ctx.lineTo(axisXMax, axisYMin); ctx.stroke();

        // x axis labels (boundaries only)
        ctx.fillStyle = muted;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'start';
        ctx.fillText(limXMin.toFixed(1), axisXMin + 2, axisYMin + 12);
        ctx.textAlign = 'end';
        ctx.fillText(limXMax.toFixed(1), axisXMax - 2, axisYMin + 12);

        // zero reference
        ctx.strokeStyle = border;
        ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(toX(0), axisYMax); ctx.lineTo(toX(0), axisYMin); ctx.stroke();
        ctx.setLineDash([]);

        const err = balancer.instant - balancer.current;
        const py = pointY(toY(balancer.weight(err)));
        const limXNum = 200;

        // instantaneous coverage (center to current error)
        const fillTo = Math.max(limXMin, Math.min(limXMax, err));
        if (fillTo !== 0) {
            ctx.beginPath();
            ctx.moveTo(toX(0), axisYMin);
            for (let i = 0; i <= limXNum; i++) {
                const e = fillTo * i / limXNum;
                ctx.lineTo(toX(e), curveY(toY(balancer.weight(e))));
            }
            ctx.lineTo(toX(fillTo), axisYMin);
            ctx.closePath();
            ctx.fillStyle = fill;
            ctx.fill();
        }

        // weight curve
        ctx.beginPath();
        ctx.strokeStyle = curve;
        ctx.lineWidth = 1;
        for (let i = 0; i <= limXNum; i++) {
            const e = limXMin + (limXMax - limXMin) * i / limXNum;
            const x = toX(e), y = curveY(toY(balancer.weight(e)));
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

        // curve reference point (curveU, v)
        ctx.fillStyle = curve;
        ctx.beginPath(); ctx.arc(toX(CONFIG.curveU), pointY(toY(balancer.weight(CONFIG.curveU))), 2.5, 0, Math.PI * 2); ctx.fill();

        // axis unit
        ctx.fillStyle = muted;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'start';
        ctx.fillText('dB', axisXMin + 2, axisYMax + 9);

        // correction time reference (right edge)
        ctx.fillStyle = muted;
        ctx.textAlign = 'end';
        for (const w of [0.1, 0.05, 0.01]) {
            ctx.fillText(`${Math.round(1 / w)} s`, axisXMax - 2, pointY(toY(w)) - 5);
        }

        // instantaneous correction time (right edge)
        const tau = Math.round(1 / Math.max(balancer.weight(err), 1e-6));
        ctx.fillStyle = curve;
        ctx.textAlign = 'end';
        ctx.fillText(tau > 360 ? '- s' : `${tau} s`, axisXMax - 2, py - 5);
    }

    function drawLoudnessChart(balancer) {
        const view = prepareCanvas(ui.loudness);
        if (!view) return;
        const { ctx, width, height } = view;

        const wPadding = 10, hPadding = 16;
        const span = 12;
        const limXMid = CONFIG.enabled ? CONFIG.target : balancer.current;
        const limXMin = limXMid - span, limXMax = limXMid + span;

        const axisXMin = wPadding, axisXMax = width - wPadding;
        const axisYMin = height - hPadding, axisYMax = hPadding;
        const axisXLen = axisXMax - axisXMin;

        const toX = loud => axisXMin + ((loud - limXMin) / (limXMax - limXMin)) * axisXLen;
        const clampX = x => Math.max(axisXMin, Math.min(axisXMax, x));

        const cs = getComputedStyle(document.documentElement);
        const color = name => cs.getPropertyValue(name).trim();
        const border = color('--agc-border');
        const muted = color('--agc-muted');
        const targetColor = CONFIG.enabled ? color('--agc-curve') : border;
        const currentColor = CONFIG.enabled ? border : color('--agc-curve');

        // axis
        ctx.strokeStyle = border;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(axisXMin, axisYMin); ctx.lineTo(axisXMax, axisYMin); ctx.stroke();

        // x axis labels (boundaries only)
        ctx.fillStyle = muted;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'start';
        ctx.fillText(limXMin.toFixed(1), axisXMin + 2, axisYMin + 12);
        ctx.textAlign = 'end';
        ctx.fillText(limXMax.toFixed(1), axisXMax - 2, axisYMin + 12);

        ctx.textAlign = 'start';
        ctx.fillText('LUFS', axisXMin + 2, axisYMax + 9);

        // target loudness
        const targetX = clampX(toX(CONFIG.target));
        ctx.strokeStyle = targetColor;
        ctx.beginPath(); ctx.moveTo(targetX, axisYMax); ctx.lineTo(targetX, axisYMin); ctx.stroke();

        // measured loudness
        const currentX = clampX(toX(balancer.current));
        ctx.strokeStyle = currentColor;
        ctx.beginPath(); ctx.moveTo(currentX, axisYMax); ctx.lineTo(currentX, axisYMin); ctx.stroke();

        // labels on the outer sides to avoid overlap
        const targetLeft = targetX <= currentX;
        const labelY = axisYMin - 4;
        const margin = 58;
        ctx.font = '10px sans-serif';

        ctx.fillStyle = targetColor;
        ctx.textAlign = targetLeft ? 'end' : 'start';
        ctx.fillText(`${CONFIG.target.toFixed(1)} LUFS`, targetLeft ? targetX - 4 : targetX + 4, labelY);

        const currentAlign = targetLeft ? 'start' : 'end';
        let currentLabelX = targetLeft ? currentX + 4 : currentX - 4;
        currentLabelX = currentAlign === 'end' ? Math.max(currentLabelX, margin) : Math.min(currentLabelX, width - margin);
        ctx.fillStyle = currentColor;
        ctx.textAlign = currentAlign;
        ctx.fillText(`${balancer.current.toFixed(1)} LUFS`, currentLabelX, labelY);
    }

    function updatePanelContent() {
        const total = activeChains.size;
        const active = [...activeChains.values()].filter(b => b.active).length;
        ui.count.textContent = `  活动 ${active} | 全部 ${total}`;
    }

    function updateButtonContent() {
        const balancer = [...activeChains.values()].find(b => b.active);
        if (!balancer) return;

        const gain = CONFIG.target - balancer.current;
        ui.btn.textContent = `${gain >= 0 ? '+' : ''}${gain.toFixed(1)} db`;
    }

    // Init //

    const UI_REDRAW_INTERVAL = 0.05;
    const CHAIN_LOOP_INTERVAL = 0.05;
    const SCAN_VIDEOS_INTERVAL = 5;

    function init() {
        createUI();
        scanVideos();
        setInterval(scanVideos, SCAN_VIDEOS_INTERVAL * 1000);
        setInterval(chainLoop, CHAIN_LOOP_INTERVAL * 1000);
        setInterval(uiRedraw, UI_REDRAW_INTERVAL * 1000);
    }

    function scanVideos() {
        document.querySelectorAll('video').forEach(attachToVideo);
    }

    function chainLoop() {
        for (const [video, balancer] of activeChains) {
            if (!document.body.contains(video)) {
                try { balancer.analyser.disconnect(); } catch (e) { }
                activeChains.delete(video);
            }

            try {
                if (window._agcAudioContext.state !== 'running') continue;
                balancer.process(CHAIN_LOOP_INTERVAL);
            } catch (e) { }
        }
    }

    function uiRedraw() {
        if (!ui) return;
        updateButtonContent()
        if (ui.panel.style.display !== 'flex') return;
        drawCharts()
        updatePanelContent()
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
