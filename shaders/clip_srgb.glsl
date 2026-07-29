vec4 gamutClip(vec3 srgb) {
    bool inG = all(greaterThanEqual(srgb, vec3(0.0))) && all(lessThanEqual(srgb, vec3(1.0)));
    if (inG) return vec4(clamp(srgb, 0.0, 1.0), 1.0);
    return vec4(vec3(0.388 * 0.078), 0.078);
}
