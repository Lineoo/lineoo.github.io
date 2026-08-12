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
        width: 100%;
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
        aspect-ratio: 16 / 9;
        margin-top: 12px;
        border-radius: 6px;
        border: 1px solid var(--agc-border);
      }
      .__vAGCSlider {
        margin-top: 12px;
      }
      .__vAGCSlider + .__vAGCSlider {
        margin-top: 4px;
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
        <canvas id="__vAGCCanvas" class="__vAGCCanvas"></canvas>
        <input type="range" id="__vAGCLevel" class="__vAGCSlider" data-key="target" min="-30" max="-10" step="0.001">
        <input type="range" id="__vAGCCurveU" class="__vAGCSlider __vAGCCurve" data-key="curveU" min="-40" max="-1" step="0.001">
        <input type="range" id="__vAGCCurveV" class="__vAGCSlider __vAGCCurve" data-key="curveV" min="0.001" max="0.1" step="0.001">
        <input type="range" id="__vAGCCurveW" class="__vAGCSlider __vAGCCurve" data-key="curveW" min="0.05" max="0.3" step="0.001">
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
            canvas: document.getElementById('__vAGCCanvas'),
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
                drawCurve();
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
            if (show) drawCurve();
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
            drawCurve();
        });
    }

    function drawCurve() {
        const canvas = ui.canvas;

        const balancer = [...activeChains.values()].find(b => b.active);
        if (!balancer) return;

        const dpr = window.devicePixelRatio || 1;
        const cssRect = canvas.getBoundingClientRect();
        if (cssRect.width <= 0 || cssRect.height <= 0) return;
        canvas.width = Math.floor(cssRect.width * dpr);
        canvas.height = Math.floor(cssRect.height * dpr);

        const width = cssRect.width, height = cssRect.height;
        const wPadding = 10, hPadding = 20;

        const limXNum = 200;
        const limXMid = CONFIG.enabled ? CONFIG.target : balancer.current;
        const limXMin = limXMid - 30, limXMax = limXMid + 20;

        const limYMin = 0, limYMax = 0.1;

        const axisXLen = width - 2 * wPadding, axisXMin = wPadding, axisXMax = width - wPadding;
        const axisYLen = height - 2 * hPadding, axisYMin = height - hPadding, axisYMax = hPadding;

        const cs = getComputedStyle(document.documentElement);
        const color = name => cs.getPropertyValue(name).trim();
        const toX = loud => axisXMin + ((loud - limXMin) / (limXMax - limXMin)) * axisXLen;
        const toY = weight => axisYMin - ((weight - limYMin) / (limYMax - limYMin)) * axisYLen;

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        drawAxis(color('--agc-border'));
        if (CONFIG.enabled) {
            drawOrigin(color('--agc-border'));
            drawBalanced(color('--agc-curve'));
        } else {
            drawBalanced(color('--agc-border'));
            drawOrigin(color('--agc-curve'));
        }

        function drawAxis(color) {
            // axis
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(axisXMin, axisYMin); ctx.lineTo(axisXMax, axisYMin); ctx.stroke();

            // axis label
            ctx.fillStyle = color;
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'start';
            ctx.fillText(limXMin.toFixed(1), axisXMin + 2, axisYMin + 12);
            ctx.textAlign = 'end';
            ctx.fillText(limXMax.toFixed(1), axisXMax - 2, axisYMin + 12);

            // weight curve standard point
            const std = CONFIG.target + CONFIG.curveU;
            const stdX = toX(std);
            const stdY = toY(balancer.weight(std - CONFIG.target));
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(stdX, stdY, 3, 0, Math.PI * 2); ctx.fill();

            // tau labels group
            const drawTau = weight => {
                const tauMax = Math.round(1 / Math.max(weight, 1e-6));
                ctx.fillStyle = color;
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'end';
                ctx.fillText(`${tauMax} s`, axisXMax - 2, toY(weight) - 5);
            };

            drawTau(0.1);
            drawTau(0.05);
            drawTau(0.01);
        }

        function drawBalanced(color) {
            // weight curve
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            for (let i = 0; i <= limXNum; i++) {
                const loud = limXMin + (limXMax - limXMin) * i / limXNum;
                const loudX = toX(loud);
                const loudY = toY(balancer.weight(loud - CONFIG.target));
                i === 0 ? ctx.moveTo(loudX, loudY) : ctx.lineTo(loudX, loudY);
            }
            ctx.stroke();

            // weight curve point
            const point = balancer.instant - balancer.current + CONFIG.target;
            const pointX = toX(point);
            const pointY = toY(balancer.weight(point - CONFIG.target));
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(pointX, pointY, 3, 0, Math.PI * 2); ctx.fill();

            // weight curve point label
            const tau = Math.round(1 / Math.max(balancer.weight(point - CONFIG.target), 1e-6));
            ctx.font = '10px sans-serif';
            ctx.fillStyle = color;
            ctx.textAlign = 'end';
            ctx.fillText(tau > 360 ? "- s" : `${tau} s`, axisXMax - 2, pointY - 5);

            // target loudness
            const targetX = toX(CONFIG.target);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(targetX, axisYMax); ctx.lineTo(targetX, axisYMin); ctx.stroke();

            // target loudness label
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = color;
            ctx.fillText(`${CONFIG.target.toFixed(1)} LUFS`, targetX, axisYMin + 12);
        }

        function drawOrigin(color) {
            // origin loudness
            const originX = toX(balancer.current);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(originX, axisYMax); ctx.lineTo(originX, axisYMin); ctx.stroke();

            // origin loudness label
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = color;
            ctx.fillText(`${balancer.current.toFixed(1)} LUFS`, originX, axisYMax - 2);
        }
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
        drawCurve()
        updatePanelContent()
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
