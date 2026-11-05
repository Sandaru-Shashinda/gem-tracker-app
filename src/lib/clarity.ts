/**
 * The emerald clarity scales.
 *
 * Emeralds are graded on a scale of their own — five grades from Loupe Clean to Highly
 * Included, with no Flawless — and carry a second grade the other stones do not: how far
 * their clarity has been enhanced. The form offers these scales and every report prints
 * them in place of the standard clarity chart once the stone is an emerald.
 *
 * Keys are the stored value with spaces and brackets dropped and upper-cased, so "E 1"
 * and "E1" mark the same cell.
 */

export interface ClarityCell {
  key: string
  /** What the marked row prints. */
  label: string
  /** The heading above it. */
  name: string
}

export const EMERALD_CLARITY_GRADES: readonly ClarityCell[] = [
  { key: "LC", label: "LC", name: "Loupe Clean" },
  { key: "EC", label: "EC", name: "Eye Clean" },
  { key: "SI", label: "SI", name: "Slightly Included" },
  { key: "MI", label: "MI", name: "Moderately Included" },
  { key: "HI", label: "HI", name: "Highly Included" },
]

export const CLARITY_ENHANCEMENT_GRADES: readonly ClarityCell[] = [
  { key: "NONE", label: "None", name: "No Significant Clarity Enhancement" },
  { key: "E1", label: "E 1", name: "Minor Clarity Enhancement" },
  { key: "E2", label: "E 2", name: "Moderate Clarity Enhancement" },
  { key: "E3", label: "E 3", name: "Significant Clarity Enhancement" },
]

/** A stored grade as a chart key: "E 1" → "E1", "None" → "NONE". */
export function clarityKey(grade: string | undefined): string {
  return (grade || "").replace(/[\s()]/g, "").toUpperCase()
}

/**
 * Whether a stone is graded on the emerald scales: the tester ticked "Is Emerald", or
 * the species or variety names it one.
 */
export function isEmeraldStone(stone: {
  isEmerald?: boolean
  species?: string
  variety?: string
}): boolean {
  if (stone.isEmerald) return true
  return [stone.species, stone.variety].some((name) => name?.toLowerCase().includes("emerald"))
}
