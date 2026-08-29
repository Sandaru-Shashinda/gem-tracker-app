/**
 * The treatment checklist assessed at every test stage and printed on the large report.
 *
 * Each treatment is answered "Yes" or "No"; an empty string means the lab has not
 * assessed it, which is why the answer is a tri-state string rather than a boolean —
 * "not tested" and "tested, not present" are different claims on a certificate.
 *
 * This file is the single source of truth for the keys, their labels and the section
 * they belong to. The form, the report, the audit views and the Mongoose schemas all
 * read from here, so adding a treatment means editing this list only (plus the
 * matching key in the API's `observationsSchema`).
 */

export type TreatmentAnswer = "" | "Yes" | "No"

export const TREATMENT_ANSWERS = ["Yes", "No"] as const

export interface TreatmentItem {
  key: TreatmentKey
  label: string
}

export interface TreatmentSection {
  title: string
  items: readonly TreatmentItem[]
}

export const TREATMENT_SECTIONS = [
  {
    title: "Color Enhancements",
    items: [
      { key: "heatTreatment", label: "Heat Treatment" },
      { key: "irradiationTreatment", label: "Irradiation Treatment" },
      { key: "hpht", label: "HPHT" },
      { key: "diffusionTreatment", label: "Diffusion Treatment" },
      { key: "dyeing", label: "Dyeing" },
      { key: "bleaching", label: "Bleaching" },
    ],
  },
  {
    title: "Clarity Enhancements",
    items: [
      { key: "fractureFillingOil", label: "Fracture Filling with Oil" },
      { key: "fractureFillingResinGlass", label: "Fracture Filling with Resin/ Glass" },
      { key: "laserDrilling", label: "Laser Drilling" },
    ],
  },
  {
    title: "Surface Modifications",
    items: [{ key: "coating", label: "Coating" }],
  },
] as const satisfies readonly { title: string; items: readonly { key: string; label: string }[] }[]

export type TreatmentKey =
  (typeof TREATMENT_SECTIONS)[number]["items"][number]["key"]

export type TreatmentValues = Record<TreatmentKey, TreatmentAnswer>

export const TREATMENT_KEYS = TREATMENT_SECTIONS.flatMap((s) =>
  s.items.map((i) => i.key),
) as TreatmentKey[]

export const TREATMENT_LABELS = Object.fromEntries(
  TREATMENT_SECTIONS.flatMap((s) => s.items.map((i) => [i.key, i.label])),
) as Record<TreatmentKey, string>

/** A blank checklist — nothing assessed yet. */
export function emptyTreatments(): TreatmentValues {
  return Object.fromEntries(TREATMENT_KEYS.map((k) => [k, ""])) as TreatmentValues
}

/**
 * Coerces whatever a stage record holds into a complete checklist. Records written
 * before the checklist existed have no `treatments` at all, and a record written
 * against an older key list is missing the newer keys.
 */
export function normalizeTreatments(raw: unknown): TreatmentValues {
  const source = (raw || {}) as Record<string, unknown>
  return Object.fromEntries(
    TREATMENT_KEYS.map((k) => {
      const value = source[k]
      return [k, value === "Yes" || value === "No" ? value : ""]
    }),
  ) as TreatmentValues
}

/** True once any treatment has been answered — used to hide empty blocks. */
export function hasAnyTreatment(treatments?: Partial<TreatmentValues> | null): boolean {
  if (!treatments) return false
  return TREATMENT_KEYS.some((k) => treatments[k] === "Yes" || treatments[k] === "No")
}
