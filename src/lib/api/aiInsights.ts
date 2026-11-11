import { API_BASE_URL, describeFailure, fetchWithAuth } from "./config"
import { type TestFormValues } from "@/lib/validations/test"
import { type TreatmentKey } from "@/lib/treatments"

/**
 * AI insights for a gem: what its photos and the readings entered so far suggest for
 * the rest of the analysis. See gem_tracker_api/src/services/gemInsight.service.js.
 */

/** The form fields the AI may suggest, in the order the panel lists them. */
export const AI_FIELD_ORDER = [
  "colour",
  "hue",
  "tone",
  "saturation",
  "transparency",
  "cuttingShape",
  "crownStyle",
  "pavilionStyle",
  "grade",
  "clarityGrade",
  "clarityEnhancement",
] as const satisfies readonly (keyof TestFormValues)[]

export type AiFieldKey = (typeof AI_FIELD_ORDER)[number]

export interface AiFieldSuggestion {
  value: string
  confidence: number
  reason: string
}

export interface AiCandidate {
  species: string
  variety: string
  confidence: number
  reasoning: string
  /** How well the readings match this species' published constants, or null without readings. */
  readingMatch: number | null
  inReferenceTable: boolean
  /** Whether its S.G. fits what the weight and size imply; null when that could not be checked. */
  sgFit: boolean | null
  referenceSg: [number, number] | null
}

export interface AiInsightResult {
  summary: string
  candidates: AiCandidate[]
  fields: Partial<Record<AiFieldKey, AiFieldSuggestion>>
  itemDescription: string
  conflicts: string[]
  nextSteps: { test: string; why: string }[]
  checkFor: { treatment: TreatmentKey; sign: string }[]
  notDeterminable: string[]
  impliedSg: { value: number; low: number; high: number; shape: string | null } | null
  /** How many reference species the readings still allow; null without readings. */
  narrowedFrom: number | null
}

/** What the AI is given: instrument readings only, never another stage's findings. */
export interface AiReadings {
  riMin: number | "-" | null
  riMax: number | "-" | null
  sg: number | null
  hardness: number | null
  weight: number | null
  length: number | null
  width: number | null
  height: number | null
  spectroscopy: string | null
}

export interface AiInsight {
  id: string
  createdAt: string
  model: string
  /** True when answered from a previous identical request rather than a new AI call. */
  cached: boolean
  readings: AiReadings
  imageCount: number
  result: AiInsightResult
}

/** An error carrying the API's code, so the panel can explain setup and quota problems. */
export class AiInsightError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

const positiveOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

const riOrNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "-" ? ("-" as const) : positiveOrNull(v)

/**
 * The form's readings as the API normalises them. Kept identical to normalizeReadings in
 * the API, so comparing this with an insight's readings says whether it is out of date.
 */
export function readingsFromForm(values: Partial<TestFormValues>): AiReadings {
  const spectrum = (values.spectroscopy || "").trim().slice(0, 600)
  return {
    riMin: riOrNull(values.riMin),
    riMax: riOrNull(values.riMax),
    sg: positiveOrNull(values.sg),
    hardness: positiveOrNull(values.hardness),
    weight: positiveOrNull(values.weight),
    length: positiveOrNull(values.messurementX),
    width: positiveOrNull(values.messurementY),
    height: positiveOrNull(values.messurementZ),
    spectroscopy: spectrum || null,
  }
}

const READING_KEYS: (keyof AiReadings)[] = [
  "riMin", "riMax", "sg", "hardness", "weight", "length", "width", "height", "spectroscopy",
]

export function sameReadings(a: AiReadings, b: AiReadings | undefined): boolean {
  if (!b) return false
  return READING_KEYS.every((k) => (a[k] ?? null) === (b[k] ?? null))
}

/** The API's own message where it gave one — they are written to be shown as they are. */
const toError = async (response: Response, fallback: string) => {
  try {
    const body = await response.clone().json()
    if (typeof body?.message === "string" && body.message) {
      return new AiInsightError(body.message, body.code)
    }
  } catch {
    // No JSON body; fall through to the status.
  }
  return new AiInsightError(await describeFailure(response, fallback))
}

export const aiInsightsApi = {
  /** The latest insight this user asked for on the gem, or null. */
  getLatest: async (gemId: string): Promise<AiInsight | null> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/gems/${gemId}/ai-insights`)
    if (!response.ok) throw await toError(response, "Could not load AI insights")
    return response.json()
  },

  generate: async (gemId: string, readings: AiReadings): Promise<AiInsight> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/gems/${gemId}/ai-insights`, {
      method: "POST",
      body: JSON.stringify({ readings }),
    })
    if (!response.ok) throw await toError(response, "AI analysis failed")
    return response.json()
  },
}
