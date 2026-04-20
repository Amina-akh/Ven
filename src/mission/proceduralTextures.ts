import * as THREE from 'three'

/** Локальные текстуры без сети — лаборатория работает офлайн. */
export function createEarthTexture(): THREE.CanvasTexture {
  const w = 512
  const h = 256
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  const grd = g.createLinearGradient(0, 0, w, h)
  grd.addColorStop(0, '#1a3a58')
  grd.addColorStop(0.25, '#2a5a78')
  grd.addColorStop(0.45, '#1e4a62')
  grd.addColorStop(0.55, '#3a6a48')
  grd.addColorStop(0.72, '#2a5088')
  grd.addColorStop(1, '#1a3050')
  g.fillStyle = grd
  g.fillRect(0, 0, w, h)
  g.fillStyle = 'rgba(255,255,255,0.04)'
  for (let i = 0; i < 120; i++) {
    g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 8, 1)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export function createVenusTexture(): THREE.CanvasTexture {
  const w = 512
  const h = 256
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(w * 0.35, h * 0.4, 0, w * 0.5, h * 0.5, w * 0.65)
  grd.addColorStop(0, '#9a7860')
  grd.addColorStop(0.4, '#6a4838')
  grd.addColorStop(0.75, '#5a4032')
  grd.addColorStop(1, '#4a3428')
  g.fillStyle = grd
  g.fillRect(0, 0, w, h)
  g.fillStyle = 'rgba(200,180,160,0.06)'
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    g.beginPath()
    g.arc(x, y, 0.5 + Math.random() * 2.2, 0, Math.PI * 2)
    g.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
