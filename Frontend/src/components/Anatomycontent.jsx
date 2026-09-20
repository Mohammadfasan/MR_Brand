/**
 * Copy for "The Anatomy of a Signature" section.
 * PLACEHOLDER TEXT - replace materials / notes / prices with real product
 * details before using this for a real shop.
 */

export const ANATOMY_INTRO = {
  eyebrow: 'The Craft',
  line1: 'The Anatomy',
  accent: 'of a Signature',
  text: 'Select a part to see how it is made.',
}

// Card shown before anything is selected
export const OVERVIEW = {
  title: 'Six parts, one signature',
  text: 'Click a name on the left, or click a part on the bottle, to bring it forward and read its story.',
}

// Metal finish per slide (cap + collar follow the slide's cap colour)
const METAL = {
  ruby: '24K gold finish',
  emerald: 'Platinum finish',
  onyx: 'Rose-gold finish',
}

// One entry per part, same index the 3D code uses (0 cap ... 5 label)
export const PARTS = [
  {
    id: 'cap',
    name: 'The Cap',
    material: (slideId) => `Solid zamac · ${METAL[slideId] || METAL.ruby}`,
    text: 'Weighted to close with a soft, satisfying click.',
  },
  {
    id: 'atomiser',
    name: 'The Atomiser',
    material: () => 'Precision pump · Stainless steel stem',
    text: 'Releases an ultra-fine mist that settles evenly on the skin.',
  },
  {
    id: 'collar',
    name: 'The Collar',
    material: (slideId) => `Hand-polished metal · ${METAL[slideId] || METAL.ruby}`,
    text: 'Seals the neck and frames the cap in light.',
  },
  {
    id: 'glass',
    name: 'The Glass',
    material: () => 'Heavy-base crystal glass',
    text: 'A thick, sculpted base that catches and bends the light.',
  },
  {
    id: 'juice',
    name: 'The Juice',
    material: () => 'Eau de Parfum · 20% concentration',
    text: null, // shows the fragrance notes instead
    notes: true,
  },
  {
    id: 'label',
    name: 'The Signature',
    material: () => 'Engraved BR monogram',
    text: 'Every bottle carries the mark of the house.',
  },
]

export const NOTES = {
  ruby: { top: 'Pink pepper, Saffron', heart: 'Damask rose, Oud', base: 'Amber, Vanilla' },
  emerald: { top: 'Bergamot, Green fig', heart: 'Vetiver, Violet leaf', base: 'Cedar, White musk' },
  onyx: { top: 'Black pepper, Cardamom', heart: 'Smoked oud, Leather', base: 'Black amber, Labdanum' },
}

export const PRICES = { ruby: '$180', emerald: '$175', onyx: '$195' }