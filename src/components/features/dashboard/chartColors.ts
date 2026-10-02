/**
 * Categorical colours for dashboard charts, handed out in this order and never cycled.
 * The order is what keeps neighbouring slices apart for colour-blind readers, so a
 * chart takes the first N rather than picking ones it likes.
 */
export const SERIES_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
] as const

/** For the "Other" bucket a chart folds its tail into — never a ninth hue. */
export const OTHER_COLOR = "#a3a3a3"

/** Single-series bars, where colour carries no identity. */
export const PRIMARY_BAR_COLOR = SERIES_COLORS[0]

/** Icon badge tints for the stat cards; decorative, so they don't follow the order above. */
export const STAT_ICON_COLORS = {
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
  purple: "bg-purple-50 text-purple-600",
  sky: "bg-sky-50 text-sky-600",
  rose: "bg-rose-50 text-rose-600",
  teal: "bg-teal-50 text-teal-600",
  indigo: "bg-indigo-50 text-indigo-600",
}

export type StatIconColor = keyof typeof STAT_ICON_COLORS
