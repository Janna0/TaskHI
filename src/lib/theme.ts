function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function blend(base: [number, number, number], target: [number, number, number], fraction: number): string {
  const r = Math.round(base[0] * (1 - fraction) + target[0] * fraction)
  const g = Math.round(base[1] * (1 - fraction) + target[1] * fraction)
  const b = Math.round(base[2] * (1 - fraction) + target[2] * fraction)
  return `${r} ${g} ${b}`
}

export function applyTheme(hex: string) {
  const base = hexToRgb(hex)
  const white: [number, number, number] = [255, 255, 255]
  const black: [number, number, number] = [0, 0, 0]
  const root = document.documentElement
  root.style.setProperty('--p-50',  blend(base, white, 0.92))
  root.style.setProperty('--p-100', blend(base, white, 0.85))
  root.style.setProperty('--p-200', blend(base, white, 0.70))
  root.style.setProperty('--p-300', blend(base, white, 0.50))
  root.style.setProperty('--p-400', blend(base, white, 0.25))
  root.style.setProperty('--p-500', `${base[0]} ${base[1]} ${base[2]}`)
  root.style.setProperty('--p-600', blend(base, black, 0.12))
  root.style.setProperty('--p-700', blend(base, black, 0.25))
  root.style.setProperty('--p-800', blend(base, black, 0.40))
  root.style.setProperty('--p-900', blend(base, black, 0.55))
}
