import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { damp3 } from 'maath/easing'
import * as THREE from 'three'
import { EARTH_POS, VENUS_POS, SUN_POS, VENUS_BODY_RADIUS } from './physics'
import { useMissionStore } from './store'
import { createEarthTexture, createVenusTexture } from './proceduralTextures'

const _probe = new THREE.Vector3()
const _vel = new THREE.Vector3()
const _camGoal = new THREE.Vector3()
const _look = new THREE.Vector3()
const _shake = new THREE.Vector3()

function MissionSun() {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.045
  })
  return (
    <mesh ref={mesh} position={SUN_POS}>
      <sphereGeometry args={[0.36, 56, 56]} />
      <meshStandardMaterial
        color="#ffe8cc"
        emissive="#ffaa66"
        emissiveIntensity={2.45}
        roughness={0.88}
        metalness={0}
      />
    </mesh>
  )
}

function ProceduralEarth() {
  const map = useMemo(() => createEarthTexture(), [])
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.32
  })
  return (
    <mesh ref={mesh} position={EARTH_POS} castShadow receiveShadow>
      <sphereGeometry args={[0.54, 72, 72]} />
      <meshStandardMaterial
        map={map}
        roughness={0.68}
        metalness={0.14}
        emissive="#0a1830"
        emissiveIntensity={0.12}
      />
    </mesh>
  )
}

function ProceduralVenus() {
  const map = useMemo(() => createVenusTexture(), [])
  const mesh = useRef<THREE.Mesh>(null)
  const cloud = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.016
    if (cloud.current) cloud.current.rotation.y += delta * 0.024
  })
  return (
    <group position={VENUS_POS}>
      <mesh ref={mesh} castShadow receiveShadow>
        <sphereGeometry args={[VENUS_BODY_RADIUS, 80, 80]} />
        <meshStandardMaterial map={map} roughness={0.92} metalness={0.06} />
      </mesh>
      <mesh ref={cloud} scale={1.045}>
        <sphereGeometry args={[VENUS_BODY_RADIUS, 48, 48]} />
        <meshPhysicalMaterial
          color="#d4cec4"
          transparent
          opacity={0.1}
          roughness={1}
          depthWrite={false}
        />
      </mesh>
      <mesh scale={1.12}>
        <sphereGeometry args={[VENUS_BODY_RADIUS, 32, 32]} />
        <meshBasicMaterial
          color="#8a6048"
          transparent
          opacity={0.035}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function TrajectoryLine() {
  const path = useMissionStore((s) => s.sim.path)
  const show = useMissionStore((s) => s.showTrajectory)
  const pts = useMemo(() => path.map((p) => new THREE.Vector3(p[0], p[1], p[2])), [path])
  if (!show || pts.length < 2) return null
  return (
    <Line
      points={pts}
      color="#6ab0d0"
      lineWidth={1.5}
      transparent
      opacity={0.5}
      depthWrite={false}
    />
  )
}

function MissionCameraRig() {
  const { camera } = useThree()
  const smoothLook = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const sim = useMissionStore.getState().sim
    _probe.set(sim.pos[0], sim.pos[1], sim.pos[2])
    const shake = sim.shake

    if (!sim.launched) {
      _camGoal.set(EARTH_POS.x + 2.8, EARTH_POS.y + 1.15, EARTH_POS.z + 3.25)
      _look.copy(EARTH_POS)
    } else {
      const u = Math.min(1, sim.t / 5.5)
      const pull = THREE.MathUtils.lerp(1.35, 4.35, u)
      _camGoal.copy(_probe).add(new THREE.Vector3(pull * 0.82, pull * 0.38, pull * 0.6))
      damp3(smoothLook.current, _probe, 0.88, delta, 14)
      _look.copy(smoothLook.current)
    }

    _shake.set(
      (Math.random() - 0.5) * 0.2 * shake,
      (Math.random() - 0.5) * 0.2 * shake,
      (Math.random() - 0.5) * 0.16 * shake,
    )
    _camGoal.add(_shake)

    damp3(camera.position, _camGoal, 0.87, delta, 11)
    camera.lookAt(_look)
  })

  return null
}

/** Мягкий постпроцесс без Glitch/Chromatic — стабильнее на разных GPU. */
function MissionPostFX() {
  const lost = useMissionStore((s) => s.sim.connectionLost)
  const lowSig = useMissionStore((s) => s.sim.signalPercent < 35 && s.sim.launched)

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        intensity={lost ? 0.28 : 0.38}
        luminanceThreshold={0.74}
        luminanceSmoothing={0.58}
        mipmapBlur
        radius={0.46}
      />
      <Vignette darkness={lowSig ? 0.52 : 0.4} offset={0.28} eskil={false} />
    </EffectComposer>
  )
}

function ProbeGroup() {
  const probeRef = useRef<THREE.Group>(null)
  const glow = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    const sim = useMissionStore.getState().sim
    const g = probeRef.current
    if (!g) return

    _probe.set(sim.pos[0], sim.pos[1], sim.pos[2])
    damp3(g.position, _probe, 0.94, delta, 22)

    _vel.set(sim.vel[0], sim.vel[1], sim.vel[2])
    const spd = _vel.length()
    if (spd > 1e-5) {
      _look.copy(_vel).normalize().add(g.position)
      g.lookAt(_look)
    }
    g.rotation.z += delta * (0.26 + sim.thrusterGlow * 1.4)

    if (glow.current) {
      const m = glow.current.material as THREE.MeshStandardMaterial
      m.emissiveIntensity = 0.15 + sim.thrusterGlow * 1.8
    }
  })

  return (
    <group ref={probeRef}>
      <mesh castShadow>
        <cylinderGeometry args={[0.07, 0.1, 0.36, 28]} />
        <meshStandardMaterial
          color="#8a92a8"
          metalness={0.74}
          roughness={0.26}
          emissive="#1a2438"
          emissiveIntensity={0.1}
        />
      </mesh>
      <mesh ref={glow} position={[0, -0.22, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.05, 0.12, 12]} />
        <meshStandardMaterial
          color="#ffaa66"
          emissive="#ff6622"
          emissiveIntensity={0.2}
          metalness={0.3}
          roughness={0.45}
        />
      </mesh>
      <mesh position={[0, 0.2, 0.08]} castShadow>
        <cylinderGeometry args={[0.006, 0.006, 0.24, 8]} />
        <meshStandardMaterial color="#d8e0f4" metalness={0.82} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0.34, 0.1]} rotation={[-0.52, 0, 0]}>
        <torusGeometry args={[0.052, 0.016, 10, 32, Math.PI * 1.2]} />
        <meshStandardMaterial color="#eef2ff" metalness={0.68} roughness={0.22} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function SceneContent() {
  return (
    <>
      <color attach="background" args={['#03050c']} />
      <fog attach="fog" args={['#050814', 16, 102]} />

      <ambientLight intensity={0.1} />
      <hemisphereLight intensity={0.18} color="#b8c8e8" groundColor="#1a1020" />
      <directionalLight
        position={[SUN_POS.x + 9, 4.5, SUN_POS.z + 7]}
        intensity={1.18}
        color="#faf4ec"
        castShadow
        shadow-mapSize={[1536, 1536]}
        shadow-camera-far={70}
        shadow-camera-near={0.4}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
      />

      <MissionSun />
      <pointLight position={SUN_POS} intensity={1.55} distance={140} decay={2} color="#ffe8cc" />

      <ProceduralEarth />
      <ProceduralVenus />

      <Stars radius={130} depth={55} count={7000} factor={2.6} saturation={0.04} fade speed={0.15} />
      <Stars radius={70} depth={32} count={4000} factor={1.6} saturation={0.08} fade speed={0.28} />

      <TrajectoryLine />
      <ProbeGroup />

      <MissionCameraRig />
      <MissionPostFX />
    </>
  )
}

export function MissionSceneCanvas() {
  return (
    <Canvas
      shadows
      frameloop="always"
      dpr={[1, 2]}
      className="h-full min-h-[240px] w-full flex-1 touch-none"
      camera={{ position: [EARTH_POS.x + 2.8, EARTH_POS.y + 1.15, EARTH_POS.z + 3.25], fov: 40 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
      }}
    >
      <SceneContent />
    </Canvas>
  )
}
