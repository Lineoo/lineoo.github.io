// ==UserScript==
// @name         自动音量均衡器 (AGC 核心算法)
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  AGC 动态音量归一化核心算法模块（无 UI、无视频捕获）
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
        constructor(config = {}) {
            this.config = Object.assign({}, DEFAULTS, config);
            this.active = false;
            this.current = this.config.target;
        }

        process(samples, dt) {
            let sumSq = 0;
            for (let i = 0; i < samples.length; i++) {
                sumSq += samples[i] * samples[i];
            }

            const rms = Math.sqrt(sumSq / samples.length);
            const db = 20 * Math.log10(rms);

            const instant = db + config.target - this.current;
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
        }
    }
})();
