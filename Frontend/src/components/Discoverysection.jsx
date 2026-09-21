import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

import { COLLECTION } from './Collection'
import { cart } from './Cartstore'

/**
 * "The Discovery Set" - try all twelve before you choose.
 *
 * Left : the offer (12 vials, one price, credited back on a full bottle).
 * Right: a 3D gift box. When the section scrolls into view the lid swings
 *        open and the twelve coloured vials rise out of the tray, one by one.
 *        Hover a vial -> it lifts and shows its name. Click -> jump to that
 *        fragrance's card in the collection.
 *
 * Built from simple shapes (no model file) so the vials stay light.
 */

const GOLD = '#D4A544'
const CREAM = '#F4EBDD'

export const DISCOVERY_SET = {
  id: 'discovery-set',
  name: 'The Discovery Set',
  price: 25999,
  vialSize: '2 ml',
}

// ---------------------------------------------------------------
// Box dimensions (3D units)
// ---------------------------------------------------------------
const W = 6.4 // width
const D = 2.8 // depth
const H = 1.0 // wall height (deep enough for a foam insert)
const T = 0.08 // wall thickness
const COLS = 6
const ROWS = 2
const FOAM_TOP = -0.62 // top surface of the foam insert
const SINK = 0.22 // how deep each vial sits in its foam hole

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp01 = (v) => Math.min(1, Math.max(0, v))

function makeShadowTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(128, 64, 0, 128, 64, 128)
  g.addColorStop(0, 'rgba(0,0,0,0.9)')
  g.addColorStop(0.5, 'rgba(0,0,0,0.4)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 128)
  return new THREE.CanvasTexture(c)
}

// Printed inside of the lid: seen when the box is open
function makeLidTexture() {
  const w = 1024
  const h = 410
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#16110d' // dark velvet
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(212,165,68,0.85)' // gold double border
  ctx.lineWidth = 2
  ctx.strokeRect(22, 22, w - 44, h - 44)
  ctx.strokeStyle = 'rgba(212,165,68,0.4)'
  ctx.lineWidth = 1
  ctx.strokeRect(32, 32, w - 64, h - 64)

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(212,165,68,0.95)'
  ctx.font = '500 20px Georgia, serif'
  ctx.fillText('B R   B R A N D', w / 2, 80)
  ctx.font = 'italic 300 56px Georgia, serif'
  ctx.fillStyle = '#f4ebdd'
  ctx.fillText('The Discovery Set', w / 2, 150)
  ctx.fillStyle = 'rgba(212,165,68,0.7)' // thin rule
  ctx.fillRect(w / 2 - 60, 176, 120, 1.5)

  // the twelve names, 3 columns x 4 rows
  ctx.font = '15px Georgia, serif'
  ctx.fillStyle = 'rgba(244,235,221,0.72)'
  COLLECTION.slice(0, 12).forEach((it, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    ctx.fillText(`${String(i + 1).padStart(2, '0')}  ${it.name}`, w * (0.24 + col * 0.26), 232 + row * 36)
  })

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

// Vial silhouettes (turned on a lathe): rounded shoulder + slim neck
const GLASS_PROFILE = [
  [0, 0], [0.145, 0], [0.16, 0.025], [0.16, 0.5], [0.15, 0.55], [0.1, 0.6], [0.085, 0.62], [0.085, 0.66], [0, 0.66],
].map(([x, y]) => new THREE.Vector2(x, y))
const LIQUID_PROFILE = [
  [0, 0.03], [0.13, 0.03], [0.135, 0.05], [0.135, 0.44], [0, 0.44],
].map(([x, y]) => new THREE.Vector2(x, y))

// ---------------------------------------------------------------
// One vial
// ---------------------------------------------------------------
function Vial({ item, index, position, openRef, hovered, onHover, onPick }) {
  const groupRef = useRef()
  const liftRef = useRef(0)

  const mats = useMemo(
    () => ({
      glass: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(item.bottle),
        roughness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        transparent: true,
        opacity: 0.7,
        envMapIntensity: 1.3,
      }),
      liquid: new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.liquid),
        emissive: new THREE.Color(item.bottle),
        emissiveIntensity: 0.25,
        roughness: 0.3,
      }),
      metal: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(item.metal),
        metalness: 0.95,
        roughness: 0.22,
        clearcoat: 0.8,
        envMapIntensity: 1.6,
      }),
    }),
    [item]
  )

  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g) return
    const dt = Math.min(delta, 0.05)
    // rise out of the tray after the lid is mostly open, staggered left -> right
    const p = openRef.current
    const rise = ease(clamp01((p - 0.45 - index * 0.035) / 0.3))
    liftRef.current += ((hovered ? 0.3 : 0) - liftRef.current) * (1 - Math.exp(-dt * 8))
    g.position.y = position[1] + rise * 0.12 + liftRef.current
    g.rotation.y += dt * (hovered ? 1.2 : 0)
  })

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation()
        onHover(index)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        onHover(-1)
        document.body.style.cursor = ''
      }}
      onClick={(e) => {
        e.stopPropagation()
        onPick(item)
      }}
    >
      {/* perfume inside */}
      <mesh material={mats.liquid}>
        <latheGeometry args={[LIQUID_PROFILE, 32]} />
      </mesh>
      {/* glass body: rounded shoulder + neck */}
      <mesh material={mats.glass} castShadow>
        <latheGeometry args={[GLASS_PROFILE, 40]} />
      </mesh>
      {/* gold collar + tall slim cap */}
      <mesh material={mats.metal} position={[0, 0.655, 0]}>
        <cylinderGeometry args={[0.105, 0.105, 0.03, 32]} />
      </mesh>
      <mesh material={mats.metal} position={[0, 0.76, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.115, 0.2, 32]} />
      </mesh>

      {hovered && (
        <Html position={[0, 1.15, 0]} center distanceFactor={7} style={{ pointerEvents: 'none' }}>
          <div
            className="whitespace-nowrap border px-3 py-1.5 text-[11px] tracking-[0.18em]"
            style={{ borderColor: GOLD, background: 'rgba(5,4,3,0.9)', color: CREAM }}
          >
            {item.name}
          </div>
        </Html>
      )}
    </group>
  )
}

// ---------------------------------------------------------------
// The box
// ---------------------------------------------------------------
function GiftBox({ open }) {
  const openRef = useRef(0)
  const lidRef = useRef()
  const [hovered, setHovered] = useState(-1)
  const shadowTexture = useMemo(makeShadowTexture, [])
  const lidTexture = useMemo(makeLidTexture, [])

  const mats = useMemo(
    () => ({
      shell: new THREE.MeshPhysicalMaterial({ color: '#0d0b09', roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
      velvet: new THREE.MeshStandardMaterial({ color: '#1b1511', roughness: 0.95 }),
      well: new THREE.MeshStandardMaterial({ color: '#050403', roughness: 1 }),
      rim: new THREE.MeshStandardMaterial({ color: '#2a211a', roughness: 0.9 }),
      gold: new THREE.MeshPhysicalMaterial({ color: GOLD, metalness: 1, roughness: 0.25, envMapIntensity: 1.6 }),
    }),
    []
  )

  // vial grid positions, standing on the inner floor
  const slots = useMemo(() => {
    const out = []
    const sx = (W - 1.2) / (COLS - 1)
    const sz = 1.0
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        out.push([-((COLS - 1) * sx) / 2 + c * sx, FOAM_TOP - SINK, (r - (ROWS - 1) / 2) * sz])
      }
    }
    return out
  }, [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    // open / close slowly (about 2.5 s end to end)
    openRef.current += ((open ? 1 : 0) - openRef.current) * (1 - Math.exp(-dt * 1.6))
    if (lidRef.current) {
      const lid = ease(clamp01(openRef.current / 0.6))
      lidRef.current.rotation.x = -1.72 * lid // hinged at the back edge
    }
  })

  const pickVial = (item) => {
    const card = document.querySelector(`[data-bottle-slot="${item.id}"]`)
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <group position={[0, 0.1, 0]} rotation={[0, -0.18, 0]}>
      {/* floor + walls (an open tray, so the vials inside can be seen) */}
      <mesh material={mats.shell} position={[0, -H, 0]} receiveShadow>
        <boxGeometry args={[W, 0.06, D]} />
      </mesh>
      {/* foam insert the vials are pressed into */}
      <mesh material={mats.velvet} position={[0, (FOAM_TOP + (-H + 0.03)) / 2, 0]} receiveShadow>
        <boxGeometry args={[W - 2 * T, FOAM_TOP - (-H + 0.03), D - 2 * T]} />
      </mesh>
      {[
        [[W, H, T], [0, -H / 2, D / 2 - T / 2]],
        [[W, H, T], [0, -H / 2, -D / 2 + T / 2]],
        [[T, H, D], [W / 2 - T / 2, -H / 2, 0]],
        [[T, H, D], [-W / 2 + T / 2, -H / 2, 0]],
      ].map(([size, pos], i) => (
        <mesh key={i} material={mats.shell} position={pos} castShadow receiveShadow>
          <boxGeometry args={size} />
        </mesh>
      ))}

      {/* gold rim along the top of the walls */}
      {[
        [[W, 0.025, 0.035], [0, 0.005, D / 2 - T / 2]],
        [[W, 0.025, 0.035], [0, 0.005, -D / 2 + T / 2]],
        [[0.035, 0.025, D], [W / 2 - T / 2, 0.005, 0]],
        [[0.035, 0.025, D], [-W / 2 + T / 2, 0.005, 0]],
      ].map(([size, pos], i) => (
        <mesh key={i} material={mats.gold} position={pos}>
          <boxGeometry args={size} />
        </mesh>
      ))}

      {/* a dark well under every vial */}
      {slots.map((s, i) => (
        <group key={i} position={[s[0], FOAM_TOP + 0.003, s[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh material={mats.well}>
            <circleGeometry args={[0.19, 40]} />
          </mesh>
          <mesh material={mats.rim}>
            <ringGeometry args={[0.19, 0.22, 40]} />
          </mesh>
        </group>
      ))}

      {/* vials */}
      {COLLECTION.slice(0, COLS * ROWS).map((item, i) => (
        <Vial
          key={item.id}
          item={item}
          index={i}
          position={slots[i]}
          openRef={openRef}
          hovered={hovered === i}
          onHover={setHovered}
          onPick={pickVial}
        />
      ))}

      {/* lid, hinged at the back top edge */}
      <group ref={lidRef} position={[0, 0.02, -D / 2]}>
        <group position={[0, 0.16, D / 2]}>
          <RoundedBox args={[W + 0.06, 0.3, D + 0.06]} radius={0.04} smoothness={4} material={mats.shell} castShadow />
          {/* inside of the lid: printed velvet card */}
          <mesh position={[0, -0.152, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[W - 0.4, D - 0.4]} />
            <meshStandardMaterial map={lidTexture} roughness={0.9} />
          </mesh>
          {/* gold border + monogram rings on the lid */}
          {[
            [[W - 0.5, 0.01, 0.025], [0, 0.155, D / 2 - 0.25]],
            [[W - 0.5, 0.01, 0.025], [0, 0.155, -D / 2 + 0.25]],
            [[0.025, 0.01, D - 0.5], [W / 2 - 0.25, 0.155, 0]],
            [[0.025, 0.01, D - 0.5], [-W / 2 + 0.25, 0.155, 0]],
          ].map(([size, pos], i) => (
            <mesh key={i} material={mats.gold} position={pos}>
              <boxGeometry args={size} />
            </mesh>
          ))}
          <mesh material={mats.gold} position={[0, 0.156, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.36, 0.39, 64]} />
          </mesh>
          <mesh material={mats.gold} position={[0, 0.156, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.26, 0.27, 64]} />
          </mesh>
        </group>
      </group>

      {/* soft shadow under the whole box */}
      <mesh position={[0, -H - 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 1.5, D * 2.2]} />
        <meshBasicMaterial transparent depthWrite={false} opacity={0.6} map={shadowTexture} />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------
// Section
// ---------------------------------------------------------------
const CSS = `
@keyframes dsFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
.ds-fade { opacity: 0; }
.ds-in .ds-fade { animation: dsFadeUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
@media (prefers-reduced-motion: reduce) { .ds-fade { opacity: 1; } .ds-in .ds-fade { animation: none; } }
`

const POINTS = [
  ['12 × 2 ml vials', 'Every fragrance in the house, about ten wears each.'],
  ['Wear them for real', 'On your skin, through a whole day - not on a paper strip.'],
  ['Your $45 comes back', 'Credited in full against your first 50 or 100 ml bottle.'],
]

export default function DiscoverySection() {
  const sectionRef = useRef()
  const [inView, setInView] = useState(false) // canvas on screen -> render
  const [open, setOpen] = useState(false) // box open
  const [added, setAdded] = useState(false)
  const reduced = useMemo(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  )

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const renderIO = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '150px 0px' })
    // open when a good part of the section is visible, close again when it leaves
    const openIO = new IntersectionObserver(([e]) => setOpen(reduced || e.intersectionRatio > 0.35), {
      threshold: [0, 0.35, 0.6],
    })
    renderIO.observe(el)
    openIO.observe(el)
    return () => {
      renderIO.disconnect()
      openIO.disconnect()
    }
  }, [reduced])

  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(false), 2200)
    return () => clearTimeout(t)
  }, [added])

  const addSet = () => {
    cart.add({ id: DISCOVERY_SET.id, name: DISCOVERY_SET.name, size: DISCOVERY_SET.vialSize, price: DISCOVERY_SET.price })
    setAdded(true)
  }

  return (
    <section
      ref={sectionRef}
      id="discovery"
      className={`relative z-10 w-full ${open ? 'ds-in' : ''}`}
      aria-label="The discovery set"
    >
      <style>{CSS}</style>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-10 px-7 py-28 sm:px-10 md:px-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-6 lg:px-20 lg:py-36">
        {/* ---------------- OFFER ---------------- */}
        <div>
          <p className="ds-fade text-[10px] uppercase tracking-[0.42em] md:text-[11px]" style={{ color: GOLD }}>
            The Discovery Set
          </p>
          <span
            className="ds-fade mt-5 block h-px w-16"
            style={{ background: `linear-gradient(to right, ${GOLD}, transparent)`, animationDelay: '0.05s' }}
          />
          <h2
            className="ds-fade mt-6 font-serif text-[2.5rem] font-light leading-[1.02] tracking-[-0.03em] md:text-[3.8rem]"
            style={{ color: CREAM, animationDelay: '0.1s' }}
          >
            Try all twelve
            <br />
            <em className="italic" style={{ color: GOLD }}>
              before you choose
            </em>
          </h2>
          <p
            className="ds-fade mt-6 max-w-[28rem] text-[13px] font-light leading-[1.8]"
            style={{ color: CREAM, opacity: 0.65, animationDelay: '0.2s' }}
          >
            A fragrance is personal. So we put the whole collection into one small box, and let your skin decide.
          </p>

          <ul className="mt-9 space-y-5">
            {POINTS.map(([title, text], i) => (
              <li key={title} className="ds-fade flex gap-5" style={{ animationDelay: `${0.3 + i * 0.08}s` }}>
                <span className="font-serif text-[1.1rem] font-light tabular-nums" style={{ color: GOLD }}>
                  0{i + 1}
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: CREAM }}>
                    {title}
                  </p>
                  <p className="mt-1 text-[12px] font-light" style={{ color: CREAM, opacity: 0.55 }}>
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* price + button */}
          <div className="ds-fade mt-10 flex flex-wrap items-center gap-x-8 gap-y-5" style={{ animationDelay: '0.6s' }}>
            <div>
              <p className="font-serif text-[2.4rem] font-light leading-none" style={{ color: GOLD }}>
                {DISCOVERY_SET.price}
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.22em]" style={{ color: CREAM, opacity: 0.45 }}>
                Credited back · Free shipping
              </p>
            </div>
            <button
              type="button"
              onClick={addSet}
              className="group relative inline-flex cursor-pointer items-center gap-4 overflow-hidden border px-8 py-3.5 text-[11px] uppercase tracking-[0.3em] transition-colors duration-500 hover:text-[#050403]"
              style={{ borderColor: GOLD, color: CREAM }}
            >
              <span
                className="absolute inset-0 origin-bottom scale-y-0 transition-transform duration-500 ease-out group-hover:scale-y-100"
                style={{ background: GOLD }}
                aria-hidden="true"
              />
              <span className="relative">{added ? 'Added to bag ✓' : 'Add the set'}</span>
              {!added && (
                <span className="relative transition-transform duration-500 group-hover:translate-x-1" aria-hidden="true">
                  &#8594;
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ---------------- 3D BOX ---------------- */}
        <div className="relative h-[360px] w-full sm:h-[440px] lg:h-[560px]">
          <Canvas
            frameloop={inView ? 'always' : 'never'}
            shadows
            dpr={[1, 1.5]}
            camera={{ position: [0, 5.2, 9.6], fov: 30 }}
            gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping ?? THREE.ACESFilmicToneMapping }}
            onCreated={({ camera }) => camera.lookAt(0, 0.1, -0.4)}
          >
            <ambientLight intensity={0.3} />
            <spotLight
              position={[1.5, 7, 2]}
              angle={0.55}
              penumbra={1}
              intensity={90}
              color="#fff6ee"
              castShadow
              shadow-mapSize={[1024, 1024]}
            />
            <spotLight position={[-6, 3, -3]} angle={0.6} penumbra={1} intensity={40} color="#ffcf8a" />
            <Environment preset="studio" environmentIntensity={0.55} />
            <Suspense fallback={null}>
              <GiftBox open={open} />
            </Suspense>
          </Canvas>

          <p
            className="ds-fade pointer-events-none absolute inset-x-0 bottom-2 text-center text-[10px] uppercase tracking-[0.3em]"
            style={{ color: CREAM, opacity: 0.4, animationDelay: '1.4s' }}
          >
            Hover a vial · click to find it in the collection
          </p>
        </div>
      </div>
    </section>
  )
}