
// ===== Color Conversion =====

function srgbSensitiveToLinear(r, g, b) {
    return [r, g, b].map(c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
}

function srgbLinearToSensitive(r, g, b) {
    return [r, g, b].map(c => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)
}

function srgbToHsl(r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return [h, s, l];
}

function hslToSrgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r, g, b];
}

function srgbToHsv(r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h, s, v = max;

    s = max === 0 ? 0 : d / max;

    if (max === min) {
        h = 0;
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, v];
}

function hsvToSrgb(h, s, v) {
    let r, g, b;

    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [r, g, b];
}

function srgbLinearToLms(r, g, b) {
    const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
    return [l, m, s]
}

function lmsToSrgbLinear(l, m, s) {
    const linR = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const linG = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const linB = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
    return [linR, linG, linB];
}

function lmsToOklab(l, m, s) {
    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);
    return [
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    ];
}

function oklabToLms(L, a, b) {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;
    return [l, m, s];
}

function oklchToOklab(L, C, H) {
    const hRad = H * 2 * Math.PI;
    return [L, C * Math.cos(hRad), C * Math.sin(hRad)];
}

function oklabToOklch(L, a, b) {
    const C = Math.sqrt(a * a + b * b);
    let H = Math.atan2(b, a) / (2 * Math.PI);
    return [L, C, H - Math.floor(H)];
}

function oklabToSrgb(L, a, b) {
    const [l, m, s] = oklabToLms(L, a, b);
    const [linR, linG, linB] = lmsToSrgbLinear(l, m, s);
    return srgbLinearToSensitive(linR, linG, linB);
}

function oklchToSrgb(L, C, H) {
    const [, a, b] = oklchToOklab(L, C, H);
    return oklabToSrgb(L, a, b);
}

// Formatting

function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length === 8) hex = hex.slice(0, 6);
    const num = parseInt(hex, 16);
    return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

function srgbFloatToUintClamped(r, g, b) {
    return [r, g, b].map(x => (Math.min(Math.max(Math.round(x * 255), 0), 255)));
}

// ===== UI Logic =====// 

let updating = false;

const initSrgb = [0.24, 0.53, 0.95];
const valPrcs = 3;
const dgrPrcs = 4;
const els = {
    srgbR: document.getElementById('srgb-float:r'),
    srgbG: document.getElementById('srgb-float:g'),
    srgbB: document.getElementById('srgb-float:b'),
    srgbUintR: document.getElementById('srgb-uint:r'),
    srgbUintG: document.getElementById('srgb-uint:g'),
    srgbUintB: document.getElementById('srgb-uint:b'),
    srgbHex: document.getElementById('srgb-uint.hex'),
    srgbRgb: document.getElementById('srgb-uint.rgb'),
    srgbColor: document.getElementById('srgb-float.color'),
    srgbLinearR: document.getElementById('srgb-linear:r'),
    srgbLinearG: document.getElementById('srgb-linear:g'),
    srgbLinearB: document.getElementById('srgb-linear:b'),
    srgbLinearColor: document.getElementById('srgb-linear.color'),
    srgbLinearWgsl: document.getElementById('srgb-linear.wgsl'),
    hslH: document.getElementById('hsl:h'),
    hslS: document.getElementById('hsl:s'),
    hslL: document.getElementById('hsl:l'),
    hslHsl: document.getElementById('hsl.hsl'),
    hsvH: document.getElementById('hsv:h'),
    hsvS: document.getElementById('hsv:s'),
    hsvV: document.getElementById('hsv:v'),
    oklchL: document.getElementById('oklch:l'),
    oklchC: document.getElementById('oklch:c'),
    oklchH: document.getElementById('oklch:h'),
    oklchOklch: document.getElementById('oklch.oklch'),
    oklabL: document.getElementById('oklab:l'),
    oklabA: document.getElementById('oklab:a'),
    oklabB: document.getElementById('oklab:b'),
    oklabOklab: document.getElementById('oklab.oklab'),
    lmsL: document.getElementById('lms:l'),
    lmsM: document.getElementById('lms:m'),
    lmsS: document.getElementById('lms:s'),
};

// ---- Color plane configuration ----

const PLANES = [
    { id: 'hsl-hl', space: 'hsl', x: 'h', y: 'l' },
    { id: 'hsl-hs', space: 'hsl', x: 'h', y: 's' },
    { id: 'hsl-sl', space: 'hsl', x: 's', y: 'l' },
    { id: 'hsv-hv', space: 'hsv', x: 'h', y: 'v' },
    { id: 'hsv-hs', space: 'hsv', x: 'h', y: 's' },
    { id: 'hsv-sv', space: 'hsv', x: 's', y: 'v' },
    { id: 'oklab-la', space: 'oklab', x: 'a', y: 'L', xMin: -0.4, xMax: 0.4 },
    { id: 'oklab-lb', space: 'oklab', x: 'b', y: 'L', xMin: -0.4, xMax: 0.4 },
    { id: 'oklab-ab', space: 'oklab', x: 'a', y: 'b', xMin: -0.4, xMax: 0.4, yMin: -0.4, yMax: 0.4 },
    { id: 'oklch-lc', space: 'oklch', x: 'C', y: 'L', xMax: 0.4 },
    { id: 'oklch-lh', space: 'oklch', x: 'H', y: 'L' },
    { id: 'oklch-ch', space: 'oklch', x: 'H', y: 'C', yMax: 0.4 },
];

const SPACE_META = {
    hsl: {
        keys:   ['h','s','l'],
        els:    ['hslH','hslS','hslL'],
        precs:  [dgrPrcs, valPrcs, valPrcs],
        fmtEl:  'hslHsl',
        fmt:    v => `hsl(${v.h.toFixed(dgrPrcs)}, ${v.s.toFixed(valPrcs)}, ${v.l.toFixed(valPrcs)})`,
        toSrgb: v => hslToSrgb(v.h, v.s, v.l),
        source: 'hsl:hsl',
    },
    hsv: {
        keys:   ['h','s','v'],
        els:    ['hsvH','hsvS','hsvV'],
        precs:  [dgrPrcs, valPrcs, valPrcs],
        toSrgb: v => hsvToSrgb(v.h, v.s, v.v),
        source: 'hsv:hsv',
    },
    oklab: {
        keys:   ['L','a','b'],
        els:    ['oklabL','oklabA','oklabB'],
        precs:  [valPrcs, valPrcs, valPrcs],
        fmtEl:  'oklabOklab',
        fmt:    v => `oklab(${v.L.toFixed(valPrcs)} ${v.a.toFixed(valPrcs)} ${v.b.toFixed(valPrcs)})`,
        toSrgb: v => oklabToSrgb(v.L, v.a, v.b),
        source: 'oklab:lab',
    },
    oklch: {
        keys:   ['L','C','H'],
        els:    ['oklchL','oklchC','oklchH'],
        precs:  [valPrcs, valPrcs, dgrPrcs],
        fmtEl:  'oklchOklch',
        fmt:    v => `oklch(${v.L.toFixed(valPrcs)} ${v.C.toFixed(valPrcs)} ${v.H.toFixed(dgrPrcs)})`,
        toSrgb: v => oklchToSrgb(v.L, v.C, v.H),
        source: 'oklch:lch',
    },
};

function readHs(space) {
    const m = SPACE_META[space];
    const v = {};
    m.keys.forEach((k, i) => v[k] = parseFloat(els[m.els[i]].value) || 0);
    return v;
}

function hsToSrgb(space, v) {
    return SPACE_META[space].toSrgb(v);
}

function writeHs(space, v) {
    const m = SPACE_META[space];
    m.els.forEach((e, i) => els[e].value = v[m.keys[i]].toFixed(m.precs[i]));
    if (m.fmtEl) els[m.fmtEl].value = m.fmt(v);
}

// ---- Plane drawing ----

let _cnt = 0;

function drawColorPlane(canvas, colorFn, mx, my) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    const dpr = window.devicePixelRatio || 1;

    _cnt += 1;

    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(w, h);

    for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
            const [r, g, b] = colorFn(px / w, py / h);
            const idx = (py * w + px) * 4;
            const inGamut = r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1;
            imageData.data[idx] = Math.round(Math.max(0, Math.min(1, r)) * 255);
            imageData.data[idx + 1] = Math.round(Math.max(0, Math.min(1, g)) * 255);
            imageData.data[idx + 2] = Math.round(Math.max(0, Math.min(1, b)) * 255);
            imageData.data[idx + 3] = inGamut ? 255 : 0;
        }
    }

    ctx.putImageData(imageData, 0, 0);

    const cx = mx * w;
    const cy = my * h;

    ctx.beginPath();
    ctx.arc(cx, cy, 7.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'oklch(0% 0 0)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'oklch(100% 0 0)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

function drawAllPlanes() {
    for (const cfg of PLANES) {
        const canvas = document.getElementById(cfg.id);
        if (!canvas) continue;
        const v = readHs(cfg.space);

        const xMin = cfg.xMin ?? 0, xMax = cfg.xMax ?? 1;
        const yMin = cfg.yMin ?? 0, yMax = cfg.yMax ?? 1;

        drawColorPlane(
            canvas,
            (x, y) => {
                const vals = { ...v };
                vals[cfg.x] = xMin + x * (xMax - xMin);
                vals[cfg.y] = yMin + (1 - y) * (yMax - yMin);
                return hsToSrgb(cfg.space, vals);
            },
            (v[cfg.x] - xMin) / (xMax - xMin),
            1 - (v[cfg.y] - yMin) / (yMax - yMin)
        );
    }
}

function updateAll(r, g, b, source) {
    if (updating) return;
    updating = true;

    const gamutOk = r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1;
    const cr = Math.max(0, Math.min(1, r));
    const cg = Math.max(0, Math.min(1, g));
    const cb = Math.max(0, Math.min(1, b));

    const [uintR, uintG, uintB] = srgbFloatToUintClamped(r, g, b);
    const [hslH, hslS, hslL] = srgbToHsl(cr, cg, cb);
    const [hsvH, hsvS, hsvV] = srgbToHsv(cr, cg, cb);
    const [linR, linG, linB] = srgbSensitiveToLinear(r, g, b);
    const [lmsL, lmsM, lmsS] = srgbLinearToLms(linR, linG, linB);
    const [labL, labA, labB] = lmsToOklab(lmsL, lmsM, lmsS);
    const [lchL, lchC, lchH] = oklabToOklch(labL, labA, labB);

    const tintL = lchL * 100;
    const tintC = Math.max(0, lchC);
    const tintH = ((lchH % 1) + 1) % 1 * 360;
    document.documentElement.style.setProperty(
        '--color-tint',
        `oklch(${tintL.toFixed(1)}% ${tintC.toFixed(3)} ${tintH.toFixed(1)})`
    );

    if (source !== 'srgb-float:rgb') {
        els.srgbR.value = r.toFixed(valPrcs);
        els.srgbG.value = g.toFixed(valPrcs);
        els.srgbB.value = b.toFixed(valPrcs);
    }

    color_overdrive(r > 1 || r < 0, els.srgbUintR);
    color_overdrive(g > 1 || g < 0, els.srgbUintG);
    color_overdrive(b > 1 || b < 0, els.srgbUintB);
    if (source !== 'srgb-uint:rgb') {
        els.srgbUintR.value = Math.round(r * 255);
        els.srgbUintG.value = Math.round(g * 255);
        els.srgbUintB.value = Math.round(b * 255);
    }

    color_clip(r > 1 || r < 0 || g > 1 || g < 0 || b > 1 || b < 0, els.srgbHex);
    if (source !== 'srgb-uint.hex') {
        els.srgbHex.value = `#\
${uintR.toString(16).padStart(2, '0')}\
${uintG.toString(16).padStart(2, '0')}\
${uintB.toString(16).padStart(2, '0')}`;
    }

    color_clip(r > 1 || r < 0 || g > 1 || g < 0 || b > 1 || b < 0, els.srgbRgb);
    if (source !== 'srgb-uint.rgb') {
        els.srgbRgb.value = `rgb(${uintR} ${uintG} ${uintB})`;
    }

    if (source !== 'srgb-float.color') {
        els.srgbColor.value = `color(srgb ${r.toFixed(valPrcs)} ${g.toFixed(valPrcs)} ${b.toFixed(valPrcs)})`;
    }

    if (source !== 'srgb-linear:rgb') {
        els.srgbLinearR.value = linR.toFixed(valPrcs);
        els.srgbLinearG.value = linG.toFixed(valPrcs);
        els.srgbLinearB.value = linB.toFixed(valPrcs);
    }

    if (source !== 'srgb-linear.color') {
        els.srgbLinearColor.value = `color(srgb-linear ${linR.toFixed(valPrcs)} ${linG.toFixed(valPrcs)} ${linB.toFixed(valPrcs)})`;
    }

    if (source !== 'srgb-linear.wgsl') {
        els.srgbLinearWgsl.value = `vec3f(${linR.toFixed(valPrcs)}, ${linG.toFixed(valPrcs)}, ${linB.toFixed(valPrcs)})`;
    }

    if (source !== 'hsl:hsl') {
        els.hslH.value = hslH.toFixed(dgrPrcs);
        els.hslS.value = hslS.toFixed(valPrcs);
        els.hslL.value = hslL.toFixed(valPrcs);
        color_clip(!gamutOk, els.hslH);
        color_clip(!gamutOk, els.hslS);
        color_clip(!gamutOk, els.hslL);
    }

    if (source !== 'hsl.hsl') {
        els.hslHsl.value = `hsl(${hslH.toFixed(dgrPrcs)}, ${hslS.toFixed(valPrcs)}, ${hslL.toFixed(valPrcs)})`;
    }

    if (source !== 'hsv:hsv') {
        els.hsvH.value = hsvH.toFixed(dgrPrcs);
        els.hsvS.value = hsvS.toFixed(valPrcs);
        els.hsvV.value = hsvV.toFixed(valPrcs);
        color_clip(!gamutOk, els.hsvH);
        color_clip(!gamutOk, els.hsvS);
        color_clip(!gamutOk, els.hsvV);
    }

    if (source !== 'oklch:lch') {
        els.oklchL.value = lchL.toFixed(valPrcs);
        els.oklchC.value = lchC.toFixed(valPrcs);
        els.oklchH.value = lchH.toFixed(dgrPrcs);
    }

    if (source !== 'oklch.oklch') {
        els.oklchOklch.value = `oklch(${lchL.toFixed(valPrcs)} ${lchC.toFixed(valPrcs)} ${lchH.toFixed(dgrPrcs)})`;
    }

    if (source !== 'oklab:lab') {
        els.oklabL.value = labL.toFixed(valPrcs);
        els.oklabA.value = labA.toFixed(valPrcs);
        els.oklabB.value = labB.toFixed(valPrcs);
    }

    if (source !== 'oklab.oklab') {
        els.oklabOklab.value = `oklab(${labL.toFixed(valPrcs)} ${labA.toFixed(valPrcs)} ${labB.toFixed(valPrcs)})`;
    }

    if (source !== 'lms:lms') {
        els.lmsL.value = lmsL.toFixed(valPrcs);
        els.lmsM.value = lmsM.toFixed(valPrcs);
        els.lmsS.value = lmsS.toFixed(valPrcs);
    }

    drawAllPlanes();

    updating = false;
}

function color_clip(enable, elem) {
    if (!elem.color_clip && enable) {
        color_alert_buttons(elem);
        let button = document.createElement("button");
        button.className = "color-alert clip";
        button.title = "颜色被裁切（非原始色彩）";

        elem.color_clip = button;
        elem.alert_buttons.appendChild(button);
    } else if (elem.color_clip && !enable) {
        elem.alert_buttons.removeChild(elem.color_clip);
        elem.color_clip = undefined;
    }
}

function color_overdrive(enable, elem) {
    if (!elem.color_overdrive && enable) {
        color_alert_buttons(elem);
        let button = document.createElement("button");
        button.className = "color-alert overdrive";
        button.title = "颜色未定义（超出色域）";

        elem.color_overdrive = button;
        elem.alert_buttons.appendChild(button);
    } else if (elem.color_overdrive && !enable) {
        elem.alert_buttons.removeChild(elem.color_overdrive);
        elem.color_overdrive = undefined;
    }
}

function color_alert_buttons(elem) {
    if (!elem.alert_buttons) {
        let div = document.createElement("div");
        elem.alert_buttons = div;
        elem.parentElement.appendChild(div);
    }
}

// ---- Input event wiring ----

const INPUT_SPACES = [
    { keys: ['srgbR','srgbG','srgbB'],                    toSrgb: (a,b,c) => [a,b,c],                              source: 'srgb-float:rgb'   },
    { keys: ['srgbUintR','srgbUintG','srgbUintB'],        toSrgb: (a,b,c) => [Math.round(a)/255, Math.round(b)/255, Math.round(c)/255], source: 'srgb-uint:rgb' },
    { keys: ['srgbLinearR','srgbLinearG','srgbLinearB'],  toSrgb: (a,b,c) => srgbLinearToSensitive(a,b,c),         source: 'srgb-linear:rgb'  },
    { keys: ['hslH','hslS','hslL'],                       toSrgb: hslToSrgb,                                       source: 'hsl:hsl',          clip: true },
    { keys: ['hsvH','hsvS','hsvV'],                       toSrgb: hsvToSrgb,                                       source: 'hsv:hsv',          clip: true },
    { keys: ['oklchL','oklchC','oklchH'],                 toSrgb: oklchToSrgb,                                     source: 'oklch:lch'        },
    { keys: ['oklabL','oklabA','oklabB'],                 toSrgb: oklabToSrgb,                                     source: 'oklab:lab'        },
    { keys: ['lmsL','lmsM','lmsS'],                       toSrgb: (l,m,s) => srgbLinearToSensitive(...lmsToSrgbLinear(l,m,s)), source: 'lms:lms' },
];

INPUT_SPACES.forEach(def => {
    def.keys.forEach(key => {
        els[key].addEventListener('input', () => {
            const args = def.keys.map(k => parseFloat(els[k].value) || 0);
            let [r, g, b] = def.toSrgb(...args);

            if (def.clip) {
                const cr = Math.max(0, Math.min(1, r));
                const cg = Math.max(0, Math.min(1, g));
                const cb = Math.max(0, Math.min(1, b));
                const outOfGamut = cr !== r || cg !== g || cb !== b;
                def.keys.forEach(k => color_clip(outOfGamut, els[k]));
                r = cr; g = cg; b = cb;
            }

            updateAll(r, g, b, def.source);
        });
    });
});

updateAll(initSrgb[0], initSrgb[1], initSrgb[2], 'init');

document.addEventListener('click', function (e) {
    const toggle = e.target.closest('.details-toggle');
    if (!toggle) return;

    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    const descId = toggle.getAttribute('aria-controls');
    const description = document.getElementById(descId);

    toggle.setAttribute('aria-expanded', !expanded);
    description.classList.toggle('collapsed', expanded);
});

let resizeTimeout;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(drawAllPlanes, 100);
});

const pickTimeLimit = 100;

let dragPlane = null;
let dragCfg = null;
let lastDragTime = 0;

function pickFromPlane(canvas, cfg, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const xn = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const yn = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    const xMin = cfg.xMin ?? 0, xMax = cfg.xMax ?? 1;
    const yMin = cfg.yMin ?? 0, yMax = cfg.yMax ?? 1;

    const v = readHs(cfg.space);
    v[cfg.x] = xMin + xn * (xMax - xMin);
    v[cfg.y] = yMin + (1 - yn) * (yMax - yMin);

    const source = SPACE_META[cfg.space].source;

    let [r, g, b] = hsToSrgb(cfg.space, v);

    if (cfg.space === 'hsl' || cfg.space === 'hsv') {
        const cr = Math.max(0, Math.min(1, r));
        const cg = Math.max(0, Math.min(1, g));
        const cb = Math.max(0, Math.min(1, b));
        const outOfGamut = cr !== r || cg !== g || cb !== b;
        const m = SPACE_META[cfg.space];
        m.els.forEach(e => color_clip(outOfGamut, els[e]));
        r = cr; g = cg; b = cb;
    }

    writeHs(cfg.space, v);
    updateAll(r, g, b, source);
}

function startDrag(e) {
    const canvas = e.target.closest('.color-plane');
    if (!canvas) return;
    const cfg = PLANES.find(p => p.id === canvas.id);
    if (!cfg) return;

    dragPlane = canvas;
    dragCfg = cfg;
    lastDragTime = 0;
    pickFromPlane(canvas, cfg, e.clientX, e.clientY);
    e.preventDefault();
}

function moveDrag(e) {
    if (!dragPlane) return;
    const now = Date.now();
    if (now - lastDragTime < pickTimeLimit) return;
    lastDragTime = now;
    pickFromPlane(dragPlane, dragCfg, e.clientX, e.clientY);
    e.preventDefault();
}

function stopDrag() {
    dragPlane = null;
    dragCfg = null;
}

function startTouchDrag(e) {
    const canvas = e.target.closest('.color-plane');
    if (!canvas) return;
    const cfg = PLANES.find(p => p.id === canvas.id);
    if (!cfg) return;

    dragPlane = canvas;
    dragCfg = cfg;
    lastDragTime = 0;
    const touch = e.touches[0];
    pickFromPlane(canvas, cfg, touch.clientX, touch.clientY);
    e.preventDefault();
}

function moveTouchDrag(e) {
    if (!dragPlane) return;
    const now = Date.now();
    if (now - lastDragTime < pickTimeLimit) return;
    lastDragTime = now;
    const touch = e.touches[0];
    pickFromPlane(dragPlane, dragCfg, touch.clientX, touch.clientY);
    e.preventDefault();
}

document.addEventListener('mousedown', startDrag);
document.addEventListener('mousemove', moveDrag);
document.addEventListener('mouseup', stopDrag);
document.addEventListener('touchstart', startTouchDrag, { passive: false });
document.addEventListener('touchmove', moveTouchDrag, { passive: false });
document.addEventListener('touchend', stopDrag);

document.addEventListener('transitionend', function (e) {
    if (e.target.classList.contains('color-planes') && !e.target.classList.contains('collapsed')) {
        drawAllPlanes();
    }
});