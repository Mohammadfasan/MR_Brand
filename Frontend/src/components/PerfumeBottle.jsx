import { useMemo, useRef, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree, createPortal } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

import { scroll, anatomy3d, anatomyUI, flight, easeInOut, clamp01 } from './Scrollstore'
import SprayMist from './Spraymist'
import bottleGlb from '../assets/Mr Brand.glb?url'

export function PerfumeBottle({
  // Where the detached cap rests on the floor, in bottle-local units.
  capRest = [-0.1, 0, 0.048],
  // false = cap starts on the floor, true = cap starts on the bottle
  startClosed = false,
  // true = cap lies on its side on the floor, false = cap stands upright
  capLying = true,
  // true = cap lies BESIDE the bottle, a new spot every drop
  randomDrop = true,
  // which side of the bottle: 'both' (random), 'left' or 'right'
  capSide = 'both',
  // true = cap turned the OTHER way round (open end faces away from bottle)
  capFlip = false,
  // Called with (originWorld, directionWorld) when the nozzle is pressed
  onSpray,
  // Which way the nozzle sprays, in bottle space ([-1,...] = to the left)
  sprayDirection = [-1, 0.12, 0.35],
  // Extra settings for the spray, e.g. { distance: 1.4, intensity: 1.3 }
  sprayOptions = {},
  // Bottle glass colour - the spray is tinted to match it automatically
  bottleColor = '#e60220',
  // Anatomy section: called with a part index when a part is clicked
  onPartSelect,
  // Perfume inside + cap metal (cap, collar, sprayer, label follow capColor)
  liquidColor = '#450006',
  capColor = '#e8ab2c',
  // Glass: how clear (transmission) and how reflective (env) - per slide
  glassTransmission = 0.88,
  glassEnv = 1.4,
  // Intro: bottle floats down from above and settles (seconds)
  introDelay = 0.35,
  introDuration = 2.4,
  ...props
}) {
  const { scene } = useGLTF(bottleGlb)
  const { gl, scene: rootScene, camera, size } = useThree()
  const mistRef = useRef()

  // Cap state lives in refs (no re-render needed - useFrame drives the cap)
  const closedRef = useRef(startClosed)
  const isAnimatingRef = useRef(false)
  const capTweenRef = useRef(null)

  const bottleGroupRef = useRef()
  const capGroupRef = useRef()
  const neckTargetRef = useRef()
  const idleGroupRef = useRef()

  const introRef = useRef({ progress: 0 })
  const hoverRef = useRef({ amount: 0 })
  const hoverCountRef = useRef(0)

  // Reusable scratch objects (avoid allocating every frame)
  const scratch = useMemo(
    () => ({
      parentQuat: new THREE.Quaternion(),
      parentScale: new THREE.Vector3(),
    }),
    []
  )

  const setHover = (entering) => {
    hoverCountRef.current = Math.max(
      0,
      hoverCountRef.current + (entering ? 1 : -1)
    )

    gsap.to(hoverRef.current, {
      amount: hoverCountRef.current > 0 ? 1 : 0,
      duration: 0.7,
      ease: 'power2.out',
      overwrite: true,
    })
  }

  useEffect(() => {
    const tween = gsap.to(introRef.current, {
      progress: 1,
      duration: introDuration,
      delay: introDelay,
      ease: 'power3.out',
    })
    return () => {
      tween.kill()
      capTweenRef.current?.kill()
    }
  }, [])

  // =========================================================
  // MOUSE DRAG + INERTIA ROTATION
  // =========================================================
  useEffect(() => {
    const canvas = gl.domElement
    if (!canvas) return

    let isDragging = false
    let previousX = 0
    let previousY = 0

    let velocityX = 0
    let velocityY = 0

    const handlePointerDown = (e) => {
      if (scroll.heroExit > 0.3) return // anatomy section: bottle is on rails
      isDragging = true
      previousX = e.clientX
      previousY = e.clientY
      velocityX = 0
      velocityY = 0
      canvas.style.cursor = 'grabbing'
    }

    const handlePointerMove = (e) => {
      if (!isDragging || !bottleGroupRef.current) return

      const deltaX = e.clientX - previousX
      const deltaY = e.clientY - previousY

      bottleGroupRef.current.rotation.y += deltaX * 0.01
      bottleGroupRef.current.rotation.x += deltaY * 0.005

      bottleGroupRef.current.rotation.x = THREE.MathUtils.clamp(
        bottleGroupRef.current.rotation.x,
        -0.5,
        0.5
      )

      velocityX = deltaX * 0.003
      velocityY = deltaY * 0.001

      previousX = e.clientX
      previousY = e.clientY
    }

    const handlePointerUp = () => {
      isDragging = false
      canvas.style.cursor = 'grab'
    }

    let animationId
    const inertia = () => {
      if (!isDragging && bottleGroupRef.current) {
        bottleGroupRef.current.rotation.y += velocityX
        bottleGroupRef.current.rotation.x += velocityY

        bottleGroupRef.current.rotation.x = THREE.MathUtils.clamp(
          bottleGroupRef.current.rotation.x,
          -0.5,
          0.5
        )

        velocityX *= 0.95
        velocityY *= 0.95

        if (Math.abs(velocityX) < 0.0001) velocityX = 0
        if (Math.abs(velocityY) < 0.0001) velocityY = 0
      }

      animationId = requestAnimationFrame(inertia)
    }

    inertia()
    canvas.style.cursor = 'grab'

    canvas.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      cancelAnimationFrame(animationId)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      canvas.style.cursor = ''
    }
  }, [gl])

  // =========================================================
  // MATERIALS CONFIGURATION
  // =========================================================
  const bottleGlassMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(bottleColor),
        metalness: 0.0,
        roughness: 0.06,
        transmission: 0.88,
        transparent: true,
        opacity: 1.0,
        ior: 1.48,
        thickness: 0.30,
        clearcoat: 0.8,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.4,
        depthWrite: true,
      }),
    []
  )

  // Gold cap. Change color to '#D4A544' to match the logo gold exactly.
  // =========================================================
  // SLIDE COLOURS - smooth blend + a showcase spin on every change
  // =========================================================
  const colorTargets = useMemo(
    () => ({
      glass: new THREE.Color(),
      liquid: new THREE.Color(),
      cap: new THREE.Color(),
      emissive: new THREE.Color(),
    }),
    []
  )
  const spinRef = useRef({ angle: 0 })
  const glassRef = useRef({ transmission: glassTransmission, env: glassEnv })
  const firstColorsRef = useRef(true)
  const lastColorsKeyRef = useRef('')

  useEffect(() => {
    colorTargets.glass.set(bottleColor)
    colorTargets.liquid.set(liquidColor)
    colorTargets.cap.set(capColor)
    colorTargets.emissive.set(capColor).multiplyScalar(0.22)

    // Same colours as before (e.g. React StrictMode re-running effects): no spin
    const key = `${bottleColor}|${liquidColor}|${capColor}`
    if (key === lastColorsKeyRef.current) return
    lastColorsKeyRef.current = key

    if (firstColorsRef.current) {
      // First load: apply instantly, no blend
      firstColorsRef.current = false
      bottleGlassMaterial.color.copy(colorTargets.glass)
      liquidMaterial.color.copy(colorTargets.liquid)
      capMaterial.color.copy(colorTargets.cap)
      goldMaterial.color.copy(colorTargets.cap)
      brandMaterial.color.copy(colorTargets.cap)
      brandMaterial.emissive.copy(colorTargets.emissive)
      return
    }

    // Slide change: one elegant full turn while the colours blend
    const tween = gsap.to(spinRef.current, {
      angle: spinRef.current.angle + Math.PI * 2,
      duration: 1.4,
      ease: 'power3.inOut',
    })
    return () => tween.progress(1).kill()
  }, [bottleColor, liquidColor, capColor])

  // Spray colours derived from the bottle colour:
  //  - droplets: a brighter, glowing version (additive light needs brightness)
  //  - mist    : the bottle colour softened with a touch of warm gold,
  //              so it still melts into the scene smoke
  const sprayColors = useMemo(() => {
    const base = new THREE.Color(bottleColor)
    const drop = base.clone().lerp(new THREE.Color('#ffffff'), 0.35)
    const mist = base.clone().lerp(new THREE.Color('#d9b27c'), 0.3)
    return {
      dropColor: '#' + drop.getHexString(),
      mistColor: '#' + mist.getHexString(),
    }
  }, [bottleColor])

  const capMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#e8ab2c'),
        metalness: 0.92,
        roughness: 0.18,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.8,
        transparent: false,
        depthWrite: true,
      }),
    []
  )

  const goldMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#D4A544'),
        metalness: 0.92,
        roughness: 0.18,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.8,
      }),
    []
  )

  const brandMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#D4A544'),
        metalness: 0.92,
        roughness: 0.18,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.8,
        emissive: new THREE.Color('#4a3005'),
        emissiveIntensity: 0.8,
      }),
    []
  )

  const liquidMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#450006'),
        metalness: 0.0,
        roughness: 0.10,
        transmission: 0.40,
        transparent: true,
        opacity: 0.96,
        ior: 1.33,
        thickness: 0.40,
        envMapIntensity: 1.3,
        depthWrite: false,
      }),
    []
  )

  const pumpMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#1a1a1e'),
        roughness: 0.25,
        metalness: 0.85,
      }),
    []
  )

  // Target bottle neck calculation
  const neckPosition = useMemo(() => {
    let originalCapNode = null
    let bottleMeshNode = null
    scene.traverse((child) => {
      if (child.isMesh && child.name === 'CAP_OUTER') {
        originalCapNode = child
      }
      if (child.isMesh && child.name === 'BOTTLE_GLASS') {
        bottleMeshNode = child
      }
    })

    if (originalCapNode && bottleMeshNode) {
      scene.updateMatrixWorld(true)
      const capBox = new THREE.Box3().setFromObject(originalCapNode)
      const bottleBox = new THREE.Box3().setFromObject(bottleMeshNode)

      const centerX = (capBox.min.x + capBox.max.x) / 2
      const centerZ = (capBox.min.z + capBox.max.z) / 2
      const minY = capBox.min.y - bottleBox.min.y

      return new THREE.Vector3(centerX, minY, centerZ)
    }

    return new THREE.Vector3(0, 0.085, 0)
  }, [scene])

  // Setup cloned scene with custom materials
  const bottleScene = useMemo(() => {
    const cloned = scene.clone(true)

    cloned.traverse((child) => {
      const name = child.name || ''
      const lowerName = name.toLowerCase()

      if (
        name.startsWith('BAK_') ||
        lowerName.includes('floor') ||
        lowerName.includes('plane')
      ) {
        child.visible = false
        return
      }

      if (!child.isMesh) return

      child.castShadow = true
      child.receiveShadow = true

      if (name === 'BOTTLE_GLASS') {
        child.material = bottleGlassMaterial
        child.renderOrder = 3
      } else if (name === 'LIQUID') {
        child.material = liquidMaterial
        child.renderOrder = 2

        const bottleMesh = cloned.getObjectByName('BOTTLE_GLASS')
        if (bottleMesh) {
          bottleMesh.geometry.computeBoundingBox()
          const bodyBB = bottleMesh.geometry.boundingBox
          const bodyMinY = bodyBB.min.y * bottleMesh.scale.y
          const bodyMaxY = bodyBB.max.y * bottleMesh.scale.y
          const bodyHeight = bodyMaxY - bodyMinY

          child.geometry.computeBoundingBox()
          const liqBB = child.geometry.boundingBox
          const liqHeight = liqBB.max.y - liqBB.min.y

          if (liqHeight > 0 && bodyHeight > 0) {
            const liquidLevel = 0.75
            const targetHeight = bodyHeight * liquidLevel
            const scaleY = targetHeight / liqHeight

            child.scale.y = scaleY
            const desiredTopY = bodyMinY + bodyHeight * liquidLevel
            const currentTopY = liqBB.max.y * scaleY
            child.position.y += desiredTopY - currentTopY
          }
        }
      } else if (name === 'BRAND_TEXT') {
        child.material = brandMaterial
        child.renderOrder = 4
      } else if (
        name === 'CAP_BAND' ||
        name === 'GOLD_COLLAR' ||
        name === 'SPRAYER' ||
        name === 'ATOMIZER_STEM'
      ) {
        child.material = goldMaterial
        child.renderOrder = 1
      } else if (name === 'PUMP') {
        child.material = pumpMaterial
        child.renderOrder = 1
      } else if (name === 'CAP_OUTER') {
        child.visible = false
      }
    })

    cloned.updateMatrixWorld(true)
    const bottleMesh = cloned.getObjectByName('BOTTLE_GLASS')
    const box = new THREE.Box3().setFromObject(bottleMesh || cloned)
    cloned.position.y -= box.min.y

    return cloned
  }, [
    scene,
    bottleGlassMaterial,
    liquidMaterial,
    brandMaterial,
    goldMaterial,
    pumpMaterial,
  ])

  // Detached cap mesh (origin moved to the centre of its bottom face)
  const capMesh = useMemo(() => {
    let originalCap = null
    scene.traverse((child) => {
      if (child.isMesh && child.name === 'CAP_OUTER') {
        originalCap = child
      }
    })

    if (!originalCap) return null

    const capClone = originalCap.clone(true)
    capClone.material = capMaterial
    capClone.castShadow = true
    capClone.receiveShadow = true
    capClone.visible = true

    capClone.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(capClone)
    const centerX = (box.min.x + box.max.x) / 2
    const centerZ = (box.min.z + box.max.z) / 2
    const minY = box.min.y

    capClone.geometry = capClone.geometry.clone()
    capClone.geometry.translate(-centerX, -minY, -centerZ)
    capClone.position.set(0, 0, 0)

    return capClone
  }, [scene, capMaterial])

  // Cap radius - lifts a lying cap so it rests ON the floor, not inside it
  const capRadius = useMemo(() => {
    if (!capMesh) return 0
    capMesh.geometry.computeBoundingBox()
    const b = capMesh.geometry.boundingBox
    const width = Math.max(b.max.x - b.min.x, b.max.z - b.min.z)
    return (width / 2) * capMesh.scale.x
  }, [capMesh])

  // Cap height (length when it lies on its side)
  const capHeight = useMemo(() => {
    if (!capMesh) return 0
    const b = capMesh.geometry.boundingBox
    return (b.max.y - b.min.y) * capMesh.scale.y
  }, [capMesh, capRadius])

  // Bottle radius on the floor - the cap must never land inside the bottle
  const bottleRadius = useMemo(() => {
    const glass = bottleScene.getObjectByName('BOTTLE_GLASS')
    bottleScene.updateMatrixWorld(true)
    const b = new THREE.Box3().setFromObject(glass || bottleScene)
    return Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / 2
  }, [bottleScene])

  // Current floor pose of the cap (changes on every drop)
  const restPosRef = useRef(new THREE.Vector3())
  const restQuatRef = useRef(new THREE.Quaternion())
  const restEuler = useMemo(() => new THREE.Euler(), [])

  const liftY = capLying ? capRadius : 0
  const tiltZ = capLying ? Math.PI / 2 : 0

  // Place the cap on the floor BESIDE the bottle (not in front of it),
  // lying sideways so it reads as "fallen off" from the camera's view.
  const pickRandomRest = () => {
    const prevX = restPosRef.current.x
    let side =
      capSide === 'left' ? -1 : capSide === 'right' ? 1 : Math.random() > 0.5 ? 1 : -1

    // For 'both', prefer switching sides so each drop clearly looks different
    if (capSide === 'both' && Math.random() > 0.3 && prevX !== 0) {
      side = prevX > 0 ? -1 : 1
    }

    const gap = THREE.MathUtils.randFloat(0.25, 0.8) * capRadius
    // Same depth as the bottle, only a little forward - never towards the camera
    const z = THREE.MathUtils.randFloat(0.25, 0.6) * bottleRadius // in front of the side stones

    let x
    let yaw
    if (capLying) {
      // Pivot = open end of the cap, placed just outside the bottle.
      // The closed top points AWAY from the bottle, along the floor.
      if (capFlip) {
        // Turned round: closed top towards the bottle, open end facing out.
        // The body now extends back towards the bottle, so push it out.
        x = side * (bottleRadius + gap + capHeight)
        yaw = (side < 0 ? Math.PI : 0) + THREE.MathUtils.randFloat(-0.35, 0.35)
      } else {
        x = side * (bottleRadius + gap)
        yaw = (side < 0 ? 0 : Math.PI) + THREE.MathUtils.randFloat(-0.35, 0.35)
      }
    } else {
      x = side * (bottleRadius + capRadius + gap)
      yaw = Math.random() * Math.PI * 2
    }

    restPosRef.current.set(x, capRest[1] + liftY, z)
    restEuler.set(0, yaw, tiltZ)
    restQuatRef.current.setFromEuler(restEuler)
  }

  // Starting spot: beside the bottle (randomDrop) or the fixed capRest
  useEffect(() => {
    if (randomDrop) {
      pickRandomRest()
    } else {
      restPosRef.current.set(capRest[0], capRest[1] + liftY, capRest[2])
      restEuler.set(0, 0.55 + (capFlip ? Math.PI : 0), tiltZ)
      restQuatRef.current.setFromEuler(restEuler)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [randomDrop, capSide, capFlip, capRest[0], capRest[1], capRest[2], liftY, tiltZ, bottleRadius])

  // =========================================================
  // SPRAYER (nozzle) - position in bottle space + press animation
  // =========================================================
  const sprayer = useMemo(() => {
    const mesh = bottleScene.getObjectByName('SPRAYER')
    const fallback = {
      mesh: null,
      center: new THREE.Vector3(neckPosition.x, neckPosition.y, neckPosition.z),
      width: 0.01,
      height: 0.01,
      baseY: 0,
    }
    if (!mesh) {
      console.warn('[PerfumeBottle] No mesh named SPRAYER found - spraying from the neck instead.')
      return fallback
    }

    // Box of the sprayer relative to the bottle, independent of any parent
    bottleScene.updateMatrixWorld(true)
    const rel = new THREE.Matrix4()
      .copy(bottleScene.matrixWorld)
      .invert()
      .multiply(mesh.matrixWorld)
      .premultiply(bottleScene.matrix)
    mesh.geometry.computeBoundingBox()
    const box = mesh.geometry.boundingBox.clone().applyMatrix4(rel)
    const size = new THREE.Vector3()
    box.getSize(size)

    return {
      mesh,
      center: box.getCenter(new THREE.Vector3()),
      width: Math.max(size.x, size.z),
      height: size.y,
      baseY: mesh.position.y,
    }
  }, [bottleScene, neckPosition])

  const sprayingRef = useRef(false)

  const doSpray = () => {
    if (scroll.heroExit > 0.3) return
    // Only when the cap is off and nothing else is moving
    if (closedRef.current || isAnimatingRef.current || sprayingRef.current) return
    const group = bottleGroupRef.current
    if (!group) return
    sprayingRef.current = true

    const release = () => {
      // Nozzle tip + spray direction in WORLD space (follows drag rotation)
      const dirLocal = new THREE.Vector3(...sprayDirection).normalize()
      const origin = sprayer.center
        .clone()
        .addScaledVector(dirLocal, sprayer.width * 0.5)
      origin.y += sprayer.height * 0.15
      group.localToWorld(origin)

      const q = new THREE.Quaternion()
      group.getWorldQuaternion(q)
      const dirWorld = dirLocal.clone().applyQuaternion(q).normalize()

      mistRef.current?.emit(origin, dirWorld)
      onSpray?.(origin, dirWorld)
    }

    const { mesh, baseY, height } = sprayer
    if (mesh) {
      // Press the actuator down, spray, then let it spring back up
      gsap
        .timeline({ onComplete: () => (sprayingRef.current = false) })
        .to(mesh.position, {
          y: baseY - height * 0.22,
          duration: 0.09,
          ease: 'power2.in',
          onComplete: release,
        })
        .to(mesh.position, { y: baseY, duration: 0.3, ease: 'back.out(2)' })
        .to({}, { duration: 0.25 }) // short cooldown
    } else {
      release()
      setTimeout(() => (sprayingRef.current = false), 600)
    }
  }

  // =========================================================
  // ANATOMY: exploded view + click-to-inspect
  // =========================================================
  // Groups of meshes that move together. Index = part number in the UI.
  //   explode : how far it floats up in the exploded view (bottle heights)
  //   show    : when selected -> forward (towards camera), lift, tilt; spin?
  const PART_GROUPS = useMemo(
    () => ({
      1: { names: ['SPRAYER', 'ATOMIZER_STEM', 'PUMP'], explode: 0.32, forward: 0.35, lift: 0.05, tilt: 0.5, spin: true },
      2: { names: ['GOLD_COLLAR', 'CAP_BAND'], explode: 0.16, forward: 0.35, lift: 0.05, tilt: 0.55, spin: true },
      5: { names: ['BRAND_TEXT'], explode: 0, forward: 0.1, lift: 0, tilt: 0, spin: false },
    }),
    []
  )

  const anatomyParts = useMemo(() => {
    bottleScene.updateMatrixWorld(true)
    const rootScale = new THREE.Vector3()
    bottleScene.getWorldScale(rootScale)

    const map = {}
    ;[
      'SPRAYER',
      'ATOMIZER_STEM',
      'PUMP',
      'GOLD_COLLAR',
      'CAP_BAND',
      'BRAND_TEXT',
      'BOTTLE_GLASS',
      'LIQUID',
    ].forEach((name) => {
      const obj = bottleScene.getObjectByName(name)
      if (!obj) return
      // offsets are given in bottle units; convert to the part's parent space
      const unit = new THREE.Vector3(1, 1, 1)
      if (obj.parent) obj.parent.getWorldScale(unit)
      unit.divide(rootScale)
      if (obj.geometry && !obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere()
      map[name] = { obj, base: obj.position.clone(), baseQuat: obj.quaternion.clone(), unit }
    })

    // pivot of each group = centre of all its meshes (in their parent space),
    // so a group tilts / spins around its own middle and stays in one piece
    const pivots = {}
    Object.entries(PART_GROUPS).forEach(([idx, g]) => {
      const box = new THREE.Box3()
      g.names.forEach((n) => {
        const p = map[n]
        if (!p || !p.obj.geometry) return
        p.obj.geometry.computeBoundingBox()
        box.union(p.obj.geometry.boundingBox.clone().applyMatrix4(p.obj.matrix))
      })
      pivots[idx] = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3())
    })
    map.__pivots = pivots
    return map
  }, [bottleScene, PART_GROUPS])

  const partsDirtyRef = useRef(false)
  const fullBoxRef = useRef(new THREE.Box3())
  const selWeightsRef = useRef([0, 0, 0, 0, 0, 0]) // eased "is selected" per part
  const spinAnglesRef = useRef([0, 0, 0, 0, 0, 0])
  const anatomyScratch = useMemo(
    () => ({
      v: new THREE.Vector3(),
      s: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      rel: new THREE.Vector3(),
      euler: new THREE.Euler(),
      yAxis: new THREE.Vector3(0, 1, 0),
    }),
    []
  )

  // mesh name -> part index (for clicks in the anatomy section)
  const PART_OF_MESH = {
    SPRAYER: 1,
    ATOMIZER_STEM: 1,
    PUMP: 1,
    GOLD_COLLAR: 2,
    CAP_BAND: 2,
    BOTTLE_GLASS: 3,
    LIQUID: 4,
    BRAND_TEXT: 5,
  }
  const inAnatomyNow = () => scroll.heroExit > 0.8

  // screen position (px) of a part's centre -> anatomy3d.anchor
  const projectAnchor = (obj) => {
    const a = anatomy3d.anchor
    if (!obj || !obj.geometry) {
      a.visible = false
      return
    }
    if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere()
    const v = anatomyScratch.v.copy(obj.geometry.boundingSphere.center)
    obj.localToWorld(v)
    v.project(camera)
    a.x = (v.x * 0.5 + 0.5) * size.width
    a.y = (-v.y * 0.5 + 0.5) * size.height
    a.visible = v.z < 1
  }

  // Neck pose expressed in the cap's parent space (follows drag + float)
  const getNeckLocal = (outPos, outQuat, outScale) => {
    const cap = capGroupRef.current
    const neck = neckTargetRef.current
    if (!cap || !neck || !cap.parent) return false

    const parent = cap.parent
    parent.updateWorldMatrix(true, false)

    neck.getWorldPosition(outPos)
    parent.worldToLocal(outPos)

    neck.getWorldQuaternion(outQuat)
    parent.getWorldQuaternion(scratch.parentQuat)
    outQuat.premultiply(scratch.parentQuat.invert())

    if (outScale) {
      neck.getWorldScale(outScale)
      parent.getWorldScale(scratch.parentScale)
      outScale.divide(scratch.parentScale)
    }
    return true
  }

  // =========================================================
  // IDLE MOTION + CAP FOLLOW
  // =========================================================
  useFrame(({ clock }, delta) => {
    // Blend materials towards the current slide colours
    const k = 1 - Math.exp(-Math.min(delta, 0.05) * 3.5)
    bottleGlassMaterial.color.lerp(colorTargets.glass, k)
    glassRef.current.transmission += (glassTransmission - glassRef.current.transmission) * k
    glassRef.current.env += (glassEnv - glassRef.current.env) * k
    bottleGlassMaterial.transmission = glassRef.current.transmission
    liquidMaterial.color.lerp(colorTargets.liquid, k)
    capMaterial.color.lerp(colorTargets.cap, k)
    goldMaterial.color.lerp(colorTargets.cap, k)
    brandMaterial.color.lerp(colorTargets.cap, k)
    brandMaterial.emissive.lerp(colorTargets.emissive, k)

    if (idleGroupRef.current) {
      const t = clock.getElapsedTime()
      const p = introRef.current.progress
      const tilt = Math.sin(t * 0.4) * 0.008
      const h = hoverRef.current.amount

      idleGroupRef.current.rotation.x = tilt * p
      idleGroupRef.current.rotation.y = spinRef.current.angle
      // Intro: starts lifted by ~70% of the bottle height, floats down
      idleGroupRef.current.position.y = (1 - p) * neckPosition.y * 0.7
      idleGroupRef.current.scale.setScalar((0.97 + 0.03 * p) * (1 + 0.02 * h))

      bottleGlassMaterial.envMapIntensity = glassRef.current.env + 0.4 * h
      bottleGlassMaterial.roughness = 0.06 - 0.02 * h
      liquidMaterial.envMapIntensity = 1.3 + 0.3 * h
      goldMaterial.envMapIntensity = 1.8 + 0.35 * h
      capMaterial.envMapIntensity = 1.8 + 0.35 * h
      brandMaterial.envMapIntensity = 1.8 + 0.35 * h
      brandMaterial.emissiveIntensity = 0.8 + 0.2 * h
    }

    // =========================================================
    // ANATOMY (driven by scroll)
    // =========================================================
    const U = neckPosition.y || 0.085 // one "bottle height" in bottle units
    const inAnatomy = scroll.heroExitS
    // flight progress (anatomy -> collection card). Declared up here because
    // the flight block below uses it before the exploded-view block does.
    const flyF = easeInOut(clamp01(scroll.flightS))

    // Glass-body centre + height in world space (camera frames this)
    if (bottleGroupRef.current) {
      const g = bottleGroupRef.current
      g.getWorldPosition(anatomyScratch.v)
      g.getWorldScale(anatomyScratch.s)
      anatomy3d.height = U * anatomyScratch.s.y
      anatomy3d.center.copy(anatomyScratch.v)
      anatomy3d.center.y += anatomy3d.height * 0.5

      // Anatomy: glass / juice selected -> slow turntable; otherwise face front
      const selNow = anatomyUI.selected
      if (inAnatomy > 0.02) {
        if (inAnatomy > 0.8 && (selNow === 3 || selNow === 4)) {
          g.rotation.y += Math.min(delta, 0.05) * 0.45
        } else {
          const ry = Math.atan2(Math.sin(g.rotation.y), Math.cos(g.rotation.y))
          const kk = Math.min(1, inAnatomy) * 0.08
          g.rotation.y = ry + (0 - ry) * kk
        }
        g.rotation.x += (0 - g.rotation.x) * Math.min(1, inAnatomy) * 0.08
      }
    }

    // Flight into the collection card
    if (flyF > 1e-4 && bottleGroupRef.current) {
      const g = bottleGroupRef.current
      // face the same way as the card bottle is turned right now
      const cardRot = flight.cardRotation[flight.targetId] || 0
      const target = Math.atan2(Math.sin(cardRot), Math.cos(cardRot))
      const cur = Math.atan2(Math.sin(g.rotation.y), Math.cos(g.rotation.y))
      let diff = target - cur
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      g.rotation.y = cur + diff * flyF

      // bounds of everything visible (glass, parts, closed cap)
      const box = fullBoxRef.current.makeEmpty()
      const addVisible = (root) =>
        root?.traverseVisible((o) => {
          if (o.isMesh && o.name !== 'SPRAY_HIT') box.expandByObject(o)
        })
      addVisible(idleGroupRef.current)
      addVisible(capGroupRef.current)
      if (!box.isEmpty()) {
        box.getCenter(anatomy3d.fullCenter)
        anatomy3d.fullHeight = box.max.y - box.min.y
      }
    }

    // Exploded view: all parts float apart as the anatomy section arrives
    const dtA = Math.min(delta, 0.05)
    const kSel = 1 - Math.exp(-dtA * 4)
    // parts close up again (in the first 40% of the flight) before landing
    const explode = easeInOut(clamp01((inAnatomy - 0.3) / 0.6)) * (1 - clamp01(flyF / 0.4))
    const sel = anatomyUI.selected
    const W = selWeightsRef.current
    const TWO_PI = Math.PI * 2
    for (let i = 0; i < 6; i++) {
      const wanted = explode > 0.5 && sel === i && flyF < 0.05 ? 1 : 0
      W[i] += (wanted - W[i]) * kSel
      if (wanted) {
        spinAnglesRef.current[i] += dtA * 0.8 * W[i]
      } else {
        // not selected any more: finish the turn back to a full rotation,
        // so square parts (collar, band) line up with the bottle again
        const target = Math.round(spinAnglesRef.current[i] / TWO_PI) * TWO_PI
        spinAnglesRef.current[i] += (target - spinAnglesRef.current[i]) * kSel
      }
    }

    let anyMove = explode
    for (let i = 0; i < 6; i++) anyMove += W[i]

    // Back in the hero: snap every part to its EXACT original position +
    // rotation (no leftover spin), then leave them alone for the spray tween
    if (anyMove <= 1e-3 && partsDirtyRef.current) {
      Object.values(PART_GROUPS).forEach((grp) =>
        grp.names.forEach((n) => {
          const p = anatomyParts[n]
          if (!p) return
          p.obj.position.copy(p.base)
          p.obj.quaternion.copy(p.baseQuat)
        })
      )
      spinAnglesRef.current = [0, 0, 0, 0, 0, 0]
      partsDirtyRef.current = false
    } else if (anyMove > 1e-3) {
      Object.entries(PART_GROUPS).forEach(([idx, grp]) => {
        const w = W[idx]
        const pivot = anatomyParts.__pivots[idx]
        const sc = anatomyScratch
        sc.euler.set(grp.tilt * w, grp.spin ? spinAnglesRef.current[idx] : 0, 0)
        sc.q.setFromEuler(sc.euler)

        grp.names.forEach((n) => {
          const p = anatomyParts[n]
          if (!p) return
          // rotate around the group's pivot, then add the offsets
          sc.rel.copy(p.base).sub(pivot).applyQuaternion(sc.q).add(pivot)
          p.obj.position.set(
            sc.rel.x,
            sc.rel.y + (grp.explode * explode + grp.lift * w) * U / p.unit.y,
            sc.rel.z + (grp.forward * w * U) / p.unit.z
          )
          p.obj.quaternion.copy(sc.q).multiply(p.baseQuat)
        })
      })
      partsDirtyRef.current = true
    }

    // The Juice: glass fades, liquid glows in the slide colour
    const juice = W[4]
    bottleGlassMaterial.opacity = 1 - 0.75 * juice
    liquidMaterial.emissive.copy(colorTargets.glass).multiplyScalar(0.55)
    liquidMaterial.emissiveIntensity = 1.6 * juice

    // Leader-line anchor for the selected part
    const anchorObj =
      inAnatomy > 0.9
        ? sel === 0
          ? capMesh
          : sel === 1
            ? anatomyParts.SPRAYER?.obj
            : sel === 2
              ? anatomyParts.GOLD_COLLAR?.obj
              : sel === 3
                ? anatomyParts.BOTTLE_GLASS?.obj
                : sel === 4
                  ? anatomyParts.LIQUID?.obj
                  : sel === 5
                    ? anatomyParts.BRAND_TEXT?.obj
                    : null
        : null
    if (anchorObj) projectAnchor(anchorObj)
    else anatomy3d.anchor.visible = false

    // Entering the anatomy with the cap on the floor: put it on first
    if (inAnatomy > 0.25 && !closedRef.current && !isAnimatingRef.current) {
      animateCap(true)
    }

    // While not animating, the cap sits either on the neck or on the floor
    const cap = capGroupRef.current
    if (!cap || isAnimatingRef.current) return

    if (closedRef.current) {
      getNeckLocal(cap.position, cap.quaternion, cap.scale)
      // Anatomy: cap floats up in the exploded view; when selected it
      // comes forward, tilts towards the camera and turns slowly
      const w0 = W[0]
      if (explode > 1e-4 || w0 > 1e-4) {
        cap.position.y += (0.55 * explode + 0.08 * w0) * U
        cap.position.z += 0.35 * w0 * U
        anatomyScratch.euler.set(0.5 * w0, spinAnglesRef.current[0], 0)
        anatomyScratch.q.setFromEuler(anatomyScratch.euler)
        cap.quaternion.multiply(anatomyScratch.q)
      }
    } else {
      cap.position.copy(restPosRef.current)
      cap.quaternion.copy(restQuatRef.current)
      cap.scale.setScalar(1)
    }
  })

  // =========================================================
  // CAP ANIMATION  (floor -> bottle, and bottle -> floor)
  // =========================================================
  const animateCap = (toClosed) => {
    const cap = capGroupRef.current
    if (!cap || isAnimatingRef.current) return
    isAnimatingRef.current = true
    gl.domElement.style.cursor = 'grab'

    // Choose the new landing spot before the cap takes off
    if (!toClosed && randomDrop) pickRandomRest()

    const startPos = cap.position.clone()
    const startQuat = cap.quaternion.clone()
    const startScale = cap.scale.clone()

    const endPos = new THREE.Vector3()
    const endQuat = new THREE.Quaternion()
    const endScale = new THREE.Vector3(1, 1, 1)

    // Arc height relative to bottle size, so it works at any scale
    const unit = neckPosition.y || 0.085
    const yAxis = new THREE.Vector3(0, 1, 0)
    const zAxis = new THREE.Vector3(0, 0, 1)
    const extraQ = new THREE.Quaternion()

    const anim = { t: 0 }

    capTweenRef.current?.kill()
    capTweenRef.current = gsap.to(anim, {
      t: 1,
      duration: toClosed ? 1.0 : 1.15,
      ease: 'power2.inOut',
      onUpdate: () => {
        const t = anim.t

        if (toClosed) {
          // Neck moves with the bottle, so re-read it every frame
          if (!getNeckLocal(endPos, endQuat, endScale)) return
        } else {
          endPos.copy(restPosRef.current)
          endQuat.copy(restQuatRef.current)
          endScale.set(1, 1, 1)
        }

        cap.position.lerpVectors(startPos, endPos, t)
        cap.position.y += Math.sin(t * Math.PI) * unit * (toClosed ? 0.55 : 0.45)

        cap.quaternion.slerpQuaternions(startQuat, endQuat, t)
        cap.scale.lerpVectors(startScale, endScale, t)

        if (toClosed) {
          // Small settle wobble as it seats on the neck
          if (t > 0.8) {
            const s = (t - 0.8) / 0.2
            cap.position.y -= Math.sin(s * Math.PI) * unit * 0.02 * (1 - s)
            extraQ.setFromAxisAngle(zAxis, Math.sin(s * Math.PI * 2) * 0.015 * (1 - s))
            cap.quaternion.multiply(extraQ)
          }
        } else {
          // Gentle spin in the air, then a tiny bounce on landing
          extraQ.setFromAxisAngle(yAxis, Math.sin(t * Math.PI) * 0.6)
          cap.quaternion.multiply(extraQ)
          if (t > 0.85) {
            const s = (t - 0.85) / 0.15
            cap.position.y += Math.sin(s * Math.PI) * unit * 0.05 * (1 - s)
          }
        }
      },
      onComplete: () => {
        closedRef.current = toClosed
        isAnimatingRef.current = false
      },
    })
  }

  return (
    <group {...props}>
      <group ref={idleGroupRef}>
        <group ref={bottleGroupRef}>
          <primitive
            object={bottleScene}
            onClick={(e) => {
              // Anatomy section: click a part to inspect it
              if (!inAnatomyNow()) return
              const idx = PART_OF_MESH[e.object.name]
              if (idx === undefined) return
              e.stopPropagation()
              onPartSelect?.(idx)
            }}
            onPointerOver={(e) => {
              e.stopPropagation()
              setHover(true)
              if (inAnatomyNow() && PART_OF_MESH[e.object.name] !== undefined) {
                gl.domElement.style.cursor = 'pointer'
              }
            }}
            onPointerOut={(e) => {
              e.stopPropagation()
              setHover(false)
            }}
          />

          <group ref={neckTargetRef} position={neckPosition} />

          {/* Invisible, bigger click area on the nozzle - easy to hit */}
          <mesh
            name="SPRAY_HIT"
            position={sprayer.center}
            onClick={(e) => {
              e.stopPropagation()
              if (inAnatomyNow()) onPartSelect?.(1) // nozzle = atomiser
              else doSpray()
            }}
            onPointerOver={(e) => {
              e.stopPropagation()
              if (!closedRef.current) gl.domElement.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              gl.domElement.style.cursor = 'grab'
            }}
          >
            <sphereGeometry
              args={[Math.max(sprayer.width, sprayer.height) * 1.3, 16, 12]}
            />
            <meshBasicMaterial
              transparent
              opacity={0}
              depthWrite={false}
              colorWrite={false}
            />
          </mesh>
        </group>
      </group>

      {/* One cap, always here. useFrame puts it on the neck or the floor. */}
      {capMesh && (
        <group ref={capGroupRef}>
          <primitive
            object={capMesh}
            onClick={(e) => {
              e.stopPropagation()
              if (inAnatomyNow()) {
                onPartSelect?.(0) // anatomy: inspect the cap
                return
              }
              if (scroll.heroExit > 0.3) return
              animateCap(!closedRef.current)
            }}
            onPointerOver={(e) => {
              e.stopPropagation()
              if (!isAnimatingRef.current) gl.domElement.style.cursor = 'pointer'
            }}
            onPointerOut={() => {
              gl.domElement.style.cursor = 'grab'
            }}
          />
        </group>
      )}

      {/* Spray lives in WORLD space (scene root), so it never spins
          with the bottle and needs no wiring in Hero.jsx */}
      {createPortal(<SprayMist ref={mistRef} {...sprayColors} {...sprayOptions} />, rootScene)}
    </group>
  )
}

useGLTF.preload(bottleGlb)