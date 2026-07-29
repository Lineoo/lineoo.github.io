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
    vec3 p3lin = vec3(
         2.4934969*xyz.x - 0.9313836*xyz.y - 0.4027109*xyz.z,
        -0.8294887*xyz.x + 1.7626641*xyz.y + 0.0236247*xyz.z,
         0.0358458*xyz.x - 0.0761724*xyz.y + 0.9568845*xyz.z
    );
    return vec3(
        p3lin.r <= 0.0031308 ? p3lin.r * 12.92 : 1.055 * pow(p3lin.r, 1.0/2.4) - 0.055,
        p3lin.g <= 0.0031308 ? p3lin.g * 12.92 : 1.055 * pow(p3lin.g, 1.0/2.4) - 0.055,
        p3lin.b <= 0.0031308 ? p3lin.b * 12.92 : 1.055 * pow(p3lin.b, 1.0/2.4) - 0.055
    );
}

vec4 gamutClip(vec3 srgb) {
    vec3 p3 = srgbToP3(srgb);
    bool inG = all(greaterThanEqual(p3, vec3(0.0))) && all(lessThanEqual(p3, vec3(1.0)));
    if (inG) return vec4(clamp(p3, 0.0, 1.0), 1.0);
    return vec4(vec3(0.388 * 0.078), 0.078);
}
