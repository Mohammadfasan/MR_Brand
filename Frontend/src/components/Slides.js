/**
 * Hero slides - one fragrance per slide.
 *
 * bottle : glass colour          liquid : perfume inside (darker)
 * cap    : cap + collar + sprayer + label metal
 * glow   : light inside the bottle
 * accent : colour of the italic word     eyebrowColor : eyebrow + rule
 * leaves : show green sprigs between the stones
 * glass  : { transmission, env } - how clear / how reflective the glass is
 * light  : the scene lighting for this slide (blends smoothly on change)
 */
export const SLIDES = [
  {
    id: 'ruby',
    eyebrow: 'The Ruby Collection',
    line1: 'Worn Like',
    line2: 'a',
    accentWord: 'Memory',
    description:
      'A scent that stays long after you leave the room. Deep, warm, unforgettable.',
    linkLabel: 'Discover Ruby',
    bottle: '#e60220',
    liquid: '#450006',
    cap: '#e8ab2c', // gold
    glow: '#ff2a3a',
    accent: '#D4A544',
    eyebrowColor: '#D4A544',
    glass: { transmission: 0.9, env: 0.7 },
    // Warm amber candlelight
    light: {
      key: '#fff6ee', // near-white: shows the glass in its true colour
      rimRight: '#ffb267',
      rimLeft: '#ff9f52',
      back: '#ffb74d',
      floorSpot: '#ffaa22',
      halo: '#eeb05c',
      floorGlow: '#ffaf32',
      smoke: '#c9a27a',
      cursor: '#ffcf8a',
      overlay: 'rgba(214, 132, 44, 0.16)',
    },
  },
  {
    id: 'emerald',
    eyebrow: 'The Emerald Collection',
    line1: 'Wild Like',
    line2: 'a',
    accentWord: 'Forest',
    description:
      'Green, cool and alive. A fresh trail of vetiver and fig that breathes with you.',
    linkLabel: 'Discover Emerald',
    bottle: '#12a35c', // clear, bright emerald glass
    liquid: '#064d2c',
    cap: '#cfd3d8', // platinum
    glow: '#1fd18a',
    accent: '#e3e8ee', // pale silver italic, like the reference
    eyebrowColor: '#D4A544', // gold eyebrow + rule
    leaves: true, // green sprigs between the stones
    glass: { transmission: 0.92, env: 0.8 },
    // Reference look: warm GOLD backlight behind a green bottle
    // (the contrast is what makes the emerald glow)
    light: {
      key: '#fff6ee', // near-white: shows the glass in its true colour
      rimRight: '#ffc978',
      rimLeft: '#ffb85c',
      back: '#ffbf5e',
      floorSpot: '#ffb347',
      halo: '#f0b35a',
      floorGlow: '#e8a040',
      smoke: '#bfa27e',
      cursor: '#ffe0a8',
      overlay: 'rgba(214, 150, 60, 0.15)',
    },
  },
  {
    id: 'onyx',
    eyebrow: 'The Onyx Collection',
    line1: 'Dark Like',
    line2: '',
    accentWord: 'Midnight',
    description:
      'Smoked oud and black amber, made for the hours after dark.',
    linkLabel: 'Discover Onyx',
    bottle: '#2a2a2e',
    liquid: '#0b0b0d',
    cap: '#d39a82', // rose gold
    glow: '#c98a5a',
    accent: '#d8a58f',
    eyebrowColor: '#d8a58f',
    // Less transmission so dark glass stays deep black, not milky grey
    glass: { transmission: 0.55, env: 0.6 },
    // Smoky copper / rose-gold
    light: {
      key: '#fff6ee', // near-white: shows the glass in its true colour
      rimRight: '#f0b9a0',
      rimLeft: '#d99a7e',
      back: '#e0a080',
      floorSpot: '#c98060',
      halo: '#c98a6a',
      floorGlow: '#c7744a',
      smoke: '#a88f84',
      cursor: '#ffd2bf',
      overlay: 'rgba(190, 120, 95, 0.12)',
    },
  },
]