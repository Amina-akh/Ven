import { create } from 'zustand'
import * as THREE from 'three'
import {
  createDockedState,
  createLaunchImpulse,
  distanceEarthKm,
  signalStrengthPercent,
  closestApproachKm,
  integrateStep,
  THRUSTER_DV,
} from './physics'

export type Vec3Tuple = [number, number, number]

export type MissionSim = {
  pos: Vec3Tuple
  vel: Vec3Tuple
  t: number
  launched: boolean
  path: Vec3Tuple[]
  distanceEarthKm: number
  signalPercent: number
  connectionLost: boolean
  velocityDisplay: number
  /** Минимальная зафиксированная дистанция до облаков Венеры, км. */
  minClosestVenusKm: number
  shake: number
  thrusterGlow: number
}

const MAX_PATH = 720
const PATH_EVERY = 2

function tuple(v: THREE.Vector3): Vec3Tuple {
  return [v.x, v.y, v.z]
}

function buildSim(
  pos: THREE.Vector3,
  vel: THREE.Vector3,
  t: number,
  launched: boolean,
  path: Vec3Tuple[],
  minClosest: number,
  shake: number,
  thrusterGlow: number,
): MissionSim {
  const dKm = distanceEarthKm(pos)
  const sig = signalStrengthPercent(dKm)
  const lost = sig < 5 || dKm >= 2_500_000
  const instantClosest = closestApproachKm(pos)
  const minV = launched ? Math.min(minClosest, instantClosest) : 1e12
  return {
    pos: tuple(pos),
    vel: tuple(vel),
    t,
    launched,
    path,
    distanceEarthKm: dKm,
    signalPercent: lost ? 0 : sig,
    connectionLost: lost,
    velocityDisplay: vel.length() * 148,
    minClosestVenusKm: minV,
    shake,
    thrusterGlow,
  }
}

type MissionStore = {
  overlayOpen: boolean
  setOverlayOpen: (v: boolean) => void
  studyMode: boolean
  setStudyMode: (v: boolean) => void
  showTrajectory: boolean
  toggleTrajectory: () => void

  sim: MissionSim
  _pos: THREE.Vector3
  _vel: THREE.Vector3
  /** Счётчик кадров для прореживания точек следа. */
  _pathTick: number
  _minClosest: number

  launch: () => void
  reset: () => void
  fireThruster: () => void
  physicsTick: (dt: number) => void
}

function dockedSim(shake = 0, glow = 0): MissionSim {
  const { pos, vel } = createDockedState()
  return buildSim(pos, vel, 0, false, [], 1e12, shake, glow)
}

export const useMissionStore = create<MissionStore>((set, get) => {
  const d0 = createDockedState()
  return {
    overlayOpen: false,
    setOverlayOpen: (v) => set({ overlayOpen: v }),
    studyMode: false,
    setStudyMode: (v) => set({ studyMode: v }),
    showTrajectory: true,
    toggleTrajectory: () => set((s) => ({ showTrajectory: !s.showTrajectory })),

    sim: dockedSim(),
    _pos: d0.pos.clone(),
    _vel: d0.vel.clone(),
    _pathTick: 0,
    _minClosest: 1e12,

    launch: () => {
      if (get().sim.launched) return
      const { _pos, _vel } = get()
      _vel.copy(createLaunchImpulse())
      const path: Vec3Tuple[] = [tuple(_pos)]
      set({
        sim: buildSim(_pos, _vel, 0, true, path, 1e12, 0.1, 0.55),
        _pathTick: 0,
        _minClosest: 1e12,
      })
    },

    reset: () => {
      const { pos, vel } = createDockedState()
      set({
        sim: dockedSim(),
        _pos: pos.clone(),
        _vel: vel.clone(),
        _pathTick: 0,
        _minClosest: 1e12,
      })
    },

    fireThruster: () => {
      const st = get()
      if (!st.sim.launched || st.sim.connectionLost) return
      const speed = st._vel.length()
      if (speed < 1e-6) return
      st._vel.addScaledVector(st._vel.clone().normalize(), THRUSTER_DV)
      set({
        sim: buildSim(
          st._pos,
          st._vel,
          st.sim.t,
          true,
          st.sim.path,
          st._minClosest,
          Math.min(0.45, st.sim.shake + 0.34),
          1,
        ),
      })
    },

    physicsTick: (dt) => {
      const st = get()
      if (!st.sim.launched || st.sim.connectionLost) return

      integrateStep(st._pos, st._vel, dt)

      let nextPath = st.sim.path
      let nextTick = st._pathTick + 1
      if (nextTick >= PATH_EVERY) {
        nextTick = 0
        const np = [...st.sim.path, tuple(st._pos)]
        nextPath = np.length > MAX_PATH ? np.slice(-MAX_PATH) : np
      }

      const instant = closestApproachKm(st._pos)
      const minC = Math.min(st._minClosest, instant)
      const shake = Math.max(0, st.sim.shake - dt * 2.2)
      const glow = st.sim.thrusterGlow * Math.exp(-dt * 2.4)

      set({
        _pathTick: nextTick,
        _minClosest: minC,
        sim: buildSim(
          st._pos,
          st._vel,
          st.sim.t + dt,
          true,
          nextPath,
          minC,
          shake,
          glow,
        ),
      })
    },

  }
})
