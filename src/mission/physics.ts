import * as THREE from 'three'

/** Ключевые точки сцены (условные единицы «макета» Солнечной системы). */
export const SUN_POS = new THREE.Vector3(0, 0, 0)
export const EARTH_POS = new THREE.Vector3(-14, 0.15, -3.2)
export const VENUS_POS = new THREE.Vector3(11, 0.55, 5.4)

/** Радиус «визуальной» Венеры в единицах сцены (для масштаба пролёта). */
export const VENUS_BODY_RADIUS = 0.42

/** Реальный радиус Венеры, км — для расчёта ближайшего расстояния пролёта. */
export const VENUS_RADIUS_KM = 6051

/**
 * Масштаб: расстояние Земля–Венера в сцене соответствует ~40 млн км
 * (порядок минимальной дистанции при типичной конфигурации).
 */
const EARTH_VENUS_SCENE = EARTH_POS.distanceTo(VENUS_POS)
const EARTH_VENUS_KM = 40_000_000
export const KM_PER_UNIT = EARTH_VENUS_KM / EARTH_VENUS_SCENE

/** Упрощённое «GM» для центрального притяжения к Солнцу (не физ. константы). */
export const GM_SUN = 32
/** Слабое возмущение от Венеры. */
export const GM_VENUS = 1.35

/** Импульс КДУ-414 (изменение скорости за один импульс, единицы сцены/с). */
export const THRUSTER_DV = 0.055

/** Связь: после этой дистанции от Земли сигнал начинает падать. */
export const SIGNAL_DROP_START_KM = 2_000_000
/** Порог «потери связи» по дальности (км). */
export const SIGNAL_LOST_DISTANCE_KM = 2_420_000
/** Порог по процентам (дублирует UX). */
export const SIGNAL_LOST_PERCENT = 5

const _acc = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _rel = new THREE.Vector3()

export type SimVectors = {
  pos: THREE.Vector3
  vel: THREE.Vector3
}

export function createDockedState(): SimVectors {
  const pad = new THREE.Vector3(0.55, 0.42, 0.28)
  const pos = EARTH_POS.clone().add(pad)
  return { pos, vel: new THREE.Vector3(0, 0, 0) }
}

export function createLaunchImpulse(): THREE.Vector3 {
  _dir.subVectors(VENUS_POS, EARTH_POS).normalize()
  const out = new THREE.Vector3(0.12, 0.06, 0.1).add(_dir)
  out.normalize().multiplyScalar(0.26)
  return out
}

function accelerationAt(pos: THREE.Vector3): THREE.Vector3 {
  const rSun = Math.max(pos.length(), 0.12)
  _acc.copy(pos).multiplyScalar(-GM_SUN / (rSun * rSun * rSun))

  _rel.subVectors(VENUS_POS, pos)
  const rV = Math.max(_rel.length(), VENUS_BODY_RADIUS * 0.9)
  _acc.addScaledVector(_rel, GM_VENUS / (rV * rV * rV))

  return _acc
}

export function integrateStep(pos: THREE.Vector3, vel: THREE.Vector3, dt: number): void {
  _acc.copy(accelerationAt(pos))
  vel.addScaledVector(_acc, dt)
  pos.addScaledVector(vel, dt)
}

export function distanceEarthKm(pos: THREE.Vector3): number {
  return pos.distanceTo(EARTH_POS) * KM_PER_UNIT
}

export function signalStrengthPercent(distKm: number): number {
  if (distKm <= SIGNAL_DROP_START_KM) return 100
  const span = SIGNAL_LOST_DISTANCE_KM - SIGNAL_DROP_START_KM
  const u = Math.min(1, Math.max(0, (distKm - SIGNAL_DROP_START_KM) / span))
  return 100 * Math.pow(1 - u, 1.65)
}

export function closestApproachKm(pos: THREE.Vector3): number {
  const dCenterKm = pos.distanceTo(VENUS_POS) * KM_PER_UNIT
  return Math.max(0, dCenterKm - VENUS_RADIUS_KM)
}
