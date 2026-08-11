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
            this.samples = new Float32Array(analyser.fftSize);
        }

        process(dt) {
            this.analyser.getFloatTimeDomainData(this.samples);
            let sumSq = 0;
            for (let i = 0; i < this.samples.length; i++) {
                sumSq += this.samples[i] * this.samples[i];
            }

            const rms = Math.sqrt(sumSq / this.samples.length);
            const instant = 20 * Math.log10(rms);

            this.active ? this.effect(instant, dt) : this.detect(instant);
        }

        detect(instant) {
            if (instant > -60) this.active = true;
        }

        effect(instant, dt) {
            const { config } = this;

            const error = instant - config.target;
            const steep = Math.pow(config.steep, error);
            const sigma = 1 - Math.exp(-(error * error) / (2 * config.sigma * config.sigma));
            const step = Math.max(Math.min(config.scale * steep * sigma * (1 - Math.exp(-dt)), 1), 0);
            this.current += (instant - this.current) * step;

            this.gain.gain.value = Math.pow(10, (this.config.target - this.current) / 20);
        }
    }

    // Chains //

    const MAX_CHAINS = 8;
    const activeChains = new Map();

    function getAudioContext() {
        const ctx = window._agcAudioContext;
        if (ctx && ctx.state !== 'closed') {
            if (ctx.state === 'suspended') ctx.resume().catch(() => {});
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
        highpass.connect(gain);
        gain.connect(analyser);
        analyser.connect(ctx.destination);

        return balancer;
    }

    // Init //

    const CHAIN_LOOP_INTERVAL = 0.05;
    const SCAN_VIDEOS_INTERVAL = 5;

    function init() {
        scanVideos();
        setInterval(scanVideos, SCAN_VIDEOS_INTERVAL * 1000);
        setInterval(chainLoop, CHAIN_LOOP_INTERVAL * 1000);
    }

    function scanVideos() {
        document.querySelectorAll('video').forEach(attachToVideo);
    }

    function chainLoop() {
        for (const [video, balancer] of activeChains) {
            if (!document.body.contains(video)) {
                try { balancer.analyser.disconnect(); } catch (e) {}
                activeChains.delete(video);
            }

            try {
                if (window._agcAudioContext.state !== 'running') continue;
                balancer.process(CHAIN_LOOP_INTERVAL);
            } catch (e) {}
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
