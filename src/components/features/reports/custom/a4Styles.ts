import type { CSSProperties } from "react"

/**
 * Type and column styles the two A4 cards share. Kept apart from the cards themselves: a
 * file that exports components as well as objects cannot be hot-reloaded in place.
 */

export const COURIER_FAMILY = "'Nimbus Mono', 'Courier New', Courier, monospace"
export const COURIER: CSSProperties = { fontFamily: COURIER_FAMILY, color: "#1a1a1a" }

/* 268 + 24 gap + the signature pair (2 × 182.75 + 24) fills the 682px content width. */
export const NAME_COL_W = 268

export const COLUMN_STYLE: CSSProperties = {
  ...COURIER,
  fontWeight: 400,
  display: "flex",
  flexDirection: "column",
  gap: "3px",
}

/**
 * The editor for a line centred in the name column: as wide as the column and centred
 * on the line, rather than as wide as the line. The lines here shrink to their own text,
 * so an editor that matched them would be a few pixels wide for an empty field — and the
 * lines must shrink, or a two-line name stops matching the standard report's.
 */
export const CENTRED_EDITOR: CSSProperties = {
  left: "50%",
  right: "auto",
  width: `${NAME_COL_W}px`,
  transform: "translateX(-50%)",
  textAlign: "center",
}
