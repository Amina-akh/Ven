import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars, Sparkles, Billboard, Line } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { damp3 } from 'maath/easing'
import * as THREE from 'three'

/** Номинальная эллиптическая орбита (визуализация + движение спутника), приглушённые тона */
const ORB = { a: 2.92, e: 0.088, inc: 0.165, meanMotion: 0.052 }

/**
 * Поворот орбиты вокруг Y: без добавления π — иначе аппарат часто оказывается за диском Венеры
 * относительно камеры и почти не виден.
 */
/** Поворот орбиты: дуга и аппарат в стороне, где в кадре больше «воздуха» справа от текста */
const ORBIT_YAW = 0.42

/** Дополнительный подъём орбиты по Y — меньше перекрытие сферой Венеры в кадре */
const ORBIT_Y_LIFT = 0.14

/**
 * Смещение точки взгляда камеры в сторону отрицательного X в мире:
 * визуально сцена уезжает вправо относительно центра кадра — орбита и спутник
 * попадают в область справа от стеклянного блока слайда (текст слева).
 */
const LOOK_AT_BIAS: [number, number, number] = [-1.22, 0.05, 0.16]

/** Небольшой сдвиг позиции камеры — чуть шире охват, станция не у края тумана */
const CAMERA_EXTRA: [number, number, number] = [0.48, 0.12, 0.38]

const _tmpObj = new THREE.Object3D()
const _tmpTan = new THREE.Vector3()
const _tmpNext = new THREE.Vector3()
const _probeStart = new THREE.Vector3()
orbitSample(0.15, _probeStart)

/** Камера: 10 слайдов — плавные переезды между Венерой, Землёй и орбитой */
const CAMERA_POINTS: [number, number, number][] = [
  [6.55, 0.48, 6.75],
  [6.2, 0.52, 6.62],
  [5.85, 0.58, 6.78],
  [4.25, 0.98, 7.42],
  [4.95, 0.22, 5.55],
  [4.72, 0.06, 5.78],
  [5.85, 0.5, 4.92],
  [6.95, 0.54, 4.18],
  [5.52, 0.34, 6.22],
  [6.28, 0.46, 5.68],
]

const LOOK_POINTS: [number, number, number][] = [
  [0, -0.06, 0],
  [0, 0.02, 0],
  [0, 0.08, 0],
  [-0.38, 0.12, -0.22],
  [0, 0.06, 0],
  [0, -0.04, 0],
  [0, 0.05, 0],
  [0, 0.03, 0],
  [0, -0.1, 0],
  [0, 0, 0],
]

function SmoothCamera({ slideIndex }: { slideIndex: number }) {
  const { camera } = useThree()
  const goalPos = useRef(new THREE.Vector3())
  const goalLook = useRef(new THREE.Vector3())
  const smoothLook = useRef(new THREE.Vector3(0, 0, 0))

  useFrame((_, delta) => {
    const i = Math.max(0, Math.min(slideIndex, CAMERA_POINTS.length - 1))
    const [cx, cy, cz] = CAMERA_POINTS[i]
    goalPos.current.set(
      cx + CAMERA_EXTRA[0],
      cy + CAMERA_EXTRA[1],
      cz + CAMERA_EXTRA[2],
    )
    const [lx, ly, lz] = LOOK_POINTS[i]
    goalLook.current.set(
      lx + LOOK_AT_BIAS[0],
      ly + LOOK_AT_BIAS[1],
      lz + LOOK_AT_BIAS[2],
    )
    damp3(camera.position, goalPos.current, 0.92, delta, 28)
    damp3(smoothLook.current, goalLook.current, 0.88, delta, 22)
    camera.lookAt(smoothLook.current)
  })

  return null
}

/** Сфера-небо с мягкой «полосой» Млечного Пути (градиент на canvas) */
function MilkyWayDome() {
  const map = useMemo(() => {
    const w = 2048
    const h = 1024
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')!
    const sky = g.createRadialGradient(w * 0.35, h * 0.2, 0, w * 0.5, h * 0.5, w * 0.85)
    sky.addColorStop(0, 'rgba(38, 36, 58, 0.38)')
    sky.addColorStop(0.25, 'rgba(22, 26, 48, 0.24)')
    sky.addColorStop(0.55, 'rgba(12, 14, 28, 0.12)')
    sky.addColorStop(1, 'rgba(2, 3, 10, 0)')
    g.fillStyle = sky
    g.fillRect(0, 0, w, h)

    g.save()
    g.translate(w * 0.5, h * 0.42)
    g.rotate(-0.35)
    const band = g.createLinearGradient(-w * 0.5, 0, w * 0.5, 0)
    band.addColorStop(0, 'rgba(255, 255, 255, 0)')
    band.addColorStop(0.08, 'rgba(200, 190, 255, 0.12)')
    band.addColorStop(0.5, 'rgba(200, 198, 218, 0.12)')
    band.addColorStop(0.92, 'rgba(200, 190, 255, 0.1)')
    band.addColorStop(1, 'rgba(255, 255, 255, 0)')
    g.fillStyle = band
    g.beginPath()
    g.ellipse(0, 0, w * 0.48, h * 0.09, 0, 0, Math.PI * 2)
    g.fill()
    g.restore()

    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [])

  return (
    <mesh renderOrder={-20}>
      <sphereGeometry args={[120, 48, 48]} />
      <meshBasicMaterial
        map={map}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest
        toneMapped={false}
      />
    </mesh>
  )
}

/** Далёкое мягкое свечение «Солнца» — аддитивный билборд */
function DistantSunBillboard() {
  const map = useMemo(() => {
    const s = 512
    const c = document.createElement('canvas')
    c.width = s
    c.height = s
    const g = c.getContext('2d')!
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s * 0.48)
    grd.addColorStop(0, 'rgba(255, 252, 235, 1)')
    grd.addColorStop(0.12, 'rgba(255, 230, 180, 0.55)')
    grd.addColorStop(0.35, 'rgba(255, 170, 90, 0.18)')
    grd.addColorStop(0.65, 'rgba(255, 120, 60, 0.05)')
    grd.addColorStop(1, 'rgba(0, 0, 0, 0)')
    g.fillStyle = grd
    g.fillRect(0, 0, s, s)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])

  return (
    <Billboard position={[32, 6, 18]} follow>
      <mesh renderOrder={-15}>
        <planeGeometry args={[56, 56]} />
        <meshBasicMaterial
          map={map}
          transparent
          opacity={0.58}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  )
}

/** Несколько слоёв звёзд разного размера и глубины + мерцание через speed */
function LayeredStars() {
  return (
    <group>
      <Stars
        radius={140}
        depth={70}
        count={11000}
        factor={3.5}
        saturation={0.02}
        fade
        speed={0.07}
      />
      <Stars
        radius={85}
        depth={45}
        count={6200}
        factor={2.25}
        saturation={0.08}
        fade
        speed={0.16}
      />
      <Stars
        radius={45}
        depth={22}
        count={3600}
        factor={1.2}
        saturation={0.12}
        fade
        speed={0.28}
      />
    </group>
  )
}

/** Яркие «блики» — крупные близкие искры */
function SparkleFields() {
  return (
    <group>
      <Sparkles
        count={120}
        scale={[24, 16, 22]}
        position={[2, 1.5, -4]}
        size={2.2}
        speed={0.16}
        opacity={0.22}
        color="#8a9eb0"
      />
      <Sparkles
        count={80}
        scale={[18, 22, 16]}
        position={[-6, -2, 2]}
        size={1.6}
        speed={0.22}
        opacity={0.16}
        color="#9a9aa5"
      />
      <Sparkles
        count={70}
        scale={[20, 10, 26]}
        position={[5, -3, -8]}
        size={1.35}
        speed={0.32}
        opacity={0.14}
        color="#8b8aa0"
      />
    </group>
  )
}

function orbitSample(nu: number, target: THREE.Vector3) {
  const cos = Math.cos(nu)
  const sin = Math.sin(nu)
  const r = (ORB.a * (1 - ORB.e * ORB.e)) / (1 + ORB.e * cos)
  const x = r * cos
  const z = r * sin
  const y = z * Math.sin(ORB.inc)
  const zz = z * Math.cos(ORB.inc)
  const cy = Math.cos(ORBIT_YAW)
  const sy = Math.sin(ORBIT_YAW)
  const xr = x * cy - zz * sy
  const zr = x * sy + zz * cy
  target.set(xr, y + 0.018 + ORBIT_Y_LIFT, zr)
}

/** Номинальная орбита — тонкая линия для учебной 3D-визуализации */
function NominalOrbitPath() {
  const pts = useMemo(() => {
    const arr: THREE.Vector3[] = []
    for (let i = 0; i <= 200; i++) {
      const nu = (i / 200) * Math.PI * 2
      arr.push(new THREE.Vector3())
      orbitSample(nu, arr[arr.length - 1])
    }
    return arr
  }, [])

  return (
    <Line
      points={pts}
      color="#7a8ca8"
      lineWidth={1.35}
      transparent
      opacity={0.4}
      depthWrite={false}
    />
  )
}

function PostFX() {
  return (
    <EffectComposer multisampling={2} enableNormalPass={false}>
      <Bloom
        intensity={0.32}
        luminanceThreshold={0.74}
        luminanceSmoothing={0.55}
        mipmapBlur
        radius={0.48}
      />
      <Vignette darkness={0.48} offset={0.24} eskil={false} />
    </EffectComposer>
  )
}

function VenusBody() {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame(({ clock }, delta) => {
    if (!mesh.current) return
    const t = clock.elapsedTime
    const lib = 1 + 0.012 * Math.sin(t * 0.22)
    mesh.current.rotation.y += delta * 0.028 * lib
  })

  return (
    <mesh ref={mesh} castShadow receiveShadow position={[0, -0.12, 0]}>
      <sphereGeometry args={[1.52, 144, 144]} />
      <meshStandardMaterial
        color="#6c4a3a"
        emissive="#1a1210"
        emissiveIntensity={0.22}
        roughness={0.93}
        metalness={0.08}
      />
    </mesh>
  )
}

function VenusClouds() {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.038
  })

  return (
    <mesh ref={mesh} position={[0, -0.1, 0]} scale={[1.045, 1.03, 1.045]}>
      <sphereGeometry args={[1.52, 64, 64]} />
      <meshPhysicalMaterial
        color="#c4bdb2"
        transparent
        opacity={0.11}
        roughness={0.97}
        metalness={0}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function VenusGlow() {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!mesh.current) return
    const p = 0.032 + 0.012 * Math.sin(clock.elapsedTime * 0.5)
    const m = mesh.current.material as THREE.MeshBasicMaterial
    m.opacity = p
  })
  return (
    <mesh ref={mesh} position={[0, -0.12, 0]} scale={[1.14, 1.12, 1.14]}>
      <sphereGeometry args={[1.52, 48, 48]} />
      <meshBasicMaterial
        color="#9a7058"
        transparent
        opacity={0.04}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function Earth() {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.072
  })

  return (
    <group position={[-4.35, 0.85, -5.6]}>
      <mesh ref={mesh} castShadow>
        <sphereGeometry args={[0.24, 48, 48]} />
        <meshStandardMaterial
          color="#2a4a62"
          emissive="#0a1420"
          emissiveIntensity={0.18}
          roughness={0.62}
          metalness={0.1}
        />
      </mesh>
      <mesh scale={[1.06, 1.06, 1.06]}>
        <sphereGeometry args={[0.24, 32, 32]} />
        <meshBasicMaterial
          color="#5a7a90"
          transparent
          opacity={0.14}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function SolarWing({ side }: { side: 1 | -1 }) {
  const cells = useMemo(() => {
    const rows = 5
    const cols = 10
    const arr: [number, number][] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        arr.push([c, r])
      }
    }
    return arr
  }, [])

  const x0 = side * 0.52
  const strutLen = 0.48

  return (
    <group position={[side * 0.22, 0.02, 0]} rotation={[0, 0, side * 0.08]}>
      <mesh position={[side * strutLen * 0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, strutLen, 10]} />
        <meshStandardMaterial color="#6a7388" metalness={0.7} roughness={0.35} />
      </mesh>
      <group position={[x0, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.62, 0.028, 0.2]} />
          <meshStandardMaterial
            color="#1b2d52"
            metalness={0.35}
            roughness={0.42}
          />
        </mesh>
        {cells.map(([c, r]) => (
          <mesh
            key={`${c}-${r}`}
            position={[
              side * (-0.22 + c * 0.048),
              0.017,
              -0.06 + r * 0.028,
            ]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <boxGeometry args={[0.038, 0.006, 0.022]} />
            <meshStandardMaterial
              color={c % 2 === r % 2 ? '#0d1f3d' : '#152a4a'}
              metalness={0.25}
              roughness={0.45}
            />
          </mesh>
        ))}
        <mesh position={[0, -0.018, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.64, 0.012, 0.22]} />
          <meshStandardMaterial color="#3d465c" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
    </group>
  )
}

function VeneraProbe() {
  const root = useRef<THREE.Group>(null)
  const spinner = useRef<THREE.Group>(null)
  const smoothPos = useRef(_probeStart.clone())
  const rawPos = useRef(new THREE.Vector3())

  useFrame(({ clock }, delta) => {
    if (!root.current) return
    const et = clock.elapsedTime
    const nu = et * ORB.meanMotion + 0.12 * Math.sin(et * 0.014)
    orbitSample(nu, rawPos.current)
    rawPos.current.y += 0.018 * Math.sin(nu * 2.05 + 0.7)
    damp3(smoothPos.current, rawPos.current, 0.96, delta, 8)
    root.current.position.copy(smoothPos.current)

    orbitSample(nu + 0.045, _tmpNext)
    _tmpTan.subVectors(_tmpNext, smoothPos.current).normalize()
    const target = smoothPos.current.clone().add(_tmpTan)
    _tmpObj.position.copy(smoothPos.current)
    _tmpObj.up.set(0, 1, 0)
    _tmpObj.lookAt(target)
    root.current.quaternion.slerp(
      _tmpObj.quaternion,
      1 - Math.exp(-3.8 * delta),
    )

    if (spinner.current) {
      spinner.current.rotation.y += delta * 0.32
    }
  })

  return (
    <group ref={root} scale={1.14} renderOrder={10}>
      <group ref={spinner}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.11, 0.17, 0.62, 32]} />
        <meshStandardMaterial
          color="#7a8294"
          metalness={0.62}
          roughness={0.38}
        />
      </mesh>

      <mesh position={[0, -0.02, 0]} castShadow>
        <torusGeometry args={[0.16, 0.022, 12, 40]} />
        <meshStandardMaterial color="#7a8499" metalness={0.65} roughness={0.32} />
      </mesh>

      <mesh position={[0, 0.38, 0]} castShadow>
        <coneGeometry args={[0.13, 0.32, 28]} />
        <meshStandardMaterial color="#8d96ab" metalness={0.55} roughness={0.38} />
      </mesh>

      <mesh position={[0, -0.42, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.06, 0.14, 24]} />
        <meshStandardMaterial color="#2a2f38" metalness={0.5} roughness={0.55} />
      </mesh>
      <mesh position={[0, -0.56, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[0.09, 0.26, 20]} />
        <meshStandardMaterial
          color="#8a7848"
          emissive="#2a2418"
          emissiveIntensity={0.1}
          metalness={0.42}
          roughness={0.48}
        />
      </mesh>

      <mesh position={[0, 0.22, 0.19]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.42, 8]} />
        <meshStandardMaterial color="#cfd5e8" metalness={0.85} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0.44, 0.22]} rotation={[-0.65, 0, 0]}>
        <torusGeometry args={[0.09, 0.035, 16, 40, Math.PI * 1.15]} />
        <meshStandardMaterial
          color="#e8ecf7"
          metalness={0.75}
          roughness={0.22}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.38, 0.34]} rotation={[0.85, 0, 0]}>
        <torusGeometry args={[0.045, 0.008, 8, 24]} />
        <meshStandardMaterial
          color="#6a8a98"
          emissive="#1a3038"
          emissiveIntensity={0.18}
          metalness={0.65}
          roughness={0.32}
        />
      </mesh>

      <mesh position={[0, -0.18, 0.21]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.08, 0.04, 0.06]} />
        <meshStandardMaterial color="#1a2438" metalness={0.4} roughness={0.5} />
      </mesh>

      <SolarWing side={1} />
      <SolarWing side={-1} />

      {[
        [0.2, 0.12, 0.14],
        [-0.2, 0.12, 0.14],
        [0.18, -0.2, 0.12],
        [-0.18, -0.2, 0.12],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[0.028, 12, 12]} />
          <meshStandardMaterial
            color="#444"
            emissive="#5a3830"
            emissiveIntensity={0.14}
            metalness={0.4}
            roughness={0.5}
          />
        </mesh>
      ))}
      </group>
    </group>
  )
}

function SunLight() {
  return (
    <>
      <ambientLight intensity={0.11} />
      <directionalLight
        position={[9, 3.5, 5]}
        intensity={1.22}
        color="#eae4dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={30}
        shadow-camera-near={1}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <pointLight position={[-4.5, 1.2, -2]} intensity={0.38} color="#7ee8ff" />
      <pointLight position={[2, -1, 3]} intensity={0.14} color="#ff9a6b" />
    </>
  )
}

export function SpaceScene({ slideIndex }: { slideIndex: number }) {
  return (
    <div className="space-canvas" aria-hidden="true">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [6.35, 0.42, 6.55], fov: 43 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <color attach="background" args={['#060810']} />
        <fog attach="fog" args={['#070a12', 12, 48]} />

        <SmoothCamera slideIndex={slideIndex} />
        <SunLight />

        <MilkyWayDome />
        <DistantSunBillboard />
        <LayeredStars />
        <SparkleFields />

        <Earth />
        <VenusGlow />
        <VenusBody />
        <VenusClouds />
        <NominalOrbitPath />
        <VeneraProbe />

        <PostFX />
      </Canvas>
      <div className="space-canvas__vignette" />
    </div>
  )
}
