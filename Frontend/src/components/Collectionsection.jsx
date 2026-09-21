import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { View, PerspectiveCamera, Environment, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

import { COLLECTION, FAMILIES } from './Collection'
import { cart } from './cartStore'
import { scroll, flight } from './Scrollstore'
import bottleGlb from '../assets/Mr Brand.glb?url'

/**
 * "The Collection" - every fragrance, each in its own colour.
 *
 * All the little 3D bottles are drawn by ONE extra canvas using drei <View>:
 * each card has a <View> box, and the canvas paints a bottle into each box.
 * (One canvas for 12 bottles - not 12 canvases, which would crash browsers.)
 *
 * The card bottles use a lighter glass (no real-time transmission) so a whole
 * grid of them stays smooth; the hero keeps the high-quality glass.
 */

const GOLD = '#D4A544'
const CREAM = '#F4EBDD'

// ---------------------------------------------------------------
// Floor textures (drawn once, shared look for every card)
// ---------------------------------------------------------------
const FLOOR_Y = -1.02 // bottles are normalised to 2 units tall, centred on 0
const LIFT = 0.16 // how far a bottle rises on hover

function makeShadowTexture() {
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(0,0,0,0.95)')
  g.addColorStop(0.35, 'rgba(0,0,0,0.55)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(c)
}

function makeSheenTexture() {
  const w = 256
  const h = 128
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
  g.addColorStop(0, 'rgba(244,235,221,0.10)')
  g.addColorStop(0.5, 'rgba(244,235,221,0.03)')
  g.addColorStop(1, 'rgba(244,235,221,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  return new THREE.CanvasTexture(c)
}

// ---------------------------------------------------------------
// One small bottle, coloured for a fragrance
// ---------------------------------------------------------------
function CardBottle({ item, hovered }) {
  const { scene } = useGLTF(bottleGlb)
  const spinRef = useRef()
  const shadowRef = useRef()
  const speedRef = useRef(0.15)
  const liftRef = useRef(0)
  const shadowTexture = useMemo(makeShadowTexture, [])
  const sheenTexture = useMemo(makeSheenTexture, [])

  const model = useMemo(() => {
    const glass = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(item.bottle),
      roughness: 0.06,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      transparent: true,
      opacity: 0.62,
      envMapIntensity: 1.3,
      depthWrite: false,
    })
    const liquid = new THREE.MeshStandardMaterial({
      color: new THREE.Color(item.liquid),
      emissive: new THREE.Color(item.bottle),
      emissiveIntensity: 0.18,
      roughness: 0.2,
    })
    const metal = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(item.metal),
      metalness: 0.95,
      roughness: 0.2,
      clearcoat: 0.8,
      envMapIntensity: 1.8,
    })
    const pump = new THREE.MeshStandardMaterial({ color: '#1a1a1e', metalness: 0.85, roughness: 0.25 })

    const c = scene.clone(true)
    c.traverse((child) => {
      const name = child.name || ''
      const lower = name.toLowerCase()
      if (name.startsWith('BAK_') || lower.includes('floor') || lower.includes('plane')) {
        child.visible = false
        return
      }
      if (!child.isMesh) return
      if (name === 'BOTTLE_GLASS') {
        child.material = glass
        child.renderOrder = 2
      } else if (name === 'LIQUID') {
        child.material = liquid
        child.renderOrder = 1
      } else if (name === 'PUMP') {
        child.material = pump
      } else if (
        ['CAP_OUTER', 'CAP_BAND', 'GOLD_COLLAR', 'SPRAYER', 'ATOMIZER_STEM', 'BRAND_TEXT'].includes(name)
      ) {
        child.material = metal
      }
      // CAP_OUTER stays where it was modelled = closed bottle
    })

    // Centre it and make it 2 units tall so every card frames it the same
    c.updateMatrixWorld(true)
    const box = new THREE.Box3()
    c.traverse((child) => {
      if (child.isMesh && child.visible) box.expandByObject(child)
    })
    const size = box.getSize(new THREE.Vector3())
    const centre = box.getCenter(new THREE.Vector3())
    const s = 2 / Math.max(size.y, 1e-6)
    const holder = new THREE.Group()
    c.position.sub(centre)
    holder.add(c)
    holder.scale.setScalar(s)
    return holder
  }, [scene, item])

  useFrame(({ clock }, delta) => {
    const g = spinRef.current
    if (!g) return
    const dt = Math.min(delta, 0.05)
    const k = 1 - Math.exp(-dt * 4)

    // This card is where the hero bottle lands: stay hidden until it arrives
    g.visible = !(flight.targetId === item.id && scroll.flightS < 0.995)
    flight.cardRotation[item.id] = g.rotation.y

    // idle: slow turn; hover: faster showcase turn + the bottle lifts
    const targetSpeed = hovered ? 1.1 : 0.15
    speedRef.current += (targetSpeed - speedRef.current) * k
    g.rotation.y += dt * speedRef.current

    liftRef.current += ((hovered ? LIFT : 0) - liftRef.current) * k
    // no idle bobbing: the bottle stands still in its card (it only turns)
    g.position.y = liftRef.current

    // floor shadow: tighter + darker on the ground, wider + softer when lifted
    if (shadowRef.current) {
      const up = liftRef.current / LIFT
      shadowRef.current.scale.setScalar(1 + up * 0.35)
      shadowRef.current.material.opacity = 0.75 - up * 0.35
      shadowRef.current.visible = g.visible
    }
  })

  return (
    <>
      <group ref={spinRef}>
        <primitive object={model} />
      </group>

      {/* ---- the floor the bottle stands on ---- */}
      {/* soft contact shadow */}
      <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.002, 0]}>
        <planeGeometry args={[1.9, 1.9]} />
        <meshBasicMaterial map={shadowTexture} transparent depthWrite={false} opacity={0.75} />
      </mesh>
      {/* faint glossy floor sheen */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]}>
        <planeGeometry args={[4.2, 2.2]} />
        <meshBasicMaterial map={sheenTexture} transparent depthWrite={false} opacity={0.5} />
      </mesh>
    </>
  )
}

function CardScene({ item, hovered }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0.25, 6.2]} fov={30} />
      <ambientLight intensity={0.35} />
      {/* neutral key from above-behind, coloured rim from the side */}
      <spotLight position={[1.5, 5, -3]} intensity={60} angle={0.6} penumbra={1} color="#fff6ee" />
      <spotLight position={[-4, 2, 2]} intensity={25} angle={0.7} penumbra={1} color={item.bottle} />
      <pointLight position={[0, -0.2, -1]} intensity={4} distance={4} color={item.bottle} />
      <Environment preset="studio" environmentIntensity={0.6} />
      <Suspense fallback={null}>
        <CardBottle item={item} hovered={hovered} />
      </Suspense>
    </>
  )
}

// ---------------------------------------------------------------
// One product card
//   idle  : bottle, name, price - nothing else (calm grid)
//   hover : bottle lifts + turns, the details slide up underneath
//   touch screens / keyboard focus: details always shown
// ---------------------------------------------------------------
function HeartIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M12 20.3s-7.2-4.4-9.1-9A4.9 4.9 0 0 1 12 6.6a4.9 4.9 0 0 1 9.1 4.7c-1.9 4.6-9.1 9-9.1 9Z" />
    </svg>
  )
}

function ProductCard({ item, index, onAdded }) {
  const [hovered, setHovered] = useState(false)
  const [size, setSize] = useState(100)
  const [wished, setWished] = useState(false)
  const price = item.prices[size]

  const add = () => {
    cart.add({ id: item.id, name: item.name, size, price })
    onAdded(`${item.name} · ${size} ml`)
  }

  return (
    <article
      className="col-fade group relative flex flex-col"
      style={{ animationDelay: `${Math.min(index, 8) * 0.06}s` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHovered(false)
      }}
    >
      {/* very faint panel + hairline, only on hover (no boxes at rest) */}
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-700"
        style={{
          background: hovered ? 'rgba(244,235,221,0.025)' : 'transparent',
          boxShadow: hovered ? 'inset 0 0 0 1px rgba(212,165,68,0.18)' : 'inset 0 0 0 1px transparent',
        }}
      />

      {/* ---- top row: tag + wishlist ---- */}
      <div className="relative z-10 flex h-8 items-start justify-between px-5 pt-4">
        {item.tag ? (
          <span className="text-[9px] uppercase tracking-[0.34em]" style={{ color: GOLD }}>
            {item.tag}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setWished((w) => !w)}
          aria-pressed={wished}
          aria-label={wished ? `Remove ${item.name} from wishlist` : `Add ${item.name} to wishlist`}
          className="pointer-events-auto cursor-pointer transition-all duration-300 hover:scale-110"
          style={{ color: wished ? GOLD : 'rgba(244,235,221,0.4)' }}
        >
          <HeartIcon filled={wished} />
        </button>
      </div>

      {/* ---- 3D bottle (data-bottle-slot = landing box for the hero bottle) ---- */}
      <div data-bottle-slot={item.id} className="relative -mt-4 h-72 w-full">
        <View className="absolute inset-0">
          <CardScene item={item} hovered={hovered} />
        </View>
      </div>

      {/* ---- always visible: name + price ---- */}
      <div className="relative px-5 pb-5 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.bottle }} />
          <span className="text-[9px] uppercase tracking-[0.34em]" style={{ color: 'rgba(244,235,221,0.5)' }}>
            {item.family}
          </span>
        </div>
        <h3 className="mt-3 font-serif text-[1.55rem] font-light leading-[1.1]" style={{ color: CREAM }}>
          {item.name}
        </h3>
        <p className="mt-2 font-serif text-[1.05rem] font-light tabular-nums" style={{ color: GOLD }}>
          {price}
          <span className="ml-2 text-[10px] tracking-[0.2em]" style={{ color: 'rgba(244,235,221,0.4)' }}>
            / {size} ML
          </span>
        </p>

        {/* ---- revealed on hover (always shown on touch screens) ----
            The space is always reserved, so the grid never jumps when a
            card opens (and the hero bottle's landing box never moves). */}
        <div>
          <div>
            <div className="translate-y-3 pt-4 opacity-0 transition-all duration-700 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100">
              <p className="text-[12px] font-light italic" style={{ color: CREAM, opacity: 0.6 }}>
                {item.tagline}
              </p>
              <p className="mt-2 text-[9px] uppercase tracking-[0.2em]" style={{ color: CREAM, opacity: 0.42 }}>
                {item.notes}
              </p>

              {/* size as text, not boxes */}
              <div className="mt-5 flex items-center justify-center gap-3 text-[10px] tracking-[0.22em]" role="radiogroup" aria-label={`${item.name} size`}>
                {[50, 100].map((ml, i) => {
                  const on = ml === size
                  return (
                    <span key={ml} className="flex items-center gap-3">
                      {i > 0 && <span style={{ color: 'rgba(244,235,221,0.25)' }}>·</span>}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setSize(ml)}
                        className="cursor-pointer pb-0.5 transition-colors duration-300"
                        style={{
                          color: on ? GOLD : 'rgba(244,235,221,0.45)',
                          borderBottom: `1px solid ${on ? GOLD : 'transparent'}`,
                        }}
                      >
                        {ml} ML
                      </button>
                    </span>
                  )
                })}
              </div>

              {/* add to bag: quiet text, fills with gold on hover */}
              <button
                type="button"
                onClick={add}
                className="group/btn relative mt-5 inline-flex cursor-pointer items-center gap-3 overflow-hidden px-6 py-2.5 text-[10px] uppercase tracking-[0.32em] transition-colors duration-500 hover:text-[#050403]"
                style={{ color: CREAM }}
              >
                <span
                  className="absolute inset-0 origin-bottom scale-y-0 transition-transform duration-500 ease-out group-hover/btn:scale-y-100"
                  style={{ background: GOLD }}
                  aria-hidden="true"
                />
                <span className="absolute inset-x-0 bottom-0 h-px" style={{ background: GOLD }} aria-hidden="true" />
                <span className="relative">Add to bag</span>
                <span className="relative transition-transform duration-500 group-hover/btn:translate-x-1" aria-hidden="true">
                  &#8594;
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

// ---------------------------------------------------------------
// Section
// ---------------------------------------------------------------
const CSS = `
@keyframes colFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
.col-fade { opacity: 0; animation: colFadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
@media (prefers-reduced-motion: reduce) { .col-fade { animation: none; opacity: 1; } }
`

export default function CollectionSection() {
  const sectionRef = useRef()
  const [family, setFamily] = useState('All')
  const [inView, setInView] = useState(false)
  const [toast, setToast] = useState(null)

  // Only render the card canvas while the section is on screen
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: '200px 0px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // "Added to bag" toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const items = family === 'All' ? COLLECTION : COLLECTION.filter((i) => i.family === family)

  // NOTE: the section has no background on purpose - the dark 3D stage
  // behind it is the backdrop, so the flying bottle is visible as it lands.
  return (
    <section
      ref={sectionRef}
      id="collection"
      className="relative z-10 w-full"
      aria-label="The collection"
    >
      <style>{CSS}</style>

      <div className="mx-auto max-w-[1400px] px-7 pb-32 pt-[22vh] sm:px-10 md:px-14 lg:px-20">
        {/* ---------- HEADER ---------- */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.42em] md:text-[11px]" style={{ color: GOLD }}>
              The Collection
            </p>
            <span className="mt-5 block h-px w-16" style={{ background: `linear-gradient(to right, ${GOLD}, transparent)` }} />
            <h2 className="mt-6 font-serif text-[2.6rem] font-light leading-[1] tracking-[-0.03em] md:text-[4rem]" style={{ color: CREAM }}>
              A colour for
              <br />
              every{' '}
              <em className="italic" style={{ color: GOLD }}>
                mood
              </em>
            </h2>
            <p className="mt-6 max-w-[26rem] text-[13px] font-light leading-[1.8]" style={{ color: CREAM, opacity: 0.65 }}>
              {COLLECTION.length} fragrances, each poured into its own jewel-toned glass.
            </p>
          </div>

          {/* ---------- FILTERS ---------- */}
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by family">
            {FAMILIES.map((f) => {
              const on = f === family
              const count = f === 'All' ? COLLECTION.length : COLLECTION.filter((i) => i.family === f).length
              return (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setFamily(f)}
                  className="cursor-pointer border px-4 py-2 text-[10px] uppercase tracking-[0.26em] transition-colors duration-300"
                  style={{
                    borderColor: on ? GOLD : 'rgba(212,165,68,0.25)',
                    color: on ? CREAM : 'rgba(244,235,221,0.55)',
                    background: on ? 'rgba(212,165,68,0.08)' : 'transparent',
                  }}
                >
                  {f} <span style={{ color: GOLD, opacity: 0.8 }}>{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ---------- GRID ---------- */}
        <div key={family} className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item, i) => (
            <ProductCard key={item.id} item={item} index={i} onAdded={setToast} />
          ))}
        </div>
      </div>

      {/* ONE canvas paints every card's bottle (fixed, behind nothing, no clicks) */}
      <Canvas
        frameloop={inView ? 'always' : 'never'}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.NeutralToneMapping ?? THREE.ACESFilmicToneMapping,
        }}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          // off screen: hide it, otherwise its last (frozen) frame would stay
          // on top of the sections below
          visibility: inView ? 'visible' : 'hidden',
        }}
      >
        <View.Port />
      </Canvas>

      {/* ---------- TOAST ---------- */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-8 z-50 flex justify-center transition-all duration-500"
        style={{ opacity: toast ? 1 : 0, transform: toast ? 'none' : 'translateY(12px)' }}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3 border px-5 py-3 text-[11px] tracking-[0.12em]" style={{ borderColor: GOLD, background: 'rgba(5,4,3,0.92)', color: CREAM }}>
          <span style={{ color: GOLD }}>&#10003;</span>
          Added to bag · {toast}
        </div>
      </div>
    </section>
  )
}

useGLTF.preload(bottleGlb)