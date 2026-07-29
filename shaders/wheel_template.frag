#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_res;
uniform vec2 u_cross;
uniform int u_compA;
uniform int u_compB;
uniform vec3 u_fixedAll;
uniform float u_radMax;

__CONVERT__
__CLIP__

void main() {
    vec2 cp = (v_uv - 0.5) * u_res;
    float r = length(cp);
    float maxR = min(u_res.x, u_res.y) * 0.5;
    vec2 fc = v_uv * u_res;
    float dx = abs(fc.x - u_cross.x * u_res.x);
    float dy = abs(fc.y - u_cross.y * u_res.y);
    float ch = max(step(dy, 0.5), step(dx, 0.5));
    vec4 xhair = vec4(vec3(0.29) * ch * 0.7, ch * 0.7);

    if (r > maxR) {
        fragColor = xhair;
        return;
    }

    float a = atan(-cp.y, cp.x);
    if (a < 0.0) a += 6.2831853;
    vec3 c = u_fixedAll;
    c[u_compA] = a / 6.2831853;
    c[u_compB] = (r / maxR) * u_radMax;

    vec4 base = gamutClip(toSrgb(c));
    vec4 res = xhair + base * (1.0 - xhair.a);
    float alpha = res.a;
    fragColor = alpha > 0.0 ? vec4(res.rgb / alpha, alpha) : vec4(0.0);
}
