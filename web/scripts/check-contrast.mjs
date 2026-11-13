#!/usr/bin/env node
/**
 * Проверка контраста токенов из src/index.css по WCAG AA.
 * Не требует зависимостей: oklch → linear sRGB → relative luminance.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const css = readFileSync(resolve(root, 'src/index.css'), 'utf8')

function rootBlock(source) {
  const start = source.indexOf(':root {')

  if (start === -1) {
    throw new Error('Не найден блок :root в src/index.css')
  }

  const end = source.indexOf('\n}', start)

  return source.slice(start, end)
}

function parseTokens(block) {
  const tokens = {}
  const pattern = /--([\w-]+):\s*(oklch\([^)]*\));/g
  let match

  while ((match = pattern.exec(block)) !== null) {
    tokens[match[1]] = match[2]
  }

  return tokens
}

function parseOklch(value) {
  const match = value.match(
    /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\s*\)/,
  )

  if (!match) {
    throw new Error(`Не удалось разобрать цвет: ${value}`)
  }

  const lightness = Number(match[1]) / (match[2] === '%' ? 100 : 1)

  return {
    l: lightness,
    c: Number(match[3]),
    h: Number(match[4]),
  }
}

function oklchToLinearRgb({ l, c, h }) {
  const radians = (h * Math.PI) / 180
  const a = c * Math.cos(radians)
  const b = c * Math.sin(radians)

  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b

  const l3 = lPrime ** 3
  const m3 = mPrime ** 3
  const s3 = sPrime ** 3

  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ]
}

function luminance(value) {
  const [r, g, b] = oklchToLinearRgb(parseOklch(value)).map((channel) =>
    Math.min(1, Math.max(0, channel)),
  )

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(foreground, background) {
  const first = luminance(foreground)
  const second = luminance(background)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)

  return (lighter + 0.05) / (darker + 0.05)
}

const tokens = parseTokens(rootBlock(css))

const checks = [
  ['foreground', 'background', 4.5, 'Основной текст'],
  ['muted-foreground', 'background', 4.5, 'Вторичный текст'],
  ['card-foreground', 'card', 4.5, 'Текст карточки'],
  ['primary-foreground', 'primary', 4.5, 'Текст на primary'],
  ['destructive-foreground', 'destructive', 4.5, 'Текст на destructive'],
  ['success-foreground', 'success', 4.5, 'Текст на success'],
  ['warning-foreground', 'warning', 4.5, 'Текст на warning'],
  ['info-foreground', 'info', 4.5, 'Текст на info'],
  ['accent-foreground', 'accent', 4.5, 'Текст на accent'],
  ['sidebar-foreground', 'sidebar', 4.5, 'Текст сайдбара'],
  ['primary', 'background', 3, 'Кнопка/акцент на фоне'],
  ['ring', 'background', 3, 'Фокусное кольцо'],
  ['input', 'background', 3, 'Граница полей ввода'],
  ['destructive', 'background', 3, 'Ошибка на фоне'],
]

let failed = 0

for (const [foreground, background, minimum, label] of checks) {
  if (!tokens[foreground] || !tokens[background]) {
    console.error(`✖ ${label}: нет токена --${foreground} или --${background}`)
    failed += 1
    continue
  }

  const ratio = contrast(tokens[foreground], tokens[background])
  const passed = ratio >= minimum
  const marker = passed ? '✔' : '✖'

  console.log(
    `${marker} ${label}: ${ratio.toFixed(2)}:1 (нужно ${minimum}:1) — --${foreground} на --${background}`,
  )

  if (!passed) {
    failed += 1
  }
}

if (failed > 0) {
  console.error(`\nПровалено проверок: ${failed}`)
  process.exit(1)
}

console.log('\nВсе проверки контраста пройдены.')
