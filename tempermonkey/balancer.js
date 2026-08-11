// ==UserScript==
// @name         自动音量均衡器 (AGC 核心算法)
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  AGC 动态音量归一化核心算法模块（无 UI）
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

(function () {
    'use strict';

    const DEFAULTS = {
        target: -18,
        steep: 1.1,
        sigma: 5.0,
        scale: 1.0,
    };

    class AGCBalancer {
        constructor(source, analyser, gain) {
            this.source = source;
            this.analyser = analyser;
            this.gain = gain;
            this.config = DEFAULTS;
            this.active = false;
            this.current = this.config.target;
            this.instant = this.current;
            this.samples = new Float32Array(analyser.fftSize);
        }

        weight(error) {
            const { scale, steep, sigma } = this.config;
            return scale * Math.pow(steep, error) * (1 - Math.exp(-(error * error) / (2 * sigma * sigma)));
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

            this.gain.gain.value = gainEnabled ? Math.pow(10, (this.config.target - this.current) / 20) : 1;
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
            if (balancer) activeChains.set(video, new AGCBalancer(balancer.analyser, balancer.gainNode));
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
        --agc-btn-bg: #ffffff;
        --agc-btn-color: #1a1a1a;
        --agc-panel-bg: #ffffff;
        --agc-panel-color: #1a1a1a;
        --agc-border: #d0d0d0;
        --agc-btn-hover: #f0f0f0;
        --agc-curve: #4a90d9;
        --agc-muted: #9494a8;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --agc-btn-bg: #000000;
          --agc-btn-color: #f2f2f2;
          --agc-panel-bg: #000000;
          --agc-panel-color: #f2f2f2;
          --agc-border: #3a3a3a;
          --agc-btn-hover: #1a1a1a;
          --agc-curve: #7aa0d0;
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
        background: var(--agc-btn-bg);
        color: var(--agc-btn-color);
        border: 1px solid var(--agc-border);
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        font-family: sans-serif;
        user-select: none;
        transition: background .2s;
      }
      #__vAGCButton:hover {
        background: var(--agc-btn-hover);
      }
      #__vAGCPanel {
        display: flex;
        flex-direction: column;
        position: fixed;
        z-index: 2147483647;
        right: 20px;
        bottom: 76px;
        width: 300px;
        background: var(--agc-panel-bg);
        color: var(--agc-panel-color);
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
        margin-bottom: 4px;
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
        color: var(--agc-panel-color);
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
        background: var(--agc-btn-hover);
      }
      .__vAGCActions button.off {
        color: var(--agc-muted);
      }
      #__vAGCCanvas {
        display: block;
        aspect-ratio: 16 / 9;
        margin-top: 12px;
        border-radius: 6px;
        border: 1px solid var(--agc-border);
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
        <canvas id="__vAGCCanvas"></canvas>
      </div>
    `;

    let ui = null;
    let gainEnabled = true;

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
            close: document.getElementById('__vAGCClose'),
            reset: document.getElementById('__vAGCReset'),
        };

        ui.gain.addEventListener('click', () => {
            gainEnabled = !gainEnabled;
            ui.gain.classList.toggle('off', !gainEnabled);
        });

        ui.btn.addEventListener('click', () => {
            const show = ui.panel.style.display !== 'flex';
            ui.panel.style.display = show ? 'flex' : 'none';
            if (show) drawCurve();
        });

        ui.close.addEventListener('click', () => {
            ui.panel.style.display = 'none';
        });

        ui.reset.addEventListener('click', () => { });
    }

    function drawCurve() {
        if (!ui || ui.panel.style.display !== 'flex') return;
        const canvas = ui.canvas;

        const balancer = [...activeChains.values()].find(b => b.active);
        if (!balancer) return;

        const dpr = window.devicePixelRatio || 1;
        const cssRect = canvas.getBoundingClientRect();
        if (cssRect.width <= 0 || cssRect.height <= 0) return;
        canvas.width = Math.floor(cssRect.width * dpr);
        canvas.height = Math.floor(cssRect.height * dpr);

        const width = cssRect.width, height = cssRect.height;
        const padding = 10;

        const limXNum = 200;
        const limXMid = gainEnabled ? balancer.config.target : balancer.current, limXHalf = 30;
        const limXMin = limXMid - limXHalf, limXMax = limXMid + limXHalf;

        const limYMax = 1.2;

        const axisY = height - padding - 16;

        const cs = getComputedStyle(document.documentElement);
        const color = name => cs.getPropertyValue(name).trim();
        const toX = loud => padding + ((loud - limXMin) / (limXMax - limXMin)) * (width - 2 * padding);
        const toY = weight => axisY - (weight / limYMax) * (axisY - padding);

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        // axis
        ctx.strokeStyle = color('--agc-border');
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(padding, axisY); ctx.lineTo(width - padding, axisY); ctx.stroke();

        // axis label
        ctx.fillStyle = color('--agc-border');
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'start';
        ctx.fillText(limXMin.toFixed(1), padding + 2, axisY + 12);
        ctx.textAlign = 'end';
        ctx.fillText(limXMax.toFixed(1), width - padding - 2, axisY + 12);

        // weight curve
        ctx.beginPath();
        ctx.strokeStyle = gainEnabled ? color('--agc-curve') : color('--agc-border');
        ctx.lineWidth = 1.5;
        for (let i = 0; i <= limXNum; i++) {
            const loud = limXMin + (limXMax - limXMin) * i / limXNum;
            const loudX = toX(loud);
            const loudY = toY(balancer.weight(loud - balancer.config.target));
            i === 0 ? ctx.moveTo(loudX, loudY) : ctx.lineTo(loudX, loudY);
        }
        ctx.stroke();

        // weight curve point
        const point = balancer.instant - balancer.current + balancer.config.target;
        const pointX = toX(point);
        const pointY = toY(balancer.weight(point - balancer.config.target));
        ctx.fillStyle = gainEnabled ? color('--agc-curve') : color('--agc-border');
        ctx.beginPath(); ctx.arc(pointX, pointY, 3, 0, Math.PI * 2); ctx.fill();

        // target loudness
        const targetX = toX(balancer.config.target);
        ctx.strokeStyle = gainEnabled ? color('--agc-curve') : color('--agc-border');
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(targetX, padding); ctx.lineTo(targetX, axisY); ctx.stroke();

        // target loudness label
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = gainEnabled ? color('--agc-curve') : color('--agc-border');
        ctx.fillText(balancer.config.target.toFixed(1), targetX, axisY + 12)

        // origin loudness
        const originX = toX(balancer.current);
        ctx.strokeStyle = gainEnabled ? color('--agc-border') : color('--agc-curve');
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(originX, padding); ctx.lineTo(originX, axisY); ctx.stroke();

        // origin loudness label
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = gainEnabled ? color('--agc-border') : color('--agc-curve');
        ctx.fillText(balancer.current.toFixed(1), originX, axisY + 12);
    }

    function updateVideoCount() {
        const total = activeChains.size;
        const active = [...activeChains.values()].filter(b => b.active).length;
        ui.count.textContent = `${active} - ${total}`;
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
        setInterval(drawCurve, UI_REDRAW_INTERVAL * 1000);
        setInterval(updateVideoCount, UI_REDRAW_INTERVAL * 1000);
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
