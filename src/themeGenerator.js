/**
 * Theme palette generator — ported from kroma-figma-plugin.
 * Takes 2 seed colors (background, accent/primary) and generates
 * the 9 color values that map to BottomBarVM's Theme color variables.
 */
import chroma from 'chroma-js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toHex(color) {
  return color.alpha() < 0.9999 ? color.hex('rgba').toUpperCase() : color.hex().toUpperCase()
}

function clampL(L) { return Math.max(0.001, Math.min(0.999, L)) }

/**
 * Convert a CSS hex string to a Rive ARGB integer (0xAARRGGBB, signed 32-bit).
 * Rive's ViewModelInstanceColor.value uses this format.
 */
export function hexToRiveColor(hex) {
  hex = hex.replace('#', '')
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255
  return ((a << 24) | (r << 16) | (g << 8) | b) | 0   // signed 32-bit int
}

// ─── Background palette ───────────────────────────────────────────────────────

function bgDark(bgHex) {
  const [L, C, H] = chroma(bgHex).oklch()
  return {
    primaryDefault: toHex(chroma.oklch(clampL(L), C, H)),
    primaryHover:   toHex(chroma.oklch(clampL(L * 1.30), C * 1.15, H)),
    primaryActive:  toHex(chroma.oklch(clampL(L * 1.40), C * 1.20, H)),
    secondaryDefault: toHex(chroma.oklch(clampL(L * 1.15), C * 1.20, H)),
  }
}

function bgLight(bgHex) {
  const [L, C, H] = chroma(bgHex).oklch()
  const hue = C < 0.005 ? 250 : H
  const pL  = clampL(L * 0.975)
  const pC  = Math.min(0.006, C + 0.004)
  return {
    primaryDefault:   toHex(chroma.oklch(pL, pC, hue)),
    primaryHover:     toHex(chroma.oklch(clampL(pL * 0.990), Math.min(0.008, pC + 0.003), hue)),
    primaryActive:    toHex(chroma.oklch(clampL(pL * 0.975), Math.min(0.012, pC + 0.005), hue)),
    secondaryDefault: toHex(chroma.oklch(clampL(L * 0.988), Math.min(0.004, C + 0.002), hue)),
  }
}

// ─── Accent palette (only need .solid) ───────────────────────────────────────

function accentSolid(hex) {
  return hex.toUpperCase()
}

// Neutral: desaturated, mid-tone derived from background hue
function neutralSolid(bgHex, appearance) {
  const [, C, H] = chroma(bgHex).oklch()
  const L = appearance === 'dark' ? 0.60 : 0.55
  return toHex(chroma.oklch(L, Math.min(C * 0.4, 0.015), H))
}

// ─── Text ────────────────────────────────────────────────────────────────────

function textPrimary(appearance) {
  return appearance === 'dark' ? '#FFFFFF' : '#000000'
}

// ─── Appearance auto-detection ────────────────────────────────────────────────

/**
 * Auto-detect dark or light appearance from background color using WCAG 2.1
 * contrast ratio, mirroring the Kroma Figma plugin logic:
 *   contrast(white, bg) >= 4.5  →  'dark'  (bg is dark enough → white text readable)
 *   contrast(white, bg) < 4.5   →  'light' (bg is light → need dark text)
 *
 * @param {string} bgHex  Background hex (e.g. "#0E1128" or "#F5F5F5")
 * @returns {'dark'|'light'}
 */
export function detectAppearance(bgHex) {
  try {
    return chroma.contrast(bgHex, '#ffffff') >= 4.5 ? 'dark' : 'light'
  } catch {
    return 'dark'
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Generate the 9 Rive Theme color values from 2 seed colors.
 * Appearance is auto-detected from bgHex if not provided.
 *
 * @param {string} bgHex      Background/Base hex (e.g. "#0E1128")
 * @param {string} accentHex  Accent/Primary hex  (e.g. "#4A9EFF")
 * @param {'dark'|'light'} [appearance]  Optional override; auto-detected if omitted
 * @returns {{ [riveColorName]: string }}  hex strings keyed by Rive property name
 */
export function generateRiveTheme(bgHex, accentHex, appearance) {
  const mode = appearance ?? detectAppearance(bgHex)
  const bg = mode === 'dark' ? bgDark(bgHex) : bgLight(bgHex)

  // Fixed defaults for danger and attention (standard red / amber)
  const dangerHex    = '#EF4444'
  const attentionHex = '#F59E0B'

  return {
    textPrimary:               textPrimary(mode),
    backgroundPrimaryDefault:  bg.primaryDefault,
    backgroundPrimaryHover:    bg.primaryHover,
    backgroundPrimaryActive:   bg.primaryActive,
    backgroundSecondaryDefault: bg.secondaryDefault,
    accentPrimarySolid:        accentSolid(accentHex),
    accentNeutralSolid:        neutralSolid(bgHex, mode),
    accentAttentionSolid:      accentSolid(attentionHex),
    accentDangerSolid:         accentSolid(dangerHex),
  }
}
