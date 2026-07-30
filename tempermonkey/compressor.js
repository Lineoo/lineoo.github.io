// ==UserScript==
// @name         自动音量均衡器
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  自动将视频响度归一化到统一目标电平（AGC 方案，含悬浮控制面板）
// @author       You
// @match        *://*/*
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
        }
      }
    `;
    document.head.appendChild(style);

    const DEFAULTS = {
        targetLevel: -18,
        maxGain: 24,
        minGain: -18,
        gainBias: 0,
        rmsWindow: 5,
        levelBase: -18,
        levelScale: 8,
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

    function applyAGC(video) {
        if (!video || typeof video !== 'object' || processedSources.has(video)) return;

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

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1;

        source.connect(analyser);
        if (isEnabled) {
            analyser.connect(gainNode);
            gainNode.connect(audioContext.destination);
        } else {
            analyser.connect(audioContext.destination);
        }

        processedSources.add(video);

        const chain = { source, analyser, gainNode, audioContext, video, currentGain: 0, smoothedDb: CONFIG.initLevel };
        activeChains.set(video, chain);

        video.addEventListener('emptied', () => {
            const chain = activeChains.get(video);
            if (chain) {
                chain.currentGain = 0;
                chain.smoothedDb = CONFIG.initLevel;
                chain.gainNode.gain.value = 1;
            }
        });

        console.log('AGC: 已对视频应用自动增益控制', video);
        updateUI();
    }

    function setEnabled(enabled) {
        isEnabled = enabled;
        saveState();
        for (const [, chain] of activeChains) {
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
                const outputDb = instantDb + chain.currentGain;

                const levelWeight = Math.exp((outputDb - CONFIG.levelBase) / CONFIG.levelScale);

                if (levelWeight > 1e-6) {
                    const rmsCoeff = 1 - Math.exp(-dt / CONFIG.rmsWindow);
                    const step = Math.min(levelWeight * rmsCoeff, 1);
                    chain.smoothedDb += (instantDb - chain.smoothedDb) * step;
                }

                let desiredDb = CONFIG.targetLevel - chain.smoothedDb + CONFIG.gainBias;
                desiredDb = Math.max(CONFIG.minGain, Math.min(CONFIG.maxGain, desiredDb));

                const error = Math.abs(desiredDb - chain.currentGain);
                const blend = levelWeight * error;
                const tau = Math.max(CONFIG.tauBase * Math.exp(-CONFIG.tauSteep * blend), 0.01);
                const coeff = 1 - Math.exp(-dt / tau);
                chain.currentGain += (desiredDb - chain.currentGain) * coeff;

                if (isEnabled) {
                    chain.gainNode.gain.value = Math.pow(10, chain.currentGain / 20);
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
        btn.textContent = 'AGC';
        Object.assign(btn.style, {
            position: 'fixed', zIndex: 2147483647, bottom: '20px', right: '20px',
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'var(--agc-accent)', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 'bold', fontSize: '13px', fontFamily: 'sans-serif',
            userSelect: 'none', opacity: '0.85',
            boxShadow: '0 2px 12px var(--agc-shadow)', transition: 'transform .2s'
        });
        btn.onmouseenter = () => btn.style.transform = 'scale(1.1)';
        btn.onmouseleave = () => btn.style.transform = 'scale(1)';
        btn.onclick = togglePanel;
        document.body.appendChild(btn);

        const panel = document.createElement('div');
        panel.id = PANEL_ID;
        Object.assign(panel.style, {
            position: 'fixed', zIndex: 2147483647, bottom: '76px', right: '20px',
            width: '300px', background: 'var(--agc-bg)', color: 'var(--agc-text)',
            borderRadius: '12px', font: '14px/1.5 sans-serif',
            boxShadow: '0 8px 32px var(--agc-shadow)', padding: '16px',
            display: 'none', userSelect: 'none'
        });
        panel.innerHTML = buildPanelHTML();
        document.body.appendChild(panel);

        makeDraggable(panel);
        attachPanelEvents(panel);
    }

    function buildPanelHTML() {
        const active = activeChains.size;
        const groups = [
            { title: '响度规格', items: [
                { key: 'targetLevel', label: '目标响度', unit: 'dB', min: -30, max: -10, step: 0.5 },
                { key: 'maxGain', label: '最大增益', unit: 'dB', min: 0, max: 30, step: 1 },
                { key: 'minGain', label: '最小增益', unit: 'dB', min: -30, max: 0, step: 1 },
                { key: 'gainBias', label: '增益偏置', unit: 'dB', min: -12, max: 12, step: 0.5 }
            ]},
            { title: '响度测算', items: [
                { key: 'rmsWindow', label: '测算时间', unit: 's', min: 0.2, max: 5, step: 0.2 },
                { key: 'levelBase', label: '电平基准', unit: 'dB', min: -60, max: 0, step: 1 },
                { key: 'levelScale', label: '电平陡度', unit: '', min: 4, max: 16, step: 1 }
            ]},
            { title: '增益执行', items: [
                { key: 'tauBase', label: '执行时间', unit: 's', min: 10, max: 120, step: 5 },
                { key: 'tauSteep', label: '误差陡度', unit: '', min: 0.1, max: 2, step: 0.05 }
            ]},
            { title: '高级选项', items: [
                { key: 'initLevel', label: '初始响度', unit: 'dB', min: -30, max: -10, step: 1 }
            ]}
        ];

        let sliders = groups.map(g => {
            const sectionLabel = `<div style="font-size:10px;color:var(--agc-muted);text-transform:uppercase;letter-spacing:1px;margin:10px 0 6px">${g.title}</div>`;
            const rows = g.items.map(p => {
                const val = CONFIG[p.key];
                return `
                <div style="margin-bottom:6px">
                    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px">
                        <span>${p.label}</span>
                        <span id="__vEqVal_${p.key}">${val}${p.unit}</span>
                    </div>
                    <input type="range" id="__vEqRange_${p.key}"
                        data-key="${p.key}" data-unit="${p.unit}"
                        min="${p.min}" max="${p.max}" step="${p.step}" value="${val}"
                        style="width:100%;height:3px;accent-color:var(--agc-accent);cursor:pointer">
                </div>`;
            }).join('');
            return sectionLabel + rows;
        }).join('');

        return `
            <div id="__vEqHeader" style="display:flex;justify-content:space-between;align-items:center;cursor:move;padding-bottom:8px;border-bottom:1px solid var(--agc-border)">
                <span style="font-weight:bold;font-size:15px">\u{1F50A} AGC \u{97F3}\u{91CF}\u{5F52}\u{4E00}\u{5316}</span>
                <div style="display:flex;align-items:center;gap:8px">
                    <span id="__vEqCount" style="font-size:12px;color:var(--agc-muted)">${active} \u{4E2A}\u{89C6}\u{9891}</span>
                    <span id="__vEqReset" style="cursor:pointer;font-size:14px;line-height:1" title="\u{91CD}\u{7F6E}\u{9ED8}\u{8BA4}">\u{21BA}</span>
                    <span id="__vEqClose" style="cursor:pointer;font-size:18px;line-height:1">&times;</span>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin:10px 0;padding:8px 12px;background:var(--agc-card);border-radius:8px">
                <span style="font-size:13px">\u{5F00}\u{542F}\u{5747}\u{8861}</span>
                <label style="position:relative;display:inline-block;width:40px;height:22px;cursor:pointer">
                    <input type="checkbox" id="__vEqToggle" ${isEnabled ? 'checked' : ''} style="opacity:0;width:0;height:0">
                    <span id="__vEqSlider" style="position:absolute;inset:0;background:${isEnabled ? 'var(--agc-accent)' : 'var(--agc-bar-bg)'};border-radius:22px;transition:.3s">
                        <span style="position:absolute;top:2px;left:${isEnabled ? '20px' : '2px'};width:18px;height:18px;background:#fff;border-radius:50%;transition:.3s"></span>
                    </span>
                </label>
                <span id="__vEqStatus" style="font-size:12px;color:${isEnabled ? 'var(--agc-green)' : 'var(--agc-red)'}">${isEnabled ? '\u{5DF2}\u{542F}\u{7528}' : '\u{5DF2}\u{7981}\u{7528}'}</span>
            </div>
            <div style="margin:8px 0;padding:8px 12px;background:var(--agc-card);border-radius:8px">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
                    <span>\u{5E73}\u{5747}\u{54CD}\u{5EA6}</span>
                    <span id="__vEqAvgDb">-\u221E dB</span>
                </div>
                <div style="width:100%;height:6px;background:var(--agc-bar-bg);border-radius:3px;overflow:hidden">
                    <div id="__vEqAvgBar" style="width:0%;height:100%;background:var(--agc-blue);border-radius:3px"></div>
                </div>
            </div>
            <div style="margin:8px 0;padding:8px 12px;background:var(--agc-card);border-radius:8px">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
                    <span>\u{5F53}\u{524D}\u{589E}\u{76CA}</span>
                    <span id="__vEqGainDb">+0.0 dB</span>
                </div>
                <div style="width:100%;height:6px;background:var(--agc-bar-bg);border-radius:3px;overflow:hidden">
                    <div id="__vEqGainBar" style="width:50%;height:100%;background:var(--agc-amber);border-radius:3px"></div>
                </div>
            </div>
            <div style="max-height:340px;overflow-y:auto;padding-right:4px">
                ${sliders}
            </div>
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--agc-border);font-size:11px;color:var(--agc-muted);text-align:center">
                \u{53C2}\u{6570}\u{5B9E}\u{65F6}\u{751F}\u{6548} \u{B7} \u{62D6}\u{52A8}\u{6807}\u{9898}\u{680F}\u{79FB}\u{52A8}\u{9762}\u{677F}
            </div>`;
    }

    function togglePanel() {
        const panel = document.getElementById(PANEL_ID);
        const btn = document.getElementById(BTN_ID);
        if (!panel || !btn) return;
        const show = panel.style.display === 'none';
        panel.style.display = show ? 'block' : 'none';
        btn.style.opacity = show ? '0.3' : '1';
        if (show) updateUI();
    }

    function updateMeters() {
        const chains = [...activeChains.values()];
        const chain = chains[0];
        if (!chain) return;

        const avgDb = chain.smoothedDb;
        const gainDb = chain.currentGain;

        const aBar = document.getElementById('__vEqAvgBar');
        const aLbl = document.getElementById('__vEqAvgDb');
        const aPct = Math.max(0, Math.min((avgDb + 45) / 45 * 100, 100));
        if (aBar) aBar.style.width = aPct + '%';
        if (aLbl) aLbl.textContent = avgDb > -70 ? `${avgDb.toFixed(1)} dB` : '-\u221E dB';

        const gBar = document.getElementById('__vEqGainBar');
        const gLbl = document.getElementById('__vEqGainDb');
        const total = CONFIG.maxGain - CONFIG.minGain || 1;
        const gPct = ((gainDb - CONFIG.minGain) / total) * 100;
        if (gBar) gBar.style.width = Math.max(0, Math.min(gPct, 100)) + '%';
        if (gLbl) gLbl.textContent = `${gainDb >= 0 ? '+' : ''}${gainDb.toFixed(1)} dB`;
    }

    function updateUI() {
        const countEl = document.getElementById('__vEqCount');
        const toggle = document.getElementById('__vEqToggle');
        const slider = document.getElementById('__vEqSlider');
        const status = document.getElementById('__vEqStatus');
        if (countEl) countEl.textContent = `${activeChains.size} 个视频`;
        if (toggle && slider && status) {
            toggle.checked = isEnabled;
            slider.style.background = isEnabled ? 'var(--agc-accent)' : 'var(--agc-bar-bg)';
            const knob = slider.querySelector('span');
            if (knob) knob.style.left = isEnabled ? '20px' : '2px';
            status.textContent = isEnabled ? '已启用' : '已禁用';
            status.style.color = isEnabled ? 'var(--agc-green)' : 'var(--agc-red)';
        }
        ['targetLevel', 'maxGain', 'minGain', 'gainBias', 'rmsWindow', 'levelBase', 'levelScale', 'tauBase', 'tauSteep', 'initLevel'].forEach(key => {
            const valEl = document.getElementById(`__vEqVal_${key}`);
            const range = document.getElementById(`__vEqRange_${key}`);
            if (valEl && range) {
                range.value = CONFIG[key];
                valEl.textContent = `${CONFIG[key]}${range.dataset.unit || ''}`;
            }
        });
    }

    function attachPanelEvents(panel) {
        panel.addEventListener('change', e => {
            const t = e.target;
            if (t.id.startsWith('__vEqRange_')) {
                setConfig(t.dataset.key, parseFloat(t.value));
            }
        });
        panel.addEventListener('input', e => {
            const t = e.target;
            if (t.id.startsWith('__vEqRange_')) {
                const el = document.getElementById(`__vEqVal_${t.dataset.key}`);
                if (el) el.textContent = `${t.value}${t.dataset.unit || ''}`;
            }
        });
        document.getElementById('__vEqToggle')?.addEventListener('change', e => {
            setEnabled(e.target.checked);
        });
        document.getElementById('__vEqReset')?.addEventListener('click', resetConfig);
        document.getElementById('__vEqClose')?.addEventListener('click', () => {
            panel.style.display = 'none';
            const btn = document.getElementById(BTN_ID);
            if (btn) btn.style.opacity = '1';
        });
    }

    function makeDraggable(panel) {
        const header = document.getElementById('__vEqHeader');
        if (!header) return;
        let ox, oy, mx, my, dragging = false;
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
