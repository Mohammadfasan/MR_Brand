import { Suspense, useRef, useEffect, useMemo, useState } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Environment, SpotLight, ContactShadows } from '@react-three/drei'
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'

import { PerfumeBottle } from './PerfumeBottle'
import Ground from './Ground'
import Smoke from './Smoke'
import Rocks from './Rocks'
import Leaves from './Leaves'
import DustParticles from './DustParticles'
import BacklightHalo from './BacklightHalo'
import FloorGlowPool from './FloorGlowPool'
import Navbar from './Navbar'
import HeroContent from './HeroContent'
import HeroStats from './HeroStats'
import SlideNav from './SlideNav'
import FilmGrain from './Filmgrain'
import AnatomySection from './Anatomysection'
import CollectionSection from './Collectionsection'
import DiscoverySection from './Discoverysection'
import ReviewsSection from './Reviewssection'
import Footer from './Footer'
import SmoothScroll from './SmoothScroll'
import LoadingScreen from './Loadingscreen'
import { scroll, anatomy3d, anatomyUI, flight, useScrollTracker, easeInOut, clamp01 } from './Scrollstore'
import { SLIDES } from './Slides'
import { intro, playIntro, lightFade, INTRO_TIMING, prefersReducedMotion } from './introStore'
import useViewportTier from '../hooks/useViewportTier'
import { SCENE_TIERS } from '../sceneConfig'

// =================================================================
// LOOK / MOOD
// Switch the whole scene between looks by changing ACTIVE_THEME.
//   'moonlight' : cool silver-blue light, polished black obsidian
//   'amber'     : the original warm golden look
// Gold text, gold cap and the gold orbit stay gold in both - on the
// moonlight look they become warm accents against cool light.
// =================================================================
const THEMES = {
  moonlight: {
    background: '#040508',
    exposure: 1.25,
    ambient: { color: '#141a26', intensity: 0.35 },
    key: { color: '#cfdcff', intensity: 95 },
    fill: { color: '#8a9bbd', intensity: 10 },
    rimRight: { color: '#9fb8ff', intensity: 60 },
    rimLeft: { color: '#7d93c9', intensity: 40 },
    back: { color: '#aabfff', intensity: 8 },
    rubyGlow: { color: '#ff2a3a', intensity: 8 },
    floorSpot: { color: '#9fb2d8', intensity: 12 },
    envIntensity: 0.6,
    halo: '#8fa6d6',
    floorGlow: '#7f98c8',
    smoke: '#8e9ab0',
    dust: '#cfdcf2',
    overlay: 'rgba(120, 150, 210, 0.10)',
    cursorLight: '#cfdcff',
  },
  amber: {
    background: '#050403',
    exposure: 1.35,
    ambient: { color: '#3a281c', intensity: 0.45 },
    key: { color: '#ffcf96', intensity: 85 },
    fill: { color: '#f0d9bc', intensity: 10 },
    rimRight: { color: '#ffb267', intensity: 55 },
    rimLeft: { color: '#ff9f52', intensity: 35 },
    back: { color: '#ffb74d', intensity: 9 },
    rubyGlow: { color: '#ff4411', intensity: 7.5 },
    floorSpot: { color: '#ffaa22', intensity: 14 },
    envIntensity: 0.35,
    halo: '#eeb05c',
    floorGlow: '#ffaf32',
    smoke: '#c9a27a',
    dust: '#e8c489',
    overlay: 'rgba(214, 132, 44, 0.16)',
    cursorLight: '#ffcf8a',
  },
}

const ACTIVE_THEME = 'amber'
const T = THEMES[ACTIVE_THEME]

// Intro camera move: starts further back and higher, cranes down + dollies in
const INTRO_DOLLY_Z = 3.2
const INTRO_CRANE_Y = 0.7

// Mouse parallax strength (world units the camera shifts at the screen edge)
const PARALLAX_X = 0.45
const PARALLAX_Y = 0.22

// Bottle shadow: where the shadow LIGHT sits (group space, bottle at x 1.1).
// The shadow falls to the OPPOSITE side. For a clear BOTTLE-SHAPED shadow it
// must land on open floor, not on the stones / leaves behind the bottle.
//   [-0.6, 3.6, -3.2]  behind-left, lowish -> long shadow FORWARD-right (default)
//   [ 2.8, 3.6, -3.2]  behind-right        -> long shadow forward-left
//   Lower the middle number (height) = longer shadow.
const SHADOW_FROM = [-0.6, 3.6, -3.2]
const SHADOW_STRENGTH = 0.7 // 0 = no shadow, 1 = solid

// =================================================================
// Mouse position shared by parallax + cursor light (-1..1, canvas space)
// =================================================================
function usePointer() {
  const { gl } = useThree()
  const pointer = useRef({ x: 0, y: 0, active: false })

  useEffect(() => {
    const move = (e) => {
      const r = gl.domElement.getBoundingClientRect()
      pointer.current.x = ((e.clientX - r.left) / r.width) * 2 - 1
      pointer.current.y = -((e.clientY - r.top) / r.height) * 2 + 1
      pointer.current.active = true
    }
    const leave = () => (pointer.current.active = false)

    window.addEventListener('pointermove', move)
    document.documentElement.addEventListener('mouseleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('mouseleave', leave)
    }
  }, [gl])

  return pointer
}

// =================================================================
// ANATOMY CAMERA VIEWS - one per selected part (+ the overview)
// Offsets in "bottle heights" from the centre of the glass body.
//   pos : camera angle / position      look : what it looks at
// =================================================================
const ANATOMY_VIEWS = {
  overview: { pos: [0, 0.45, 3.2], look: [0, 0.45, 0] }, // whole exploded bottle
  0: { pos: [0.45, 1.4, 2.3], look: [0, 1.15, 0.3] }, // cap
  1: { pos: [-0.45, 1.1, 2.3], look: [0, 0.9, 0.3] }, // atomiser
  2: { pos: [0.45, 0.85, 2.3], look: [0, 0.68, 0.3] }, // collar
  3: { pos: [1.3, 0.3, 2.6], look: [0, 0.05, 0] }, // glass (turning)
  4: { pos: [0, 0.2, 2.5], look: [0, 0, 0] }, // the juice
  5: { pos: [0, 0.1, 1.7], look: [0, 0, 0.1] }, // label close-up
}

// ONE knob for the whole section: how far the camera stays from the bottle.
// Bottle too big?  raise it (1.5).  Too small?  lower it (1.0).
const ANATOMY_DISTANCE = 1.3

// =================================================================
// SCROLL SMOOTHER: eases raw scroll values into scroll.heroExitS / anatomyS
// =================================================================
function ScrollSmoother() {
  useFrame((_, delta) => {
    const k = 1 - Math.exp(-Math.min(delta, 0.05) * 6)
    scroll.heroExitS += (scroll.heroExit - scroll.heroExitS) * k
    scroll.anatomyS += (scroll.anatomy - scroll.anatomyS) * k
    // the flight follows the scroll more tightly so the bottle keeps up with its card
    const kf = 1 - Math.exp(-Math.min(delta, 0.05) * 14)
    scroll.flightS += (scroll.flight - scroll.flightS) * kf
  })
  return null
}

// =================================================================
// CAMERA: intro dolly/crane + mouse parallax (hero) blended into the
// anatomy keyframes as the page scrolls. (Wheel zoom removed - it
// blocked page scrolling.)
// =================================================================
function CameraController({ tier }) {
  const { camera } = useThree()
  const config = SCENE_TIERS[tier]
  const pointer = usePointer()
  const smooth = useRef({ x: 0, y: 0 })

  const v = useMemo(
    () => ({
      heroPos: new THREE.Vector3(),
      heroLook: new THREE.Vector3(),
      anaPos: new THREE.Vector3(),
      anaLook: new THREE.Vector3(),
      offPos: new THREE.Vector3(),
      offLook: new THREE.Vector3(),
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(...config.lookAt),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useEffect(() => {
    camera.fov = config.fov
    camera.updateProjectionMatrix()
  }, [camera, config])

  // Card bottles are drawn by a camera at (0, 0.25, 6.2), fov 30, looking
  // straight ahead at a bottle normalised to 2 units tall. From that:
  const CARD_BOTTLE_H = 2 / (2 * 6.2 * Math.tan(THREE.MathUtils.degToRad(15))) // share of box height
  const CARD_BOTTLE_DY = 0.25 / (6.2 * Math.tan(THREE.MathUtils.degToRad(15))) / 2 // centre sits this far below

  useFrame(({ size }) => {
    // Parallax follows the mouse softly (returns to centre when it leaves)
    const px = pointer.current.active ? pointer.current.x : 0
    const py = pointer.current.active ? pointer.current.y : 0
    smooth.current.x += (px - smooth.current.x) * 0.04
    smooth.current.y += (py - smooth.current.y) * 0.04

    // --- hero camera ---
    const introLeft = 1 - intro.camera // 1 at the start, 0 when settled
    v.heroPos.set(
      smooth.current.x * PARALLAX_X,
      config.camY + introLeft * INTRO_CRANE_Y + smooth.current.y * PARALLAX_Y,
      config.baseZ + introLeft * INTRO_DOLLY_Z
    )
    v.heroLook.set(config.lookAt[0], config.lookAt[1], config.lookAt[2])

    // --- anatomy camera ---
    const e = easeInOut(scroll.heroExitS)
    if (e > 1e-4) {
      const H = anatomy3d.height
      const view = ANATOMY_VIEWS[anatomyUI.selected] || ANATOMY_VIEWS.overview
      v.offPos.set(...view.pos)
      v.offLook.set(...view.look)
      // camera = look target + (angle offset * distance), so ANATOMY_DISTANCE
      // zooms in/out without changing the viewing angle
      v.anaLook.copy(anatomy3d.center).addScaledVector(v.offLook, H)
      v.anaPos
        .copy(v.offPos)
        .sub(v.offLook)
        .multiplyScalar(H * ANATOMY_DISTANCE)
        .add(v.anaLook)
      v.anaPos.x += smooth.current.x * 0.12 * H // a little parallax here too
      v.anaPos.y += smooth.current.y * 0.06 * H
      v.pos.lerpVectors(v.heroPos, v.anaPos, e)
      v.heroLook.lerp(v.anaLook, e)
    } else {
      v.pos.copy(v.heroPos)
    }

    // --- flight into the collection card ---
    // The camera frames the bottle so it appears exactly inside the card's
    // bottle box: distance sets its SIZE, a view offset sets its SCREEN POSITION.
    const f = easeInOut(clamp01(scroll.flightS))
    let offX = 0
    let offY = 0
    if (f > 1e-4) {
      const W = size.width
      const Hs = size.height
      let cx = W / 2
      let cy = Hs * 1.4 // no card on screen: fly down and out
      let boxH = Hs * 0.4
      const el = flight.slotEl
      if (el && el.isConnected) {
        const r = el.getBoundingClientRect()
        cx = r.left + r.width / 2
        boxH = r.height
        cy = r.top + r.height / 2 + CARD_BOTTLE_DY * boxH
      }
      const targetPx = Math.max(20, CARD_BOTTLE_H * boxH)
      const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      const dist = (anatomy3d.fullHeight * Hs) / (2 * tanHalf * targetPx)

      v.offLook.copy(anatomy3d.fullCenter)
      v.offPos.copy(anatomy3d.fullCenter)
      v.offPos.z += dist // straight on, like the card camera

      v.pos.lerp(v.offPos, f)
      v.heroLook.lerp(v.offLook, f)
      offX = (W / 2 - cx) * f
      offY = (Hs / 2 - cy) * f
    }

    // follow tightly during the flight so the bottle stays glued to its card
    const follow = 0.12 + 0.88 * f
    camera.position.lerp(v.pos, follow)
    v.look.lerp(v.heroLook, follow)
    camera.lookAt(v.look)

    if (f > 1e-4) {
      camera.setViewOffset(size.width, size.height, offX, offY, size.width, size.height)
    } else if (camera.view && camera.view.enabled) {
      camera.clearViewOffset()
    }
  })

  return null
}

// =================================================================
// EXIT GROUP: the hero "set" (floor, stones, leaves, smoke, shadows)
// sinks away as you scroll into the anatomy section, then stops rendering.
// =================================================================
function ExitGroup({ children }) {
  const ref = useRef()
  useFrame(() => {
    if (!ref.current) return
    const e = easeInOut(scroll.heroExitS)
    ref.current.position.y = -e * e * 6
    ref.current.visible = e < 0.98
  })
  return <group ref={ref}>{children}</group>
}

// The bottle (+ its backlight halo) lifts off the floor a little
function BottleRig({ children }) {
  const ref = useRef()
  useFrame(() => {
    if (!ref.current) return
    ref.current.position.y = easeInOut(scroll.heroExitS) * 0.35
    // landed: the card's own bottle takes over
    ref.current.visible = scroll.flightS < 0.995
  })
  return <group ref={ref}>{children}</group>
}

// Freezes the big stage only AFTER a frame has been drawn with the bottle
// already hidden. Fast scrolling used to freeze a mid-flight frame (a huge
// blurred bottle + giant dust specks stuck behind the collection cards).
function StagePauser({ onPause }) {
  const readyFrames = useRef(0)
  useFrame(() => {
    const landed = scroll.flight >= 1 && scroll.flightS >= 0.999
    readyFrames.current = landed ? readyFrames.current + 1 : 0
    // 2 clean frames in a row = the hidden state is on screen -> safe to stop
    if (readyFrames.current >= 2) onPause()
  })
  return null
}

// The big backlight halo would fly across the grid - hide it once the flight starts
function HideOnFlight({ children }) {
  const ref = useRef()
  useFrame(() => {
    if (ref.current) ref.current.visible = scroll.flightS < 0.03
  })
  return <group ref={ref}>{children}</group>
}

// =================================================================
// CURSOR LIGHT: a soft warm torch that follows the mouse in 3D
// =================================================================
const CURSOR_PLANE_Z = 1.0 // depth the light travels on (just in front of the bottle)

function CursorLight({ color, intensity = 12 }) {
  const lightRef = useRef()
  const { camera } = useThree()
  const pointer = usePointer()
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const target = useMemo(() => new THREE.Vector3(1.1, 0.2, CURSOR_PLANE_Z), [])

  useFrame(() => {
    const light = lightRef.current
    if (!light) return

    // Mouse ray -> point on the plane z = CURSOR_PLANE_Z
    tmp.set(pointer.current.x, pointer.current.y, 0.5).unproject(camera)
    tmp.sub(camera.position).normalize()
    if (Math.abs(tmp.z) > 1e-4) {
      const t = (CURSOR_PLANE_Z - camera.position.z) / tmp.z
      if (t > 0) target.copy(camera.position).addScaledVector(tmp, t)
    }

    light.position.lerp(target, 0.12)

    const want = (pointer.current.active ? intensity : 0) * lightFade(0.6)
    light.intensity += (want - light.intensity) * 0.08
  })

  return (
    <pointLight
      ref={lightRef}
      color={color}
      intensity={0}
      distance={4}
      decay={2}
    />
  )
}

// =================================================================
// LIGHT RIG: every light fades up in turn during the intro
// =================================================================
function useIntroLight(base, offset, color) {
  const ref = useRef()
  const target = useMemo(() => new THREE.Color(color), [])
  useEffect(() => {
    target.set(color)
  }, [color, target])

  useFrame((_, delta) => {
    const light = ref.current
    if (!light) return
    light.intensity = base * lightFade(offset)
    // Colour blends to the current slide's palette
    light.color.lerp(target, 1 - Math.exp(-Math.min(delta, 0.05) * 3))
  })
  return ref
}

function LightRig({ palette = {}, glowColor }) {
  const bottleBackTarget = useMemo(() => {
    const t = new THREE.Object3D()
    t.position.set(1.1, -0.1, 0)
    return t
  }, [])
  const floorSpotTarget = useMemo(() => {
    const t = new THREE.Object3D()
    t.position.set(1.1, -1.15, 0.3)
    return t
  }, [])
  const keyTarget = useMemo(() => {
    const t = new THREE.Object3D()
    t.position.set(1.1, 0.1, 0)
    return t
  }, [])
  const rimTarget = useMemo(() => {
    const t = new THREE.Object3D()
    t.position.set(1.1, 0.5, 0)
    return t
  }, [])

  // Slide palette overrides the theme colours (falls back to the theme)
  const c = {
    key: palette.key || T.key.color,
    rimRight: palette.rimRight || T.rimRight.color,
    rimLeft: palette.rimLeft || T.rimLeft.color,
    back: palette.back || T.back.color,
    floorSpot: palette.floorSpot || T.floorSpot.color,
    glow: glowColor || T.rubyGlow.color,
  }

  // Order of appearance: back glow -> rims -> key -> floor -> glow -> fill
  const ambientRef = useIntroLight(T.ambient.intensity, 0.0, T.ambient.color)
  const backRef = useIntroLight(T.back.intensity, 0.0, c.back)
  const rimRightRef = useIntroLight(T.rimRight.intensity, 0.12, c.rimRight)
  const rimLeftRef = useIntroLight(T.rimLeft.intensity, 0.2, c.rimLeft)
  const keyRef = useIntroLight(T.key.intensity, 0.3, c.key)
  const floorRef = useIntroLight(T.floorSpot.intensity, 0.4, c.floorSpot)
  const glowRef = useIntroLight(T.rubyGlow.intensity, 0.48, c.glow)
  const fillRef = useIntroLight(T.fill.intensity, 0.55, T.fill.color)

  // NOTE: the `color` props below are only the STARTING colours and never
  // change - the hook above blends them, so React never snaps a colour.
  return (
    <>
      <ambientLight ref={ambientRef} intensity={0} color={T.ambient.color} />

      <primitive object={bottleBackTarget} />
      <primitive object={floorSpotTarget} />
      <primitive object={keyTarget} />
      <primitive object={rimTarget} />

      {/* Key Light - BEHIND and above the bottle: a back/top light,
          so the glass glows with its real colour instead of being washed white */}
      <spotLight
        ref={keyRef}
        position={[1.6, 4.8, -2.6]}
        target={keyTarget}
        angle={0.5}
        penumbra={0.85}
        intensity={0}
        distance={22}
        decay={1.6}
        color={T.key.color}
      />

      {/* Fill Light */}
      <spotLight
        ref={fillRef}
        position={[-3.6, 1.2, 3.5]}
        target={keyTarget}
        angle={0.95}
        penumbra={1.0}
        intensity={0}
        distance={18}
        decay={1.6}
        color={T.fill.color}
      />

      {/* Rim Lights */}
      <spotLight
        ref={rimRightRef}
        position={[4.0, 2.0, -2.0]}
        target={rimTarget}
        angle={0.55}
        penumbra={0.8}
        intensity={0}
        distance={15}
        decay={1.6}
        color={T.rimRight.color}
      />
      <spotLight
        ref={rimLeftRef}
        position={[-2.8, 1.6, -1.8]}
        target={rimTarget}
        angle={0.55}
        penumbra={0.85}
        intensity={0}
        distance={15}
        decay={1.6}
        color={T.rimLeft.color}
      />

      {/* Back Light - its visible light CONE is hidden once the bottle
          leaves for the collection (it showed up as a yellow beam in the cards) */}
      <HideOnFlight>
      <SpotLight
        ref={backRef}
        position={[1.1, 2.0, -2.6]}
        target={bottleBackTarget}
        angle={0.7}
        penumbra={0.9}
        intensity={0}
        color={T.back.color}
        distance={12}
      />
      </HideOnFlight>

      {/* Inner Bottle Glow */}
      <pointLight
        ref={glowRef}
        position={[1.1, -0.1, -0.65]}
        intensity={0}
        distance={3.5}
        decay={1.7}
        color={T.rubyGlow.color}
      />

      {/* Floor Spot Light (volumetric cone hidden during the flight too) */}
      <HideOnFlight>
      <SpotLight
        ref={floorRef}
        position={[1.1, 4.0, -1.5]}
        target={floorSpotTarget}
        angle={0.85}
        penumbra={0.85}
        intensity={0}
        color={T.floorSpot.color}
        distance={14}
      />
      </HideOnFlight>

      {/* Shadow light - its only job is to cast the bottle's shadow.
          Very dim, so it does not change the look of the lighting. */}
      <directionalLight
        position={SHADOW_FROM}
        target={keyTarget}
        intensity={0.25}
        color={T.key.color}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-3.5}
        shadow-camera-right={3.5}
        shadow-camera-top={3.5}
        shadow-camera-bottom={-3.5}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      />
    </>
  )
}

// =================================================================
// SHADOW CATCHER: an invisible plane that draws ONLY the shadow, on top of
// the wet floor. (On the floor itself the bright reflection hid it.)
// =================================================================
function ShadowCatcher({ strength = SHADOW_STRENGTH, tint = '#000000' }) {
  const matRef = useRef()
  const target = useMemo(() => new THREE.Color(tint), [])
  useEffect(() => {
    target.set(tint)
  }, [tint, target])

  useFrame((_, delta) => {
    if (!matRef.current) return
    // fades in with the intro lights
    matRef.current.opacity = strength * lightFade(0.3)
    // shadow colour follows the slide (deep ruby / emerald / onyx)
    matRef.current.color.lerp(target, 1 - Math.exp(-Math.min(delta, 0.05) * 3))
  })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.1, -1.147, 0]} receiveShadow renderOrder={1}>
      <planeGeometry args={[14, 14]} />
      <shadowMaterial ref={matRef} transparent opacity={0} depthWrite={false} color="#000000" />
    </mesh>
  )
}

// =================================================================
// HERO
// =================================================================
const OVERLAY_CSS = `
@keyframes brIntroFade { from { opacity: 1; } to { opacity: 0; visibility: hidden; } }
.br-intro-black {
  animation: brIntroFade ${INTRO_TIMING.overlayDuration}s ease-in-out ${INTRO_TIMING.overlayDelay}s forwards;
}
@media (prefers-reduced-motion: reduce) { .br-intro-black { display: none; } }
`

export default function Hero() {
  const tier = useViewportTier()
  const config = SCENE_TIERS[tier]
  const reduced = useMemo(prefersReducedMotion, [])

  // Active slide (01 / 02 / 03)
  const [slideIndex, setSlideIndex] = useState(0)
  const [hasChangedSlide, setHasChangedSlide] = useState(false)
  const slide = SLIDES[slideIndex]
  const L = slide.light || {} // this slide's lighting palette

  const changeSlide = (i) => {
    if (i === slideIndex) return
    setHasChangedSlide(true)
    setSlideIndex(i)
  }

  // Loading screen first. The cinematic intro starts only when it is done,
  // so nobody misses it while assets are still downloading.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!ready) return
    const tl = playIntro()
    return () => tl?.kill()
  }, [ready])

  // Scroll tracking: hero -> anatomy
  const heroRef = useRef()
  const anatomyRef = useRef()
  const washRef = useRef()
  const [anatomyPhase, setAnatomyPhase] = useState({ phase: 'hero', step: -1 })

  // Anatomy: which part is being inspected (-1 = overview)
  const [selectedPart, setSelectedPart] = useState(-1)
  const selectPart = (i) => {
    anatomyUI.selected = i // 3D reads this every frame
    setSelectedPart(i) // HTML re-renders the details card
  }
  useScrollTracker(heroRef, anatomyRef, (phase, step) => setAnatomyPhase({ phase, step }))

  // Main 3D stage is fully hidden once the collection covers the screen:
  // stop rendering it then, so the collection's bottles get all the GPU.
  const [mainPaused, setMainPaused] = useState(false)

  // Hero-only colour wash fades out as the hero scrolls away.
  // Flight: from the moment the anatomy is fully on screen, scrolling on
  // flies the bottle into the collection card of the SAME colour.
  useEffect(() => {
    const onScroll = () => {
      if (washRef.current) washRef.current.style.opacity = String(1 - scroll.heroExit)
      const an = anatomyRef.current
      if (!an) return

      const y = window.scrollY
      const vh = window.innerHeight
      const slot = document.querySelector(`[data-bottle-slot="${slide.id}"]`)
      flight.targetId = slide.id
      flight.slotEl = slot

      const start = an.offsetTop
      let end = start + vh * 0.6
      if (slot) {
        const r = slot.getBoundingClientRect()
        const slotCentreOnPage = r.top + y + r.height / 2
        end = Math.max(start + vh * 0.4, slotCentreOnPage - vh * 0.5) // card centred on screen
      }
      scroll.flight = clamp01((y - start) / (end - start))

      // leaving the anatomy: drop the inspected part (closes its card + line)
      if (scroll.flight > 0.05 && anatomyUI.selected !== -1) {
        anatomyUI.selected = -1
        setSelectedPart(-1)
      }

      // Scrolled back up: wake the big 3D stage again.
      // (Freezing it is decided INSIDE the render loop - see <StagePauser/> -
      // so it can never freeze on a half-finished flight frame.)
      if (scroll.flight < 1) setMainPaused((prev) => (prev ? false : prev))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [slide.id])

  return (
    <div className="relative w-full" style={{ background: T.background }}>
      {/* frame-synced smooth scrolling: keeps 3D bottles glued to their cards */}
      <SmoothScroll />
      {/* =========================================================
          FIXED 3D STAGE - one canvas behind the hero AND the anatomy
          ========================================================= */}
      <div className="fixed inset-0 z-0">
        <Canvas
          frameloop={mainPaused ? 'never' : 'always'}
          shadows
          dpr={[1, 2]}
          camera={{
            position: [
              0,
              config.camY + (reduced ? 0 : INTRO_CRANE_Y),
              config.baseZ + (reduced ? 0 : INTRO_DOLLY_Z),
            ],
            fov: config.fov,
          }}
          gl={{
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: T.exposure,
            antialias: true,
          }}
        >
          <color attach="background" args={[T.background]} />
          <fog attach="fog" args={[T.background, 5.0, 15.0]} />

          <ScrollSmoother />
          <StagePauser onPause={() => setMainPaused(true)} />

          <group position={[config.offsetX, 0, 0]}>
            <LightRig palette={L} glowColor={slide.glow} />

            <Environment preset="studio" environmentIntensity={T.envIntensity} />

            <Suspense fallback={null}>
              {/* ---- the bottle travels into the anatomy section ---- */}
              <BottleRig>
                {/* Golden Backlight Halo */}
                <HideOnFlight>
                  <BacklightHalo position={[1.1, 0.25, -3.2]} scale={[9, 9, 1]} color={L.halo || T.halo} />
                </HideOnFlight>

                {/* 3D GLB Perfume Bottle */}
                <group position={[1.1, -1.15, 0]} scale={config.bottleScale}>
                  <PerfumeBottle
                    capRest={config.capRest}
                    startClosed={config.startClosed}
                    capFlip={true}
                    bottleColor={slide.bottle}
                    liquidColor={slide.liquid}
                    capColor={slide.cap}
                    glassTransmission={slide.glass?.transmission}
                    glassEnv={slide.glass?.env}
                    introDelay={reduced ? 0 : INTRO_TIMING.bottleDelay}
                    introDuration={reduced ? 0.01 : INTRO_TIMING.bottleDuration}
                    introPlay={ready}
                    onPartSelect={selectPart}
                  />
                </group>
              </BottleRig>

              {/* ---- the hero "set" sinks away on scroll ---- */}
              <ExitGroup>
                {/* Floor Light Pool */}
                <FloorGlowPool position={[1.1, -1.146, 0.2]} scale={[8, 8, 1]} color={L.floorGlow || T.floorGlow} />

                {/* Wet river stones */}
                <Rocks />

                {/* Green sprigs (every slide). For some slides only use
                    visible={!!slide.leaves} + leaves: true in slides.js */}
                <Leaves visible />

                {/* Dark Stone Base */}
                <Ground wet={0.7} />

                {/* Bottle / stone / leaf shadows, drawn above the reflection */}
                <ShadowCatcher tint={slide.liquid} />

                {/* Soft Atmospheric Smoke */}
                <Smoke color={L.smoke || T.smoke} />

                {/* Ground Contact Shadow */}
                <ContactShadows
                  position={[1.1, -1.142, 0]}
                  opacity={0.55}
                  scale={8.5 * (config.bottleScale / 22)}
                  blur={1.4}
                  far={0.35}
                  resolution={1024}
                  color="#000000"
                />
              </ExitGroup>

              {/* Floating Dust Particles (stay in both sections) */}
              <HideOnFlight>
                <DustParticles count={32} color={T.dust} />
              </HideOnFlight>
            </Suspense>
          </group>

          {/* Cursor torch lives in world space (outside the offset group) */}
          <CursorLight color={L.cursor || T.cursorLight} />

          <CameraController tier={tier} />

          <EffectComposer>
            <Bloom
              luminanceThreshold={0.5}
              luminanceSmoothing={0.4}
              intensity={0.05}
              mipmapBlur
            />
            {/* NEUTRAL keeps the bottle's real hue. ACES (the old default) pushes
              deep reds towards orange and washes saturated colours. */}
          <ToneMapping mode={ToneMappingMode.NEUTRAL ?? ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        </Canvas>

        {/* HTML LIGHTING & VIGNETTE OVERLAYS */}
        {/* Colour wash - one per slide, cross-fading; fades out on scroll */}
        <div ref={washRef} className="pointer-events-none absolute inset-0">
          {SLIDES.map((s, i) => (
            <div
              key={s.id}
              className="pointer-events-none absolute inset-0 transition-opacity duration-[1400ms] ease-in-out"
              style={{
                background: `radial-gradient(ellipse 48% 52% at 63% 50%, ${
                  s.light?.overlay || T.overlay
                }, transparent 75%)`,
                mixBlendMode: 'screen',
                opacity: i === slideIndex ? 1 : 0,
              }}
            />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_30%,rgba(5,4,3,0.55)_68%,rgba(0,0,0,0.88)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.60)_0%,transparent_20%,transparent_80%,rgba(0,0,0,0.70)_100%)]" />

        {/* FILM GRAIN */}
        <FilmGrain />
      </div>

      {/* =========================================================
          SECTION 1: HERO (scrolls away normally)
          ========================================================= */}
      <section ref={heroRef} className="pointer-events-none relative z-10 h-screen w-full overflow-hidden">
        {/* left-side darkening behind the hero copy only */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_50%,rgba(0,0,0,0.65),transparent_60%)]" />

        {/* NAVBAR */}
        <Navbar />

        {/* LEFT EDITORIAL COPY - starts after the scene has lit up */}
        {/* Intro delay only for the very first reveal; slide changes reveal at once */}
        {/* (mounted only after loading, so their reveal animations are seen) */}
        {ready && (
          <>
            <HeroContent
              slide={slide}
              delay={reduced || hasChangedSlide ? -0.5 : INTRO_TIMING.textDelay - 0.6}
            />

            {/* BOTTOM-LEFT TRUST ROW */}
            <HeroStats />

            {/* BOTTOM-RIGHT SLIDE NAVIGATION */}
            <SlideNav index={slideIndex} total={SLIDES.length} onChange={changeSlide} />
          </>
        )}
      </section>

      {/* =========================================================
          SECTION 2: THE ANATOMY OF A SIGNATURE
          ========================================================= */}
      <AnatomySection
        ref={anatomyRef}
        slide={slide}
        active={anatomyPhase.phase === 'anatomy'}
        selected={selectedPart}
        onSelect={selectPart}
      />

      {/* =========================================================
          SECTION 3: THE COLLECTION (every fragrance, every colour)
          ========================================================= */}
      <CollectionSection />

      {/* =========================================================
          SECTION 4: THE DISCOVERY SET (try all twelve)
          ========================================================= */}
      <DiscoverySection />

      {/* =========================================================
          SECTION 5: REVIEWS (press line + moving review wall)
          ========================================================= */}
      <ReviewsSection />

      {/* =========================================================
          FOOTER
          ========================================================= */}
      <Footer />

      {/* INTRO: full black that fades away as the lights come up */}
      <style>{OVERLAY_CSS}</style>
      {ready && <div className="br-intro-black pointer-events-none fixed inset-0 z-50 bg-black" />}

      {/* LOADING SCREEN: first thing on screen, hands over to the intro */}
      <LoadingScreen onDone={() => setReady(true)} />
    </div>
  )
}