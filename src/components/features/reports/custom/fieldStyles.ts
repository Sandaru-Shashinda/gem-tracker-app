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
