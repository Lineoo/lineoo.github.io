#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_res;
uniform vec2 u_cross;
uniform int u_compA;
uniform vec3 u_fixedAll;

__CONVERT__
__CLIP__

void main() {
    vec3 c = u_fixedAll;
    c[u_compA] = 1.0 - v_uv.y;
    vec4 base = gamutClip(toSrgb(c));

    vec2 fc = v_uv * u_res;
    float dx = abs(fc.x - u_cross.x * u_res.x);
    float dy = abs(fc.y - u_cross.y * u_res.y);
    float ch = max(step(dy, 0.5), step(dx, 0.5));
    vec4 xhair = vec4(vec3(0.29) * ch * 0.7, ch * 0.7);

    vec4 res = xhair + base * (1.0 - xhair.a);
    float a = res.a;
    fragColor = a > 0.0 ? vec4(res.rgb / a, a) : vec4(0.0);
}
