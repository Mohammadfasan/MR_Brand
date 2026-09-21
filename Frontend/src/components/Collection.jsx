/**
 * The full fragrance collection - one colour per fragrance.
 * PLACEHOLDER names / notes / prices: replace with the real range.
 *
 * bottle : glass colour     liquid : perfume colour (darker)
 * metal  : cap / collar / sprayer finish     family : filter group
 * tag    : optional small label - 'New' | 'Bestseller' | 'Limited'
 */

const GOLD = '#e8ab2c'
const PLATINUM = '#cfd3d8'
const ROSE_GOLD = '#d39a82'

export const FAMILIES = ['All', 'Warm', 'Floral', 'Fresh', 'Dark']

export const COLLECTION = [
  { id: 'ruby', tag: 'Bestseller', name: 'Ruby Noir', family: 'Warm', tagline: 'Deep, warm, unforgettable.', notes: 'Saffron · Damask Rose · Amber', bottle: '#e60220', liquid: '#450006', metal: GOLD, prices: { 50: 180, 100: 2600 } },
  { id: 'emerald', tag: 'New', name: 'Emerald Vétiver', family: 'Fresh', tagline: 'Green, cool and alive.', notes: 'Green Fig · Vetiver · Cedar', bottle: '#12a35c', liquid: '#064d2c', metal: PLATINUM, prices: { 50: 175, 100: 2500 } },
  { id: 'onyx', tag: 'Limited', name: 'Onyx Oud', family: 'Dark', tagline: 'Made for the hours after dark.', notes: 'Black Pepper · Smoked Oud · Labdanum', bottle: '#2a2a2e', liquid: '#0b0b0d', metal: ROSE_GOLD, prices: { 50: 195, 100: 2800 } },
  { id: 'sapphire', name: 'Sapphire Tide', family: 'Fresh', tagline: 'Salt air on a clear morning.', notes: 'Sea Salt · Iris · Driftwood', bottle: '#1c4fd8', liquid: '#081c52', metal: PLATINUM, prices: { 50: 170, 100: 2450 } },
  { id: 'amethyst', name: 'Amethyst Iris', family: 'Floral', tagline: 'Soft powder, violet dusk.', notes: 'Violet · Orris Butter · Musk', bottle: '#7b3fc4', liquid: '#2a0f4a', metal: ROSE_GOLD, prices: { 50: 185, 100: 2650 } },
  { id: 'citrine', tag: 'New', name: 'Citrine Neroli', family: 'Fresh', tagline: 'Sunlight in a bottle.', notes: 'Bergamot · Neroli · White Tea', bottle: '#f2b01e', liquid: '#6a4304', metal: GOLD, prices: { 50: 160, 100: 2300 } },
  { id: 'rose-quartz', name: 'Rose Quartz', family: 'Floral', tagline: 'A garden after the rain.', notes: 'Lychee · Peony · Cashmere Wood', bottle: '#f08fb0', liquid: '#7a2a48', metal: ROSE_GOLD, prices: { 50: 170, 100: 2450 } },
  { id: 'topaz', name: 'Amber Topaz', family: 'Warm', tagline: 'Honeyed, golden, glowing.', notes: 'Cardamom · Honey · Benzoin', bottle: '#d9731f', liquid: '#5a2606', metal: GOLD, prices: { 50: 180, 100: 2600 } },
  { id: 'jade', name: 'Jade Tea', family: 'Fresh', tagline: 'Quiet, calm, clear.', notes: 'Matcha · Jasmine Tea · Hinoki', bottle: '#5fae8f', liquid: '#1d4a3a', metal: PLATINUM, prices: { 50: 165, 100: 2400 } },
  { id: 'garnet', tag: 'Bestseller', name: 'Garnet Velvet', family: 'Warm', tagline: 'Dark fruit and red velvet.', notes: 'Plum · Rose Absolute · Patchouli', bottle: '#8e1330', liquid: '#2e0410', metal: GOLD, prices: { 50: 190, 100: 2750 } },
  { id: 'aquamarine', name: 'Aqua Marina', family: 'Fresh', tagline: 'Cold water, bright light.', notes: 'Mint · Water Lily · Ambrette', bottle: '#46c4d6', liquid: '#0f4f59', metal: PLATINUM, prices: { 50: 160, 100: 2300 } },
  { id: 'midnight', tag: 'Limited', name: 'Midnight Leather', family: 'Dark', tagline: 'Soft leather, low light.', notes: 'Birch Tar · Leather · Tonka', bottle: '#1b1d2a', liquid: '#07080d', metal: GOLD, prices: { 50: 200, 100: 2900 } },
]