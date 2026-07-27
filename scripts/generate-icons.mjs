// Генерація PWA-іконок з бренд-марку (public/coffee-logger-mark.svg).
// Запуск: node scripts/generate-icons.mjs
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const BG = '#fff6ec' // --bg світлої теми
const INK = '#1a1206'
const CHECK = '#ff6b35' // --accent світлої теми

// Оригінальний марк у viewBox 64x64
const mark = `
  <g fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="32" cy="10" rx="22" ry="6"/>
    <path d="M11 11.5 22.5 47c1 3.2 4.2 5 9.5 5s8.5-1.8 9.5-5L53 11.5"/>
    <ellipse cx="32" cy="56" rx="15" ry="4"/>
    <path d="M25 24h14M27 31h10M29 38h6"/>
  </g>
  <path d="m27.5 44 3.5 3.5 6.5-8" fill="none" stroke="${CHECK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`

// coverage — частка канви під марк: maskable вимагає safe zone ~66%
function iconSvg(size, coverage) {
  const m = size * coverage
  const offset = (size - m) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="100%" height="100%" fill="${BG}"/>
  <g transform="translate(${offset} ${offset}) scale(${m / 64})">${mark}</g>
</svg>`
}

const targets = [
  { file: 'public/icons/icon-192.png', size: 192, coverage: 0.72 },
  { file: 'public/icons/icon-512.png', size: 512, coverage: 0.72 },
  { file: 'public/icons/icon-512-maskable.png', size: 512, coverage: 0.58 },
  { file: 'public/apple-touch-icon.png', size: 180, coverage: 0.68 },
]

await mkdir('public/icons', { recursive: true })
for (const { file, size, coverage } of targets) {
  await sharp(Buffer.from(iconSvg(size, coverage))).png().toFile(file)
  console.log(`✓ ${file} (${size}x${size})`)
}
