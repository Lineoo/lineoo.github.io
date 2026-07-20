
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
    { id: 'srgb-rg', space: 'srgb', x: 'r', y: 'g' },
    { id: 'srgb-rb', space: 'srgb', x: 'r', y: 'b' },
    { id: 'srgb-gb', space: 'srgb', x: 'g', y: 'b' },
    { id: 'lin-rg', space: 'srgb-linear', x: 'R', y: 'G' },
    { id: 'lin-rb', space: 'srgb-linear', x: 'R', y: 'B' },
    { id: 'lin-gb', space: 'srgb-linear', x: 'G', y: 'B' },
    { id: 'lms-lm', space: 'lms', x: 'L', y: 'M' },
    { id: 'lms-ls', space: 'lms', x: 'L', y: 'S' },
    { id: 'lms-ms', space: 'lms', x: 'M', y: 'S' },
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

const POLARS = [
    { id: 'hsl-wheel',  space: 'hsl',   type: 'wheel', rad: 's', ang: 'h', fix: 'l' },
    { id: 'hsl-bar',    space: 'hsl',   type: 'bar',   var: 'l', hue: 'h', sat: 's' },
    { id: 'hsv-wheel',  space: 'hsv',   type: 'wheel', rad: 's', ang: 'h', fix: 'v' },
    { id: 'hsv-bar',    space: 'hsv',   type: 'bar',   var: 'v', hue: 'h', sat: 's' },
    { id: 'oklch-wheel', space: 'oklch', type: 'wheel', rad: 'C', ang: 'H', fix: 'L', radMax: 0.4 },
    { id: 'oklch-bar',  space: 'oklch', type: 'bar',   var: 'L', hue: 'H', sat: 'C' },
];

const SPACE_META = {
    srgb: {
        keys: ['r', 'g', 'b'],
        els: ['srgbR', 'srgbG', 'srgbB'],
        precs: [valPrcs, valPrcs, valPrcs],
        toSrgb: v => [v.r, v.g, v.b],
        source: 'srgb-float:rgb',
    },
    'srgb-linear': {
        keys: ['R', 'G', 'B'],
        els: ['srgbLinearR', 'srgbLinearG', 'srgbLinearB'],
        precs: [valPrcs, valPrcs, valPrcs],
        toSrgb: v => srgbLinearToSensitive(v.R, v.G, v.B),
        source: 'srgb-linear:rgb',
    },
    lms: {
        keys: ['L', 'M', 'S'],
        els: ['lmsL', 'lmsM', 'lmsS'],
        precs: [valPrcs, valPrcs, valPrcs],
        toSrgb: v => srgbLinearToSensitive(...lmsToSrgbLinear(v.L, v.M, v.S)),
        source: 'lms:lms',
    },
    hsl: {
        keys: ['h', 's', 'l'],
        els: ['hslH', 'hslS', 'hslL'],
        precs: [dgrPrcs, valPrcs, valPrcs],
        fmtEl: 'hslHsl',
        fmt: v => `hsl(${v.h.toFixed(dgrPrcs)}, ${v.s.toFixed(valPrcs)}, ${v.l.toFixed(valPrcs)})`,
        toSrgb: v => hslToSrgb(v.h, v.s, v.l),
        source: 'hsl:hsl',
    },
    hsv: {
        keys: ['h', 's', 'v'],
        els: ['hsvH', 'hsvS', 'hsvV'],
        precs: [dgrPrcs, valPrcs, valPrcs],
        toSrgb: v => hsvToSrgb(v.h, v.s, v.v),
        source: 'hsv:hsv',
    },
    oklab: {
        keys: ['L', 'a', 'b'],
        els: ['oklabL', 'oklabA', 'oklabB'],
        precs: [valPrcs, valPrcs, valPrcs],
        fmtEl: 'oklabOklab',
        fmt: v => `oklab(${v.L.toFixed(valPrcs)} ${v.a.toFixed(valPrcs)} ${v.b.toFixed(valPrcs)})`,
        toSrgb: v => oklabToSrgb(v.L, v.a, v.b),
        source: 'oklab:lab',
    },
    oklch: {
        keys: ['L', 'C', 'H'],
        els: ['oklchL', 'oklchC', 'oklchH'],
        precs: [valPrcs, valPrcs, dgrPrcs],
        fmtEl: 'oklchOklch',
        fmt: v => `oklch(${v.L.toFixed(valPrcs)} ${v.C.toFixed(valPrcs)} ${v.H.toFixed(dgrPrcs)})`,
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

function drawColorPlane(canvas, colorFn, mx, my) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    const dpr = window.devicePixelRatio || 1;

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
            if (inGamut) {
                imageData.data[idx] = Math.round(r * 255);
                imageData.data[idx + 1] = Math.round(g * 255);
                imageData.data[idx + 2] = Math.round(b * 255);
                imageData.data[idx + 3] = 255;
            } else {
                imageData.data[idx] = 99;
                imageData.data[idx + 1] = 99;
                imageData.data[idx + 2] = 99;
                imageData.data[idx + 3] = 20;
            }
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

function drawWheel(canvas, space, radKey, angKey, fixKey, radMax) {
    if (!canvas) return;
    radMax = radMax || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    const dpr = window.devicePixelRatio || 1;

    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(w, h);
    const cx = w / 2, cy = h / 2, maxR = Math.min(w, h) / 2;
    const v = readHs(space);

    for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
            const dx = px - cx, dy = py - cy;
            const r = Math.sqrt(dx * dx + dy * dy);
            const idx = (py * w + px) * 4;
            if (r > maxR) { imageData.data[idx + 3] = 0; continue; }

            const angle = (Math.atan2(-dy, dx) + Math.PI * 2) % (Math.PI * 2);
            const vals = { ...v };
            vals[radKey] = (r / maxR) * radMax;
            vals[angKey] = angle / (Math.PI * 2);

            const [cr, cg, cb] = hsToSrgb(space, vals);
            const inGamut = cr >= 0 && cr <= 1 && cg >= 0 && cg <= 1 && cb >= 0 && cb <= 1;
            if (inGamut) {
                imageData.data[idx] = Math.round(cr * 255);
                imageData.data[idx + 1] = Math.round(cg * 255);
                imageData.data[idx + 2] = Math.round(cb * 255);
                imageData.data[idx + 3] = 255;
            } else {
                imageData.data[idx] = 99;
                imageData.data[idx + 1] = 99;
                imageData.data[idx + 2] = 99;
                imageData.data[idx + 3] = 20;
            }
        }
    }
    ctx.putImageData(imageData, 0, 0);

    const rad = (v[radKey] || 0) / radMax, ang = (v[angKey] || 0) * Math.PI * 2;
    const mx = cx + rad * maxR * Math.cos(ang);
    const my = cy - rad * maxR * Math.sin(ang);

    ctx.beginPath();
    ctx.arc(mx, my, 7.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'oklch(0% 0 0)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mx, my, 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'oklch(100% 0 0)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

function drawBar(canvas, space, varKey, hueKey, satKey) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    const dpr = window.devicePixelRatio || 1;

    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(w, h);
    const v = readHs(space);

    for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
            const vals = { ...v };
            vals[varKey] = 1 - py / h;
            const [cr, cg, cb] = hsToSrgb(space, vals);
            const idx = (py * w + px) * 4;
            const inGamut = cr >= 0 && cr <= 1 && cg >= 0 && cg <= 1 && cb >= 0 && cb <= 1;
            if (inGamut) {
                imageData.data[idx] = Math.round(cr * 255);
                imageData.data[idx + 1] = Math.round(cg * 255);
                imageData.data[idx + 2] = Math.round(cb * 255);
                imageData.data[idx + 3] = 255;
            } else {
                imageData.data[idx] = 99;
                imageData.data[idx + 1] = 99;
                imageData.data[idx + 2] = 99;
                imageData.data[idx + 3] = 20;
            }
        }
    }
    ctx.putImageData(imageData, 0, 0);

    const val = v[varKey] || 0;
    const y = (1 - val) * h;

    ctx.beginPath();
    ctx.arc(w / 2, y, 7.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'oklch(0% 0 0)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, y, 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'oklch(100% 0 0)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

const drawTimeLimit = 100;

let lastDrawTime = 0;

function drawAllPlanes() {
    const now = Date.now();
    if (now - lastDrawTime < drawTimeLimit) return;
    lastDrawTime = now;

    for (const cfg of PLANES) {
        const canvas = document.getElementById(cfg.id);
        if (!canvas || canvas.parentElement.classList.contains('collapsed')) continue;
        const v = readHs(cfg.space);

        const xMin = cfg.xMin ?? 0, xMax = cfg.xMax ?? 1;
        const yMin = cfg.yMin ?? 0, yMax = cfg.yMax ?? 1;

        drawColorPlane(
            canvas,
            (x, y) => {
                const vals = { ...v };
                vals[cfg.x] = xMin + x * (xMax - xMin);
                vals[cfg.y] = yMin + (1 - y) * (yMax - yMin);
                return SPACE_META[cfg.space].toSrgb(vals);
            },
            (v[cfg.x] - xMin) / (xMax - xMin),
            1 - (v[cfg.y] - yMin) / (yMax - yMin)
        );
    }

    for (const p of POLARS) {
        const canvas = document.getElementById(p.id);
        if (!canvas || canvas.parentElement.classList.contains('collapsed')) continue;
        if (p.type === 'wheel') drawWheel(canvas, p.space, p.rad, p.ang, p.fix, p.radMax);
        else drawBar(canvas, p.space, p.var, p.hue, p.sat);
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

    color_clip(!gamutOk, els.hslH);
    color_clip(!gamutOk, els.hslS);
    color_clip(!gamutOk, els.hslL);
    if (source !== 'hsl:hsl') {
        els.hslH.value = hslH.toFixed(dgrPrcs);
        els.hslS.value = hslS.toFixed(valPrcs);
        els.hslL.value = hslL.toFixed(valPrcs);
        color_invalid(false, els.hslH);
        color_invalid(false, els.hslS);
        color_invalid(false, els.hslL);
    }

    if (source !== 'hsl.hsl') {
        els.hslHsl.value = `hsl(${hslH.toFixed(dgrPrcs)}, ${hslS.toFixed(valPrcs)}, ${hslL.toFixed(valPrcs)})`;
    }

    color_clip(!gamutOk, els.hsvH);
    color_clip(!gamutOk, els.hsvS);
    color_clip(!gamutOk, els.hsvV);
    if (source !== 'hsv:hsv') {
        els.hsvH.value = hsvH.toFixed(dgrPrcs);
        els.hsvS.value = hsvS.toFixed(valPrcs);
        els.hsvV.value = hsvV.toFixed(valPrcs);
        color_invalid(false, els.hsvH);
        color_invalid(false, els.hsvS);
        color_invalid(false, els.hsvV);
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

function color_invalid(enable, elem) {
    if (!elem.color_invalid && enable) {
        color_alert_buttons(elem);
        let button = document.createElement("button");
        button.className = "color-alert invalid";
        button.title = "颜色数值不合法（产生色彩空间冲突）";

        elem.color_invalid = button;
        elem.alert_buttons.appendChild(button);
    } else if (elem.color_invalid && !enable) {
        elem.alert_buttons.removeChild(elem.color_invalid);
        elem.color_invalid = undefined;
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
    { keys: ['srgbR', 'srgbG', 'srgbB'], toSrgb: (a, b, c) => [a, b, c], source: 'srgb-float:rgb' },
    { keys: ['srgbUintR', 'srgbUintG', 'srgbUintB'], toSrgb: (a, b, c) => [Math.round(a) / 255, Math.round(b) / 255, Math.round(c) / 255], source: 'srgb-uint:rgb' },
    { keys: ['srgbLinearR', 'srgbLinearG', 'srgbLinearB'], toSrgb: (a, b, c) => srgbLinearToSensitive(a, b, c), source: 'srgb-linear:rgb' },
    { keys: ['hslH', 'hslS', 'hslL'], toSrgb: hslToSrgb, source: 'hsl:hsl', clip: true },
    { keys: ['hsvH', 'hsvS', 'hsvV'], toSrgb: hsvToSrgb, source: 'hsv:hsv', clip: true },
    { keys: ['oklchL', 'oklchC', 'oklchH'], toSrgb: oklchToSrgb, source: 'oklch:lch' },
    { keys: ['oklabL', 'oklabA', 'oklabB'], toSrgb: oklabToSrgb, source: 'oklab:lab' },
    { keys: ['lmsL', 'lmsM', 'lmsS'], toSrgb: (l, m, s) => srgbLinearToSensitive(...lmsToSrgbLinear(l, m, s)), source: 'lms:lms' },
];

INPUT_SPACES.forEach(def => def.keys.forEach(k => {
    const el = els[k];
    el.classList.add('drag');
    const label = el.parentElement.querySelector('label');
    if (label) label.classList.add('drag');
}));

function tryParseHex(hex) {
    hex = hex.replace(/^#/, '').trim();
    if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) return null;
    return hexToRgb(hex);
}

els.srgbHex.addEventListener('input', () => {
    const rgb = tryParseHex(els.srgbHex.value);
    if (!rgb) return;
    updateAll(rgb[0], rgb[1], rgb[2], 'srgb-uint.hex');
});

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
                def.keys.forEach(k => color_invalid(outOfGamut, els[k]));
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

let dragPlane = null;
let dragCfg = null;
let dragLabel = null;
let dragLabelInput = null;
let dragLabelInitX = 0;
let dragLabelInitVal = 0;

function pickFromPlane(canvas, cfg, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const xn = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const yn = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const v = readHs(cfg.space);

    if (cfg.type === 'wheel') {
        const dx = xn - 0.5, dy = 0.5 - yn;
        const rad = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
        const ang = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);
        v[cfg.rad] = rad * (cfg.radMax || 1);
        v[cfg.ang] = ang;
    } else if (cfg.type === 'bar') {
        v[cfg.var] = 1 - yn;
    } else {
        const xMin = cfg.xMin ?? 0, xMax = cfg.xMax ?? 1;
        const yMin = cfg.yMin ?? 0, yMax = cfg.yMax ?? 1;
        v[cfg.x] = xMin + xn * (xMax - xMin);
        v[cfg.y] = yMin + (1 - yn) * (yMax - yMin);
    }

    const source = SPACE_META[cfg.space].source;
    let [r, g, b] = SPACE_META[cfg.space].toSrgb(v);

    if (cfg.space === 'hsl' || cfg.space === 'hsv') {
        const cr = Math.max(0, Math.min(1, r));
        const cg = Math.max(0, Math.min(1, g));
        const cb = Math.max(0, Math.min(1, b));
        const outOfGamut = cr !== r || cg !== g || cb !== b;
        SPACE_META[cfg.space].els.forEach(e => color_invalid(outOfGamut, els[e]));
        r = cr; g = cg; b = cb;
    }

    writeHs(cfg.space, v);
    updateAll(r, g, b, source);
}

// ---- Plane drag ----

function startPlaneDrag(e, clientX, clientY) {
    const canvas = e.target.closest('.color-plane');
    if (!canvas) return;
    const cfg = PLANES.find(p => p.id === canvas.id) || POLARS.find(p => p.id === canvas.id);
    if (!cfg) return;
    dragPlane = canvas;
    dragCfg = cfg;
    pickFromPlane(canvas, cfg, clientX, clientY);
    e.preventDefault();
}

function movePlaneDrag(e, clientX, clientY) {
    if (!dragPlane) return;
    pickFromPlane(dragPlane, dragCfg, clientX, clientY);
    e.preventDefault();
}

// ---- Label drag ----

function startLabelDrag(e, clientX) {
    const label = e.target.closest('.color-value>div>label');
    if (!label) return;
    const input = label.parentElement.querySelector('input');
    if (!input || !input.classList.contains('drag')) return;
    dragLabel = label;
    dragLabelInput = input;
    dragLabelInitX = clientX;
    dragLabelInitVal = parseFloat(input.value) || 0;
    e.preventDefault();
}

function moveLabelDrag(e, clientX) {
    if (!dragLabel) return;
    const delta = clientX - dragLabelInitX;
    const isUint = dragLabelInput.id.indexOf('-uint:') !== -1;
    let step = isUint ? 1 : 0.003;
    if (e.shiftKey) step *= 0.1;
    let val = dragLabelInitVal + delta * step;
    if (isUint) {
        val = Math.round(Math.max(0, Math.min(255, val)));
    } else {
        const prec = e.shiftKey ? 10000 : 1000;
        val = Math.round(val * prec) / prec;
    }
    dragLabelInput.value = val;
    dragLabelInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function stopAllDrag() {
    dragPlane = null;
    dragCfg = null;
    dragLabel = null;
    dragLabelInput = null;
}

// ---- Event bindings ----

document.addEventListener('mousedown', e => {
    startPlaneDrag(e, e.clientX, e.clientY);
    startLabelDrag(e, e.clientX);
});

document.addEventListener('mousemove', e => {
    movePlaneDrag(e, e.clientX, e.clientY);
    moveLabelDrag(e, e.clientX);
});

document.addEventListener('mouseup', stopAllDrag);

document.addEventListener('touchstart', e => {
    const t = e.touches[0];
    startPlaneDrag(e, t.clientX, t.clientY);
    startLabelDrag(e, t.clientX);
}, { passive: false });

document.addEventListener('touchmove', e => {
    const t = e.touches[0];
    movePlaneDrag(e, t.clientX, t.clientY);
    moveLabelDrag(e, t.clientX);
}, { passive: false });

document.addEventListener('touchend', stopAllDrag);

document.addEventListener('transitionend', function (e) {
    if (e.target.classList.contains('color-planes') && !e.target.classList.contains('collapsed')) {
        drawAllPlanes();
    }
});