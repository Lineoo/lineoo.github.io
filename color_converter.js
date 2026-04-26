
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

// Formatting

function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length === 8) hex = hex.slice(0, 6);
    const num = parseInt(hex, 16);
    return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => (Math.round(x * 255) & 255).toString(16).padStart(2, '0')).join('');
}

// ===== UI Logic =====// 

const masonry = new Masonry('.color-cards-grid', {
    itemSelector: '.color-card',
    columnWidth: '.color-card',
    gutter: 20,
    percentPosition: true,
    transitionDuration: '0.1s'
});

let resizeDebounce;
window.addEventListener('resize', () => {
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(() => {
        masonry.layout();
    }, 100);
});

let updating = false;

const initSrgb = [0.24, 0.53, 0.95];
const valPrcs = 3;
const dgrPrcs = 4;
const els = {
    srgbR: document.getElementById('srgb:r'),
    srgbG: document.getElementById('srgb:g'),
    srgbB: document.getElementById('srgb:b'),
    srgbUintR: document.getElementById('srgb.uint:r'),
    srgbUintG: document.getElementById('srgb.uint:g'),
    srgbUintB: document.getElementById('srgb.uint:b'),
    srgbHex: document.getElementById('srgb.hex'),
    srgbRgb: document.getElementById('srgb.rgb'),
    srgbColor: document.getElementById('srgb.color'),
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

function updateAll(r, g, b, source) {
    if (updating) return;
    updating = true;

    const hex = rgbToHex(r, g, b);
    const [hslH, hslS, hslL] = srgbToHsl(r, g, b);
    const [hsvH, hsvS, hsvV] = srgbToHsv(r, g, b);
    const [linR, linG, linB] = srgbSensitiveToLinear(r, g, b);
    const [lmsL, lmsM, lmsS] = srgbLinearToLms(linR, linG, linB);
    const [labL, labA, labB] = lmsToOklab(lmsL, lmsM, lmsS);
    const [lchL, lchC, lchH] = oklabToOklch(labL, labA, labB);

    if (source !== 'srgb:rgb') {
        els.srgbR.value = r.toFixed(valPrcs);
        els.srgbG.value = g.toFixed(valPrcs);
        els.srgbB.value = b.toFixed(valPrcs);
    }

    if (source !== 'srgb.uint:rgb') {
        els.srgbUintR.value = Math.round(r * 255);
        els.srgbUintG.value = Math.round(g * 255);
        els.srgbUintB.value = Math.round(b * 255);
    }

    if (source !== 'srgb.hex') {
        els.srgbHex.value = hex;
    }

    if (source !== 'srgb.rgb') {
        els.srgbRgb.value = `rgb(${r.toFixed(valPrcs)} ${g.toFixed(valPrcs)} ${b.toFixed(valPrcs)})`;
    }

    if (source !== 'srgb.color') {
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
    }

    if (source !== 'hsl.hsl') {
        els.hslHsl.value = `hsl(${hslH.toFixed(dgrPrcs)}, ${hslS.toFixed(valPrcs)}, ${hslL.toFixed(valPrcs)})`;
    }

    if (source !== 'hsv:hsv') {
        els.hsvH.value = hsvH.toFixed(dgrPrcs);
        els.hsvS.value = hsvS.toFixed(valPrcs);
        els.hsvV.value = hsvV.toFixed(valPrcs);
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

    updating = false;
}

// Event Listeners
['srgbR', 'srgbG', 'srgbB'].forEach(id => {
    els[id].addEventListener('input', () => {
        const r = parseFloat(els.srgbR.value) || 0;
        const g = parseFloat(els.srgbG.value) || 0;
        const b = parseFloat(els.srgbB.value) || 0;
        updateAll(r, g, b, 'srgb:rgb');
    });
});

['srgbUintR', 'srgbUintG', 'srgbUintB'].forEach(id => {
    els[id].addEventListener('input', () => {
        const r = Math.round(parseFloat(els.srgbUintR.value)) || 0;
        const g = Math.round(parseFloat(els.srgbUintG.value)) || 0;
        const b = Math.round(parseFloat(els.srgbUintB.value)) || 0;
        updateAll(r / 255, g / 255, b / 255, 'srgb.uint:rgb');
    });
});

['srgbLinearR', 'srgbLinearG', 'srgbLinearB'].forEach(id => {
    els[id].addEventListener('input', () => {
        const linR = parseFloat(els.srgbLinearR.value) || 0;
        const linG = parseFloat(els.srgbLinearG.value) || 0;
        const linB = parseFloat(els.srgbLinearB.value) || 0;
        const [r, g, b] = srgbLinearToSensitive(linR, linG, linB);
        updateAll(r, g, b, 'srgb-linear:rgb');
    });
});

['hslH', 'hslS', 'hslL'].forEach(id => {
    els[id].addEventListener('input', () => {
        const h = parseFloat(els.hslH.value) || 0;
        const s = parseFloat(els.hslS.value) || 0;
        const l = parseFloat(els.hslL.value) || 0;
        const [r, g, b] = hslToSrgb(h, s, l);
        updateAll(r, g, b, 'hsl:hsl');
    });
});

['hsvH', 'hsvS', 'hsvV'].forEach(id => {
    els[id].addEventListener('input', () => {
        const h = parseFloat(els.hsvH.value) || 0;
        const s = parseFloat(els.hsvS.value) || 0;
        const v = parseFloat(els.hsvV.value) || 0;
        const [r, g, b] = hsvToSrgb(h, s, v);
        updateAll(r, g, b, 'hsv:hsv');
    });
});

['oklchL', 'oklchC', 'oklchH'].forEach(id => {
    els[id].addEventListener('input', () => {
        const L = parseFloat(els.oklchL.value) || 0;
        const C = parseFloat(els.oklchC.value) || 0;
        const H = parseFloat(els.oklchH.value) || 0;

        const [labL, labA, labB] = oklchToOklab(L, C, H);
        const [lmsL, lmsM, lmsS] = oklabToLms(labL, labA, labB);
        const [linR, linG, linB] = lmsToSrgbLinear(lmsL, lmsM, lmsS);
        const [r, g, b] = srgbLinearToSensitive(linR, linG, linB);
        updateAll(r, g, b, 'oklch:lch');
    });
});

['oklabL', 'oklabA', 'oklabB'].forEach(id => {
    els[id].addEventListener('input', () => {
        const L = parseFloat(els.oklabL.value) || 0;
        const A = parseFloat(els.oklabA.value) || 0;
        const B = parseFloat(els.oklabB.value) || 0;

        const [lmsL, lmsM, lmsS] = oklabToLms(L, A, B);
        const [linR, linG, linB] = lmsToSrgbLinear(lmsL, lmsM, lmsS);
        const [r, g, b] = srgbLinearToSensitive(linR, linG, linB);
        updateAll(r, g, b, 'oklab:lab');
    });
});

['lmsL', 'lmsM', 'lmsS'].forEach(id => {
    els[id].addEventListener('input', () => {
        const lmsL = parseFloat(els.lmsL.value) || 0;
        const lmsM = parseFloat(els.lmsM.value) || 0;
        const lmsS = parseFloat(els.lmsS.value) || 0;

        const [linR, linG, linB] = lmsToSrgbLinear(lmsL, lmsM, lmsS);
        const [r, g, b] = srgbLinearToSensitive(linR, linG, linB);
        updateAll(r, g, b, 'lms:lms');
    });
});

updateAll(initSrgb[0], initSrgb[1], initSrgb[2], 'init');