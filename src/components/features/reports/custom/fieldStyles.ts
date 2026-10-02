import type { CSSProperties } from "react"

/*
 * Styles the custom report cards share. Kept apart from the component modules because a
 * file that exports components as well as objects cannot be hot-reloaded in place.
 */

/**
 * How a row's value sits in its row once it may wrap: at its own width until it reaches
 * the slot's maximum, then onto further lines, right-aligned under the first.
 *
 * It shrinks rather than holding its width, so a long value gives way to the label and
 * the leader instead of running out of the row; and a word too long for the slot — a
 * serial, a run of one letter — breaks inside itself rather than overflowing. Each card
 * adds its own maximum width and gutter to this.
 */
export const WRAPPING_VALUE_STYLE: CSSProperties = {
  flex: "0 1 auto",
  minWidth: 0,
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  textAlign: "right",
}

/**
 * The transform a layout override asks for, or none at all — so a report nobody has
 * adjusted carries no transform and renders exactly as its template does.
 */
export function transformFor(x: number, y: number, scale: number): string | undefined {
  if (x === 0 && y === 0 && scale === 1) return undefined
  return `translate(${x}px, ${y}px) scale(${scale})`
}
