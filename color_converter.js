
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

// XYZ matrices (D65 white point)

function mul3x3(m, v) {
    return [
        m[0]*v[0] + m[1]*v[1] + m[2]*v[2],
        m[3]*v[0] + m[4]*v[1] + m[5]*v[2],
        m[6]*v[0] + m[7]*v[1] + m[8]*v[2],
    ];
}

function inv3x3(m) {
    const d = m[0]*(m[4]*m[8]-m[5]*m[7]) - m[1]*(m[3]*m[8]-m[5]*m[6]) + m[2]*(m[3]*m[7]-m[4]*m[6]);
    return [
        (m[4]*m[8]-m[5]*m[7])/d, (m[2]*m[7]-m[1]*m[8])/d, (m[1]*m[5]-m[2]*m[4])/d,
        (m[5]*m[6]-m[3]*m[8])/d, (m[0]*m[8]-m[2]*m[6])/d, (m[2]*m[3]-m[0]*m[5])/d,
        (m[3]*m[7]-m[4]*m[6])/d, (m[1]*m[6]-m[0]*m[7])/d, (m[0]*m[4]-m[1]*m[3])/d,
    ];
}

// sRGB <-> XYZ
const sRgbToXyzM = [
    0.4123908 , 0.35758434, 0.18048079,
    0.21263901, 0.71516868, 0.07219232,
    0.01933082, 0.11919478, 0.95053215,
];
const xyzToSRgbM = inv3x3(sRgbToXyzM);

// Display P3 <-> sRGB

const p3ToXyzM = [
    0.48657095, 0.26566769, 0.19821729,
    0.22897456, 0.69173852, 0.07928691,
    0.00000000, 0.04511338, 1.04394437,
];
const xyzToP3M = inv3x3(p3ToXyzM);

function p3ToSrgb(r, g, b) {
    const [lr, lg, lb] = srgbSensitiveToLinear(r, g, b);
    const [x, y, z] = mul3x3(p3ToXyzM, [lr, lg, lb]);
    return srgbLinearToSensitive(...mul3x3(xyzToSRgbM, [x, y, z]));
}

function srgbToP3(r, g, b) {
    const [lr, lg, lb] = srgbSensitiveToLinear(r, g, b);
    const [x, y, z] = mul3x3(sRgbToXyzM, [lr, lg, lb]);
    return srgbLinearToSensitive(...mul3x3(xyzToP3M, [x, y, z]));
}

// Rec.2020 <-> sRGB

const rec2020ToXyzM = [
    0.63697360, 0.14462057, 0.16885575,
    0.26270669, 0.67799807, 0.05929524,
    0.00000000, 0.02807269, 1.06098508,
];
const xyzToRec2020M = inv3x3(rec2020ToXyzM);

function rec2020Encode(l) {
    if (l < 0.0181) return 4.5 * l;
    return 1.0993 * Math.pow(l, 0.45) - 0.0993;
}

function rec2020Decode(v) {
    if (v < 0.08145) return v / 4.5;
    return Math.pow((v + 0.0993) / 1.0993, 1 / 0.45);
}

function rec2020ToSrgb(r, g, b) {
    const lr = rec2020Decode(r), lg = rec2020Decode(g), lb = rec2020Decode(b);
    const [x, y, z] = mul3x3(rec2020ToXyzM, [lr, lg, lb]);
    return srgbLinearToSensitive(...mul3x3(xyzToSRgbM, [x, y, z]));
}

function srgbToRec2020(r, g, b) {
    const [lr, lg, lb] = srgbSensitiveToLinear(r, g, b);
    const [x, y, z] = mul3x3(sRgbToXyzM, [lr, lg, lb]);
    const [lR, lG, lB] = mul3x3(xyzToRec2020M, [x, y, z]);
    return [rec2020Encode(lR), rec2020Encode(lG), rec2020Encode(lB)];
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

// ===== WebGL2 Renderer =====

const IS_P3 = (() => {
    try {
        return CSS.supports('color', 'color(display-p3 1 0 0)') &&
               matchMedia('(color-gamut: p3)').matches;
    } catch { return false; }
})();
const IS_REC2020 = (() => {
    try {
        return CSS.supports('color', 'color(rec2020 1 0 0)') &&
               matchMedia('(color-gamut: rec2020)').matches;
    } catch { return false; }
})();
const CLIP_NAMES = { srgb: 'sRGB', p3: 'Display P3', rec2020: 'Rec.2020' };
const DISPLAY_GAMUT = IS_REC2020 ? 'rec2020' : (IS_P3 ? 'p3' : 'srgb');
const DISPLAY_GAMUT_LABEL = { srgb: 'sRGB', p3: 'P3 广色域', rec2020: 'Rec.2020 广色域' }[DISPLAY_GAMUT];

// 浏览器是否支持以 Rec.2020 作为 WebGL 绘制缓冲色域（原生输出，无需经由 P3 近似）
const CAN_REC2020_OUTPUT = (() => {
    try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2', { drawingBufferColorSpace: 'rec2020' });
        return !!(gl && gl.drawingBufferColorSpace === 'rec2020');
    } catch { return false; }
})();

function getCS() {
    if (CLIP_MODE === 'srgb') return 'srgb';
    if (CLIP_MODE === 'rec2020' && CAN_REC2020_OUTPUT) return 'rec2020';
    return IS_P3 ? 'display-p3' : 'srgb';
}

function resolveClip(choice) {
    return choice === 'auto' ? DISPLAY_GAMUT : choice;
}

let CLIP_CHOICE = (() => {
    try {
        const p = new URLSearchParams(location.search);
        if (p.get('clip') === 'rec2020') return 'rec2020';
        if (p.get('clip') === 'srgb') return 'srgb';
        if (p.get('clip') === 'p3' && IS_P3) return 'p3';
    } catch {}
    return 'auto';
})();
let CLIP_MODE = resolveClip(CLIP_CHOICE);
let CS = getCS();

function updateGamutInfo() {
    document.getElementById('gamut-info').textContent =
        '显示器色域：' + DISPLAY_GAMUT_LABEL +
        '\u2003裁定标准：' + CLIP_NAMES[CLIP_MODE] +
        '\u2003输出：' + (CS === 'display-p3' ? 'Display P3' : (CS === 'rec2020' ? 'Rec.2020' : 'sRGB')) +
        (CLIP_MODE === 'rec2020' && !CAN_REC2020_OUTPUT ? '（Rec.2020 值经由 P3 近似显示）' : '');
}

function updateGamutButtons() {
    const p3Btn = document.getElementById('gamut-btn-p3');
    if (p3Btn) {
        p3Btn.disabled = !IS_P3;
        p3Btn.title = IS_P3 ? '以 Display P3 为钳制色域' : '当前显示器不支持 Display P3 钳制';
    }
    const autoBtn = document.querySelector('.gamut-btn[data-clip="auto"]');
    if (autoBtn) autoBtn.title = '按当前显示器色域钳制（' + DISPLAY_GAMUT_LABEL + '）';
    document.querySelectorAll('.gamut-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.clip === CLIP_CHOICE);
    });
}

function applyClipChoice(choice) {
    CLIP_CHOICE = choice;
    CLIP_MODE = resolveClip(choice);
    CS = getCS();
    updateGamutInfo();
    updateGamutButtons();
    try {
        const u = new URL(location.href);
        if (choice === 'auto') u.searchParams.delete('clip');
        else u.searchParams.set('clip', choice);
        history.replaceState(null, '', u);
    } catch {}
    // 重建 WebGL 渲染器，使其按新的钳制色域编译片元着色器
    _gl = null;
    _glFailed = false;
    getGL();
    drawAllPlanes();
}

document.getElementById('display-gamut-name').textContent = DISPLAY_GAMUT_LABEL;
document.querySelectorAll('.gamut-btn').forEach(btn => {
    btn.addEventListener('click', () => applyClipChoice(btn.dataset.clip));
});
updateGamutInfo();
updateGamutButtons();

class WebGLColorRenderer {
    constructor() {
        this.c = document.createElement('canvas');
        this.gl = this.c.getContext('webgl2', {
            preserveDrawingBuffer: true,
            premultipliedAlpha: false,
            alpha: true,
            drawingBufferColorSpace: CS,
        });
        if (!this.gl) throw new Error('WebGL2 not available');
        this.prog = {};
        this.vao = null;
        this.ready = false;
    }

    async init() {
        const gl = this.gl;
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);

        const vertSrc = await fetch('shaders/quad.vert').then(r => r.text());
        const [pT, wT, bT] = await Promise.all([
            fetch('shaders/plane_template.frag').then(r => r.text()),
            fetch('shaders/wheel_template.frag').then(r => r.text()),
            fetch('shaders/bar_template.frag').then(r => r.text()),
        ]);
        const dispFn = CLIP_MODE === 'rec2020' && CAN_REC2020_OUTPUT
            ? 'srgbToRec2020' : (IS_P3 ? 'srgbToP3' : 'sRGBPassthrough');
        const clipSrc = await fetch('shaders/clip_' + CLIP_MODE + '.glsl').then(r => r.text())
            .then(s => s.replace('__DISP__', dispFn));
        const spaceNames = ['srgb','srgb-linear','p3','rec2020','lms','oklab','oklch','hsl','hsv'];
        const polarSpaces = new Set(['hsl','hsv','oklch']);

        for (const n of spaceNames) {
            const conv = await fetch('shaders/' + n + '.glsl').then(r => r.text());
            this.prog[n] = {
                p: this._link(vertSrc, pT.replace('__CONVERT__', conv).replace('__CLIP__', clipSrc)),
            };
            if (polarSpaces.has(n)) {
                this.prog[n].w = this._link(vertSrc, wT.replace('__CONVERT__', conv).replace('__CLIP__', clipSrc));
                this.prog[n].b = this._link(vertSrc, bT.replace('__CONVERT__', conv).replace('__CLIP__', clipSrc));
            }
        }
        this.ready = true; drawAllPlanes();
    }

    _compile(type, src) {
        const gl = this.gl, s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(s));
            return null;
        }
        return s;
    }

    _link(vs, fs) {
        const gl = this.gl;
        const v = this._compile(gl.VERTEX_SHADER, vs);
        const f = this._compile(gl.FRAGMENT_SHADER, fs);
        if (!v || !f) return null;
        const p = gl.createProgram();
        gl.attachShader(p, v);
        gl.attachShader(p, f);
        gl.bindAttribLocation(p, 0, 'a_pos');
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(p));
            return null;
        }
        const u = {};
        for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) {
            const info = gl.getActiveUniform(p, i);
            u[info.name] = gl.getUniformLocation(p, info.name);
        }
        return { p, u };
    }

    _draw(target, name, tp, compA, compB, fixed, radMax, cx, cy, rA, rB) {
        const gl = this.gl;
        const r = target.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = Math.floor(r.width * dpr), h = Math.floor(r.height * dpr);
        if (w < 1 || h < 1) return;
        this.c.width = w;
        this.c.height = h;
        target.width = w;
        target.height = h;
        gl.viewport(0, 0, w, h);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        const sh = this.prog[name];
        if (!sh || !sh[tp]) return;
        const pg = sh[tp];
        gl.useProgram(pg.p);
        const u = pg.u;
        gl.uniform2f(u.u_res, w, h);
        gl.uniform2f(u.u_cross, cx, cy);
        if (tp === 'p' || tp === 'w') { gl.uniform1i(u.u_compA, compA); gl.uniform1i(u.u_compB, compB); }
        if (tp === 'b') gl.uniform1i(u.u_compA, compA);
        gl.uniform3f(u.u_fixedAll, fixed[0], fixed[1], fixed[2]);
        if (tp === 'p') { gl.uniform2f(u.u_rangeA, rA[0], rA[1]); gl.uniform2f(u.u_rangeB, rB[0], rB[1]); }
        if (tp === 'w') gl.uniform1f(u.u_radMax, radMax);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        target.getContext('2d', { colorSpace: CS }).drawImage(this.c, 0, 0);
    }
}

let _gl = null, _glFailed = false;
function getGL() {
    if (_glFailed) return null;
    if (_gl !== null) return _gl;
    try {
        _gl = new WebGLColorRenderer();
        _gl.init()
            .then(() => document.getElementById('cpu-warn').style.display = 'none')
            .catch(e => {
                console.warn('WebGL2 init failed:', e);
                _gl = null; _glFailed = true;
                document.getElementById('cpu-warn').style.display = '';
            });
    } catch (e) {
        _gl = null; _glFailed = true;
        document.getElementById('cpu-warn').style.display = '';
    }
    return _gl;
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
    p3R: document.getElementById('p3:r'),
    p3G: document.getElementById('p3:g'),
    p3B: document.getElementById('p3:b'),
    rec2020R: document.getElementById('rec2020:r'),
    rec2020G: document.getElementById('rec2020:g'),
    rec2020B: document.getElementById('rec2020:b'),
    p3Color: document.getElementById('p3.color'),
    rec2020Color: document.getElementById('rec2020.color'),
};

// ---- Color plane configuration ----

const SPACES = {
    srgb: {
        keys: ['r', 'g', 'b'], els: ['srgbR', 'srgbG', 'srgbB'], precs: [valPrcs, valPrcs, valPrcs],
        toSrgb: v => [v.r, v.g, v.b], source: 'srgb-float:rgb', planeId: 'srgb',
    },
    'srgb-linear': {
        keys: ['R', 'G', 'B'], els: ['srgbLinearR', 'srgbLinearG', 'srgbLinearB'], precs: [valPrcs, valPrcs, valPrcs],
        toSrgb: v => srgbLinearToSensitive(v.R, v.G, v.B), source: 'srgb-linear:rgb', planeId: 'lin',
    },
    lms: {
        keys: ['L', 'M', 'S'], els: ['lmsL', 'lmsM', 'lmsS'], precs: [valPrcs, valPrcs, valPrcs],
        toSrgb: v => srgbLinearToSensitive(...lmsToSrgbLinear(v.L, v.M, v.S)), source: 'lms:lms', planeId: 'lms',
    },
    hsl: {
        keys: ['h', 's', 'l'], els: ['hslH', 'hslS', 'hslL'], precs: [dgrPrcs, valPrcs, valPrcs],
        toSrgb: v => hslToSrgb(v.h, v.s, v.l), source: 'hsl:hsl', planeId: 'hsl', clip: true,
        polarWheel: { rad: 's', ang: 'h', fix: 'l' },
        polarBar:   { var: 'l', hue: 'h', sat: 's' },
    },
    hsv: {
        keys: ['h', 's', 'v'], els: ['hsvH', 'hsvS', 'hsvV'], precs: [dgrPrcs, valPrcs, valPrcs],
        toSrgb: v => hsvToSrgb(v.h, v.s, v.v), source: 'hsv:hsv', planeId: 'hsv', clip: true,
        polarWheel: { rad: 's', ang: 'h', fix: 'v' },
        polarBar:   { var: 'v', hue: 'h', sat: 's' },
    },
    oklab: {
        keys: ['L', 'a', 'b'], els: ['oklabL', 'oklabA', 'oklabB'], precs: [valPrcs, valPrcs, valPrcs],
        toSrgb: v => oklabToSrgb(v.L, v.a, v.b), source: 'oklab:lab', planeId: 'oklab',
        planes: [{ id: 'oklab-la', x: 'a', y: 'L' }, { id: 'oklab-lb', x: 'b', y: 'L' }, { id: 'oklab-ab', x: 'a', y: 'b' }],
        axisRanges: { a: [-0.4, 0.4], b: [-0.4, 0.4] },
    },
    oklch: {
        keys: ['L', 'C', 'H'], els: ['oklchL', 'oklchC', 'oklchH'], precs: [valPrcs, valPrcs, dgrPrcs],
        toSrgb: v => oklchToSrgb(v.L, v.C, v.H), source: 'oklch:lch', planeId: 'oklch',
        planes: [{ id: 'oklch-lc', x: 'L', y: 'C' }, { id: 'oklch-lh', x: 'H', y: 'L' }, { id: 'oklch-ch', x: 'H', y: 'C' }],
        axisRanges: { C: [0, 0.4] },
        polarWheel: { rad: 'C', ang: 'H', fix: 'L', radMax: 0.4 },
        polarBar:   { var: 'L', hue: 'H', sat: 'C' },
    },
    p3: {
        keys: ['r', 'g', 'b'], els: ['p3R', 'p3G', 'p3B'], precs: [valPrcs, valPrcs, valPrcs],
        toSrgb: v => p3ToSrgb(v.r, v.g, v.b), source: 'p3:rgb', planeId: 'p3',
    },
    'rec2020': {
        keys: ['r', 'g', 'b'], els: ['rec2020R', 'rec2020G', 'rec2020B'], precs: [valPrcs, valPrcs, valPrcs],
        toSrgb: v => rec2020ToSrgb(v.r, v.g, v.b), source: 'rec2020:rgb', planeId: 'rec2020',
    },
};

const PLANES = [];
const POLARS = [];

for (const [name, s] of Object.entries(SPACES)) {
    const pairs = s.planes || (() => {
        const p = [];
        for (let i = 0; i < s.keys.length; i++)
            for (let j = i + 1; j < s.keys.length; j++)
                p.push({ x: s.keys[i], y: s.keys[j] });
        return p;
    })();
    for (const p of pairs) {
        const cfg = { id: p.id || `${s.planeId}-${p.x}${p.y}`.toLowerCase(), space: name, x: p.x, y: p.y };
        const rx = s.axisRanges?.[p.x], ry = s.axisRanges?.[p.y];
        if (rx) { cfg.xMin = rx[0]; cfg.xMax = rx[1]; }
        if (ry) { cfg.yMin = ry[0]; cfg.yMax = ry[1]; }
        PLANES.push(cfg);
    }
    if (s.polarWheel) POLARS.push({ id: `${s.planeId}-wheel`, space: name, type: 'wheel', ...s.polarWheel });
    if (s.polarBar)   POLARS.push({ id: `${s.planeId}-bar`,   space: name, type: 'bar',   ...s.polarBar });
}

function readHs(space) {
    const m = SPACES[space];
    const v = {};
    m.keys.forEach((k, i) => v[k] = parseFloat(els[m.els[i]].value) || 0);
    return v;
}

function writeHs(space, v) {
    const m = SPACES[space];
    m.els.forEach((e, i) => els[e].value = v[m.keys[i]].toFixed(m.precs[i]));
}

// ---- Plane drawing ----

function drawColorPlane(canvas, colorFn, mx, my, _glInfo) {
    if (!canvas) return;
    const gl = getGL();
    if (gl && gl.ready && _glInfo) {
        const [sp, cA, cB, fixAll, rA, rB] = _glInfo;
        gl._draw(canvas, sp, 'p', cA, cB, fixAll, 0, mx, my, rA, rB);
        return;
    }
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(rect.width * dpr), h = Math.floor(rect.height * dpr);
    if (rect.width < 10 || rect.height < 10) return;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!canvas._buf || canvas._buf.w !== w || canvas._buf.h !== h)
        canvas._buf = { w, h, data: ctx.createImageData(w, h) };
    const imageData = canvas._buf.data;

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

    const cx = Math.round(mx * w);
    const cy = Math.round(my * h);

    ctx.strokeStyle = 'oklch(50% 0 0 / 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
}

function drawWheel(canvas, space, radKey, angKey, radMax, _glInfo) {
    if (!canvas) return;
    const gl = getGL();
    if (gl && gl.ready && _glInfo) {
        const [sp, cAng, cRad, fixAll, rm, cx, cy] = _glInfo;
        gl._draw(canvas, sp, 'w', cAng, cRad, fixAll, rm, cx, cy, [0,1], [0,1]);
        return;
    }
    radMax = radMax || 1;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(rect.width * dpr), h = Math.floor(rect.height * dpr);
    if (rect.width < 10 || rect.height < 10) return;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!canvas._buf || canvas._buf.w !== w || canvas._buf.h !== h)
        canvas._buf = { w, h, data: ctx.createImageData(w, h) };
    const imageData = canvas._buf.data;
    const cx2 = w / 2, cy2 = h / 2, maxR = Math.min(w, h) / 2;
    const v = readHs(space);

    for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
            const dx = px - cx2, dy = py - cy2;
            const r = Math.sqrt(dx * dx + dy * dy);
            const idx = (py * w + px) * 4;
            if (r > maxR) { imageData.data[idx + 3] = 0; continue; }

            const angle = (Math.atan2(-dy, dx) + Math.PI * 2) % (Math.PI * 2);
            const vals = { ...v };
            vals[radKey] = (r / maxR) * radMax;
            vals[angKey] = angle / (Math.PI * 2);

            const [cr, cg, cb] = SPACES[space].toSrgb(vals);
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
    const mx = Math.round(cx2 + rad * maxR * Math.cos(ang));
    const my = Math.round(cy2 - rad * maxR * Math.sin(ang));

    ctx.strokeStyle = 'oklch(50% 0 0 / 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, my); ctx.lineTo(w, my); ctx.stroke();
}

function drawBar(canvas, space, varKey, _glInfo) {
    if (!canvas) return;
    const gl = getGL();
    if (gl && gl.ready && _glInfo) {
        const [sp, cVar, fixAll, cx, cy] = _glInfo;
        gl._draw(canvas, sp, 'b', cVar, 0, fixAll, 0, cx, cy, [0,1], [0,1]);
        return;
    }
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(rect.width * dpr), h = Math.floor(rect.height * dpr);
    if (rect.width < 10 || rect.height < 10) return;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!canvas._buf || canvas._buf.w !== w || canvas._buf.h !== h)
        canvas._buf = { w, h, data: ctx.createImageData(w, h) };
    const imageData = canvas._buf.data;
    const v = readHs(space);

    for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
            const vals = { ...v };
            vals[varKey] = 1 - py / h;
            const [cr, cg, cb] = SPACES[space].toSrgb(vals);
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
    const y = Math.round((1 - val) * h);

    ctx.strokeStyle = 'oklch(50% 0 0 / 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
}

const drawTimeLimit = 50;

let lastDrawTime = 0;
let drawDebounce = null;

function drawAllPlanes() {
    const gl = getGL();
    if (gl && gl.ready) {
        clearTimeout(drawDebounce); drawPlanesNow(); return;
    }
    if (IS_P3) return; // on P3, wait for GPU — CPU writes sRGB to P3 canvas

    const now = Date.now();
    if (now - lastDrawTime >= drawTimeLimit) {
        lastDrawTime = now;
        clearTimeout(drawDebounce);
        drawPlanesNow();
    }
    clearTimeout(drawDebounce);
    drawDebounce = setTimeout(() => {
        lastDrawTime = 0;
        drawPlanesNow();
    }, drawTimeLimit);
}

function drawPlanesNow() {
    const gl = getGL();
    const useGL = gl && gl.ready;
    if (IS_P3 && !useGL) return;

    for (const cfg of PLANES) {
        const canvas = document.getElementById(cfg.id);
        if (!canvas || canvas.parentElement.classList.contains('collapsed')) continue;
        const v = readHs(cfg.space);

        const xMin = cfg.xMin ?? 0, xMax = cfg.xMax ?? 1;
        const yMin = cfg.yMin ?? 0, yMax = cfg.yMax ?? 1;

        let glInfo = null;
        if (useGL) {
            const keys = SPACES[cfg.space].keys;
            const cA = keys.indexOf(cfg.x);
            const cB = keys.indexOf(cfg.y);
            const fixKey = keys.find(k => k !== cfg.x && k !== cfg.y);
            const fixAll = [0, 0, 0];
            fixAll[keys.indexOf(fixKey)] = v[fixKey];
            glInfo = [cfg.space, cA, cB, fixAll, [xMin, xMax], [yMin, yMax]];
        }

        drawColorPlane(
            canvas,
            (x, y) => {
                const vals = { ...v };
                vals[cfg.x] = xMin + x * (xMax - xMin);
                vals[cfg.y] = yMin + (1 - y) * (yMax - yMin);
                return SPACES[cfg.space].toSrgb(vals);
            },
            (v[cfg.x] - xMin) / (xMax - xMin),
            1 - (v[cfg.y] - yMin) / (yMax - yMin),
            glInfo
        );
    }

    for (const p of POLARS) {
        const canvas = document.getElementById(p.id);
        if (!canvas || canvas.parentElement.classList.contains('collapsed')) continue;
        if (p.type === 'wheel') {
            let glInfo = null;
            if (useGL) {
                const v = readHs(p.space);
                const keys = SPACES[p.space].keys;
                const cAng = keys.indexOf(p.ang);
                const cRad = keys.indexOf(p.rad);
                const fixAll = [0, 0, 0];
                fixAll[keys.indexOf(p.fix)] = v[p.fix];
                const rm = p.radMax || 1;
                const rad = (v[p.rad] || 0) / rm;
                const ang = (v[p.ang] || 0) * Math.PI * 2;
                glInfo = [p.space, cAng, cRad, fixAll, rm,
                    0.5 + rad * 0.5 * Math.cos(ang),
                    0.5 - rad * 0.5 * Math.sin(ang)];
            }
            drawWheel(canvas, p.space, p.rad, p.ang, p.radMax, glInfo);
        } else {
            let glInfo = null;
            if (useGL) {
                const v = readHs(p.space);
                const keys = SPACES[p.space].keys;
                const cVar = keys.indexOf(p.var);
                const fixAll = [0, 0, 0];
                fixAll[keys.indexOf(p.hue)] = v[p.hue];
                fixAll[keys.indexOf(p.sat)] = v[p.sat];
                glInfo = [p.space, cVar, fixAll, -1, 1 - (v[p.var] || 0)];
            }
            drawBar(canvas, p.space, p.var, glInfo);
        }
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
    const [p3R, p3G, p3B] = srgbToP3(r, g, b);
    const [r2020R, r2020G, r2020B] = srgbToRec2020(r, g, b);

    const NUM_OUTPUTS = [
        { els: ['srgbR','srgbG','srgbB'],                   vals: [r,g,b],      precs: [valPrcs,valPrcs,valPrcs],   src: 'srgb-float:rgb'      },
        { els: ['srgbLinearR','srgbLinearG','srgbLinearB'], vals: [linR,linG,linB], precs: [valPrcs,valPrcs,valPrcs], src: 'srgb-linear:rgb'   },
        { els: ['hslH','hslS','hslL'],                       vals: [hslH,hslS,hslL], precs: [dgrPrcs,valPrcs,valPrcs], src: 'hsl:hsl'           },
        { els: ['hsvH','hsvS','hsvV'],                       vals: [hsvH,hsvS,hsvV], precs: [dgrPrcs,valPrcs,valPrcs], src: 'hsv:hsv'           },
        { els: ['oklchL','oklchC','oklchH'],                 vals: [lchL,lchC,lchH], precs: [valPrcs,valPrcs,dgrPrcs], src: 'oklch:lch'         },
        { els: ['oklabL','oklabA','oklabB'],                 vals: [labL,labA,labB], precs: [valPrcs,valPrcs,valPrcs], src: 'oklab:lab'         },
        { els: ['lmsL','lmsM','lmsS'],                       vals: [lmsL,lmsM,lmsS], precs: [valPrcs,valPrcs,valPrcs], src: 'lms:lms'           },
        { els: ['p3R','p3G','p3B'],                           vals: [p3R,p3G,p3B], precs: [valPrcs,valPrcs,valPrcs], src: 'p3:rgb'             },
        { els: ['rec2020R','rec2020G','rec2020B'],             vals: [r2020R,r2020G,r2020B], precs: [valPrcs,valPrcs,valPrcs], src: 'rec2020:rgb' },
    ];

    const FMT_OUTPUTS = [
        { el: 'srgbColor',       value: `color(srgb ${r.toFixed(valPrcs)} ${g.toFixed(valPrcs)} ${b.toFixed(valPrcs)})`,                       src: 'srgb-float.color'    },
        { el: 'srgbLinearColor', value: `color(srgb-linear ${linR.toFixed(valPrcs)} ${linG.toFixed(valPrcs)} ${linB.toFixed(valPrcs)})`,        src: 'srgb-linear.color'   },
        { el: 'srgbLinearWgsl',  value: `vec3f(${linR.toFixed(valPrcs)}, ${linG.toFixed(valPrcs)}, ${linB.toFixed(valPrcs)})`,                  src: 'srgb-linear.wgsl'    },
        { el: 'srgbHex',         value: '#' + [uintR, uintG, uintB].map(v => v.toString(16).padStart(2, '0')).join(''),                                                                                               src: 'srgb-uint.hex'       },
        { el: 'srgbRgb',         value: `rgb(${uintR} ${uintG} ${uintB})`,                                                                                               src: 'srgb-uint.rgb'       },
        { el: 'hslHsl',          value: `hsl(${hslH.toFixed(dgrPrcs)}, ${hslS.toFixed(valPrcs)}, ${hslL.toFixed(valPrcs)})`,                   src: 'hsl.hsl'             },
        { el: 'oklchOklch',      value: `oklch(${lchL.toFixed(valPrcs)} ${lchC.toFixed(valPrcs)} ${lchH.toFixed(dgrPrcs)})`,                  src: 'oklch.oklch'         },
        { el: 'oklabOklab',      value: `oklab(${labL.toFixed(valPrcs)} ${labA.toFixed(valPrcs)} ${labB.toFixed(valPrcs)})`,                  src: 'oklab.oklab'         },
        { el: 'p3Color',         value: `color(display-p3 ${p3R.toFixed(valPrcs)} ${p3G.toFixed(valPrcs)} ${p3B.toFixed(valPrcs)})`,          src: 'p3.color'            },
        { el: 'rec2020Color',    value: `color(rec2020 ${r2020R.toFixed(valPrcs)} ${r2020G.toFixed(valPrcs)} ${r2020B.toFixed(valPrcs)})`,     src: 'rec2020.color'       },
    ];

    for (const g of NUM_OUTPUTS) {
        if (source !== g.src) g.els.forEach((e, i) => els[e].value = g.vals[i].toFixed(g.precs[i]));
    }
    for (const g of FMT_OUTPUTS) {
        if (source !== g.src) els[g.el].value = g.value;
    }

    // sRGB alerts + special outputs
    color_overdrive(r < 0 || r > 1, els.srgbUintR);
    color_overdrive(g < 0 || g > 1, els.srgbUintG);
    color_overdrive(b < 0 || b > 1, els.srgbUintB);
    if (source !== 'srgb-uint:rgb') {
        els.srgbUintR.value = Math.round(r * 255);
        els.srgbUintG.value = Math.round(g * 255);
        els.srgbUintB.value = Math.round(b * 255);
    }

    const gamutFail = !gamutOk;
    color_clip(gamutFail, els.srgbHex);
    color_clip(gamutFail, els.srgbRgb);

    // HSL/HSV gamut alerts
    color_clip(gamutFail, els.hslH); color_clip(gamutFail, els.hslS); color_clip(gamutFail, els.hslL);
    if (source !== 'hsl:hsl') {
        color_invalid(false, els.hslH); color_invalid(false, els.hslS); color_invalid(false, els.hslL);
    }
    color_clip(gamutFail, els.hsvH); color_clip(gamutFail, els.hsvS); color_clip(gamutFail, els.hsvV);
    if (source !== 'hsv:hsv') {
        color_invalid(false, els.hsvH); color_invalid(false, els.hsvS); color_invalid(false, els.hsvV);
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
    { space: 'srgb',         keys: ['srgbR','srgbG','srgbB'],                          toSrgb: SPACES.srgb.toSrgb,            source: 'srgb-float:rgb'  },
    { space: 'srgb',         keys: ['srgbUintR','srgbUintG','srgbUintB'],               toSrgb: v => [v.r / 255, v.g / 255, v.b / 255], source: 'srgb-uint:rgb'   },
    { space: 'srgb-linear',  keys: ['srgbLinearR','srgbLinearG','srgbLinearB'],         toSrgb: SPACES['srgb-linear'].toSrgb,   source: 'srgb-linear:rgb' },
    { space: 'hsl',          keys: ['hslH','hslS','hslL'],                              toSrgb: SPACES.hsl.toSrgb,              source: 'hsl:hsl',          clip: true },
    { space: 'hsv',          keys: ['hsvH','hsvS','hsvV'],                              toSrgb: SPACES.hsv.toSrgb,              source: 'hsv:hsv',          clip: true },
    { space: 'oklch',        keys: ['oklchL','oklchC','oklchH'],                        toSrgb: SPACES.oklch.toSrgb,            source: 'oklch:lch'        },
    { space: 'oklab',        keys: ['oklabL','oklabA','oklabB'],                        toSrgb: SPACES.oklab.toSrgb,            source: 'oklab:lab'        },
    { space: 'lms',          keys: ['lmsL','lmsM','lmsS'],                              toSrgb: SPACES.lms.toSrgb,              source: 'lms:lms'          },
    { space: 'p3',           keys: ['p3R','p3G','p3B'],                                toSrgb: SPACES.p3.toSrgb,               source: 'p3:rgb'           },
    { space: 'rec2020',      keys: ['rec2020R','rec2020G','rec2020B'],                   toSrgb: SPACES.rec2020.toSrgb,          source: 'rec2020:rgb'      },
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
            const s = SPACES[def.space];
            const v = {};
            s.keys.forEach((k, i) => v[k] = parseFloat(els[def.keys[i]].value) || 0);
            let [r, g, b] = def.toSrgb(v);

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

    const source = SPACES[cfg.space].source;
    let [r, g, b] = SPACES[cfg.space].toSrgb(v);

    if (cfg.space === 'hsl' || cfg.space === 'hsv') {
        const cr = Math.max(0, Math.min(1, r));
        const cg = Math.max(0, Math.min(1, g));
        const cb = Math.max(0, Math.min(1, b));
        const outOfGamut = cr !== r || cg !== g || cb !== b;
        SPACES[cfg.space].els.forEach(e => color_invalid(outOfGamut, els[e]));
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
        drawPlanesNow();
    }
});