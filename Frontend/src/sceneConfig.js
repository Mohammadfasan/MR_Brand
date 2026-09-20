/**
 * Per-tier scene composition.
 *
 * offsetX shifts the entire 3D scene (bottle, lights, rocks, glow, shadow) as
 * one unit, so the composition is preserved rather than re-authored per
 * device: desktop keeps the bottle right of centre against the left-hand
 * copy, while tablet and mobile bring it to centre beneath stacked text.
 *
 * The camera values are solved, not guessed - each tier places the bottle's
 * top and base at known screen percentages across that tier's common
 * viewport sizes (see the framing figures in each comment).
 */
export const SCENE_TIERS = {
  // Bottle spans x 56-83%, top y 16%, base y 87% (1280-2560 wide)
  desktop: {
    offsetX: 1,
    bottleScale: 20,
    fov: 32,
    baseZ: 9.0,
    camY: 0.95,
    lookAt: [0.05, 0.5, 5],
    capRest: [-0.1, 0, 0.048],
    startClosed: true,
  },

  // Bottle spans x 33-67%, top y 45%, base y 89% (portrait tablet)
  tablet: {
    offsetX: -1.1,
    bottleScale: 13.4,
    fov: 34,
    baseZ: 6.0,
    camY: 0.9,
    lookAt: [0, 0.245, 0],
    capRest: [-0.07, 0, 0.055],
    startClosed: true,
  },

  // Bottle spans x 22-78%, top y 50%, base y 94% (360-430 wide)
  mobile: {
    offsetX: -1.1,
    bottleScale: 15.5,
    fov: 40,
    baseZ: 6.0,
    camY: 1.2,
    lookAt: [0, 0.685, 0],
    capRest: [-0.06, 0, 0.06],
    startClosed: true,
  },
}
