vec3 sRGBPassthrough(vec3 c) { return c; }

vec3 srgbToP3(vec3 srgb) {
    vec3 lin = vec3(
        srgb.r <= 0.04045 ? srgb.r / 12.92 : pow((srgb.r + 0.055) / 1.055, 2.4),
        srgb.g <= 0.04045 ? srgb.g / 12.92 : pow((srgb.g + 0.055) / 1.055, 2.4),
        srgb.b <= 0.04045 ? srgb.b / 12.92 : pow((srgb.b + 0.055) / 1.055, 2.4)
    );
    vec3 xyz = vec3(
        0.4123908*lin.r + 0.35758434*lin.g + 0.18048079*lin.b,
        0.21263901*lin.r + 0.71516868*lin.g + 0.07219232*lin.b,
        0.01933082*lin.r + 0.11919478*lin.g + 0.95053215*lin.b
    );
    vec3 p3l = vec3(
         2.4934969*xyz.x - 0.9313836*xyz.y - 0.4027109*xyz.z,
        -0.8294887*xyz.x + 1.7626641*xyz.y + 0.0236247*xyz.z,
         0.0358458*xyz.x - 0.0761724*xyz.y + 0.9568845*xyz.z
    );
    return vec3(
        p3l.r <= 0.0031308 ? p3l.r * 12.92 : 1.055 * pow(p3l.r, 1.0/2.4) - 0.055,
        p3l.g <= 0.0031308 ? p3l.g * 12.92 : 1.055 * pow(p3l.g, 1.0/2.4) - 0.055,
        p3l.b <= 0.0031308 ? p3l.b * 12.92 : 1.055 * pow(p3l.b, 1.0/2.4) - 0.055
    );
}

float rec2020Encode(float l) {
    return l < 0.0181 ? 4.5 * l : 1.0993 * pow(l, 0.45) - 0.0993;
}

bool inRec2020Gamut(vec3 srgb) {
    vec3 lin = vec3(
        srgb.r <= 0.04045 ? srgb.r / 12.92 : pow((srgb.r + 0.055) / 1.055, 2.4),
        srgb.g <= 0.04045 ? srgb.g / 12.92 : pow((srgb.g + 0.055) / 1.055, 2.4),
        srgb.b <= 0.04045 ? srgb.b / 12.92 : pow((srgb.b + 0.055) / 1.055, 2.4)
    );
    vec3 xyz = vec3(
        0.4123908*lin.r + 0.35758434*lin.g + 0.18048079*lin.b,
        0.21263901*lin.r + 0.71516868*lin.g + 0.07219232*lin.b,
        0.01933082*lin.r + 0.11919478*lin.g + 0.95053215*lin.b
    );
    vec3 rl = vec3(
         1.7166512*xyz.x - 0.3556708*xyz.y - 0.2533663*xyz.z,
        -0.6666844*xyz.x + 1.6164812*xyz.y + 0.0157685*xyz.z,
         0.0176399*xyz.x - 0.0427706*xyz.y + 0.9421031*xyz.z
    );
    vec3 r2020 = vec3(rec2020Encode(rl.r), rec2020Encode(rl.g), rec2020Encode(rl.b));
    return all(greaterThanEqual(r2020, vec3(0.0))) && all(lessThanEqual(r2020, vec3(1.0)));
}

vec4 gamutClip(vec3 srgb) {
    if (inRec2020Gamut(srgb)) {
        vec3 out = __DISP__(srgb);
        return vec4(clamp(out, 0.0, 1.0), 1.0);
    }
    return vec4(vec3(0.388 * 0.078), 0.078);
}
