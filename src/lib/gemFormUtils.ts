import { type TestFormValues } from "@/lib/validations/test"
import { type GemStatus, GEM_STATUSES, UserRole } from "@/lib/types"
import { normalizeTreatments } from "@/lib/treatments"

export type SearchSetters = {
  setSpeciesSearch: (v: string) => void
  setVarietySearch: (v: string) => void
  setCrownStyleSearch: (v: string) => void
  setPavilionStyleSearch: (v: string) => void
  setCuttingShapeSearch: (v: string) => void
  setColourSearch: (v: string) => void
}

/** The scientific readings on a stage, in either the current or a legacy field shape. */
export type StageReadings = {
  riMin?: number | null
  riMax?: number | null
  /** Written while R.I. was a single value; read as a fallback for both ends. */
  ri?: number | null
  hardness?: number | null
  /** Written while hardness was a pair; read as a fallback for the single reading. */
  hardnessMin?: number | null
  hardnessMax?: number | null
}

/** A stage's R.I., shown as a range only when the two readings actually differ. */
export function formatRi(stage?: StageReadings | null, fallback = "N/A"): string {
  const min = stage?.riMin ?? stage?.ri
  const max = stage?.riMax ?? stage?.ri
  if (min === undefined || min === null) return fallback
  if (max === undefined || max === null || max === min) return String(min)
  return `${min} - ${max}`
}

/** Hardness is one reading now; a stage written as a pair falls back to the min it holds. */
export function formatHardness(stage?: StageReadings | null, fallback = "N/A"): string {
  const value = stage?.hardness ?? stage?.hardnessMin ?? stage?.hardnessMax
  return value === undefined || value === null ? fallback : String(value)
}

/** A stage's own weight, formatted for display. Blank when that stage never recorded one. */
export function formatStageWeight(stage?: { weight?: number | null } | null, fallback = "—") {
  const value = stage?.weight
  return value === undefined || value === null ? fallback : `${Number(value).toFixed(2)} ct`
}

/** Narrows to a stage that actually holds an R.I. reading, in either field shape. */
export function hasRi<T extends StageReadings>(stage: T | null | undefined): stage is T {
  const value = stage?.riMin ?? stage?.ri
  return value !== undefined && value !== null
}

/** Measurements are entered and shown to 2 decimals, so a stored 5.3 reads back as "5.30". */
const toFixedString = (value: unknown, decimals = 2): string => {
  if (value === null || value === undefined || value === "") return ""
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(decimals) : String(value)
}

/** Values to fall back on when the stage itself holds none — see `seed` below. */
export type StageSeed = { colour?: string; weight?: number | null }

/**
 * Maps raw gem stage data (test1 / test2 / finalApproval) into form values.
 *
 * `seed` supplies colour and weight when the stage has not recorded its own. Only the
 * approval passes it, carrying the gem's latest pair: the approver starts from what the
 * last tester found and edits from there. Testers are deliberately given no seed, so one
 * tester's reading never pre-fills the other's form — an independent second opinion is
 * the point of having two of them.
 *
 * R.I. and hardness both changed shape, so both read their legacy fields as a fallback:
 * records written while R.I. was a single value fill both ends of the range from it, and
 * records written while hardness was a min/max pair collapse to the min they recorded.
 * Colour does the same with the pre-split `observations.colour`.
 */
export function mapSourceToFormValues(source: any, seed: StageSeed = {}): TestFormValues {
  const obs = source.observations || source.finalObservations || {}
  const weight = source.weight ?? seed.weight
  return {
    riMin: (source.riMin ?? source.ri)?.toString() || "",
    riMax: (source.riMax ?? source.ri)?.toString() || "",
    sg: source.sg?.toString() || "",
    hardness: (source.hardness ?? source.hardnessMin ?? source.hardnessMax)?.toString() || "",
    species: obs.species || "",
    selectedVariety: source.selectedVariety || source.finalVariety || obs.variety || "",
    itemDescription: obs.itemDescription || source.itemDescription || "",
    colour: source.colour || obs.colour || seed.colour || "",
    weight: weight === null || weight === undefined ? "" : String(weight),
    hue: obs.hue || "",
    tone: obs.tone || "",
    saturation: obs.saturation || "",
    clarityGrade: obs.clarityGrade || "",
    grade: obs.grade || "",
    polishingGrade: obs.polishingGrade || "Fine",
    proportionGrade: obs.proportionGrade || "Fine",
    cuttingGrade: Number(obs.cuttingGrade) || 0,
    colourGrade: Number(obs.colourGrade) || 0,
    finalGrade: Number(obs.finalGrade) || 0,
    cuttingShape: obs.cuttingShape || obs.shape || "",
    crownStyle: obs.crownStyle || obs.cuttingStyle || obs.cut || "",
    pavilionStyle: obs.pavilionStyle || "",
    messurementX: toFixedString(obs.messurementX),
    messurementY: toFixedString(obs.messurementY),
    messurementZ: toFixedString(obs.messurementZ),
    transparency: obs.transparency || "",
    origin: obs.origin || "",
    spectroscopy: obs.spectroscopy || "",
    comments: obs.comments || "",
    specialNote: obs.specialNote || "",
    treatment: obs.treatment || "",
    treatments: normalizeTreatments(obs.treatments),
    clarityEnhancement: obs.clarityEnhancement || "",
    isHeated: obs.isHeated ?? source.isHeated ?? false,
    showHeatInReport: obs.showHeatInReport ?? source.showHeatInReport ?? false,
    isEmerald: obs.isEmerald ?? source.isEmerald ?? false,
    isMixCut: obs.isMixCut ?? source.isMixCut ?? false,
  }
}

/**
 * Folds several name lists into one, matching case-insensitively so the same name typed
 * two ways appears once. The first spelling seen wins, so pass the authoritative list
 * first — the same rule the API applies in GET /api/references/identifications.
 */
export function mergeNameOptions(...lists: string[][]): string[] {
  const seen = new Map<string, string>()
  for (const list of lists) {
    for (const raw of list) {
      const name = typeof raw === "string" ? raw.trim() : ""
      if (!name) continue
      const key = name.toLowerCase()
      if (!seen.has(key)) seen.set(key, name)
    }
  }
  return [...seen.values()]
}

/** Keeps the search-input states in sync with the current form values. */
export function syncSearchStates(values: TestFormValues, setters: SearchSetters) {
  setters.setSpeciesSearch(values.species || "")
  setters.setVarietySearch(values.selectedVariety || "")
  setters.setCrownStyleSearch(values.crownStyle || "")
  setters.setPavilionStyleSearch(values.pavilionStyle || "")
  setters.setCuttingShapeSearch(values.cuttingShape || "")
  setters.setColourSearch(values.colour || "")
}

/** The three stages a gem's analysis can be written to. */
export type StageKey = "test1" | "test2" | "finalApproval"

export type StageAccess = {
  isAdmin: boolean
  isTester: boolean
  isT1: boolean
  isT2: boolean
  isAssignedT1: boolean
  isAssignedT2: boolean
}

/**
 * The stage this user may write to on this gem, or null when they may write to none.
 *
 * Every save goes through here: which stage a submit posts to, which stage a draft saves
 * to, and whether those actions are offered at all. Deriving the save target separately
 * from the loaded record is what let a tester's draft be aimed at an admin-only endpoint,
 * and let work typed against Test 1 be saved into Test 2.
 *
 * A tester only writes while the gem is actually sitting at their stage. Submitting hands
 * the stone on, and their record is sealed at that moment — see resolveViewStage, which
 * is what still shows it to them. Reopening it is the admin's call: a correction request
 * moves the gem back to that stage, and write access follows from the move rather than
 * from anyone keeping a private door open.
 *
 * Testers are checked Test 2 first: a tester holding both assignments is working on the
 * later stage, and that ordering is what decides which of their two records they see.
 */
export function resolveActiveStage(access: StageAccess): StageKey | null {
  const { isAdmin, isTester, isT1, isT2, isAssignedT1, isAssignedT2 } = access

  // An admin owns whichever stage the gem currently sits in, and approval otherwise.
  if (isAdmin) return isT1 ? "test1" : isT2 ? "test2" : "finalApproval"

  if (isTester) {
    if (isAssignedT2 && isT2) return "test2"
    if (isAssignedT1 && isT1) return "test1"
  }

  // A tester looking at a gem that is not theirs, or not at their stage, has nothing to
  // write to. Whether they can still *read* a stage is resolveViewStage's question.
  return null
}

export type StageView = StageAccess & {
  /** True once Test 1 has an owner — every save stamps one. */
  hasSubmittedT1: boolean
  hasSubmittedT2: boolean
}

/**
 * The stage whose record the form shows, which is not always one this user can write to.
 *
 * A tester who has submitted keeps their own work on screen for as long as the gem
 * exists, completed or not — going back to check what you recorded is ordinary, and it
 * used to be offered as an edit, which quietly let a sealed record be rewritten after the
 * next stage had already read it.
 *
 * They are shown their own stage and no other. A tester never reads the other tester's
 * findings: two independent readings are the whole point of testing a stone twice, and
 * one of them is not independent if it can be looked up. So a tester who is not assigned
 * to this gem at all gets no stage, and the form stays empty.
 */
export function resolveViewStage(access: StageView): StageKey | null {
  const writable = resolveActiveStage(access)
  if (writable) return writable

  if (access.isTester) {
    if (access.isAssignedT2 && access.hasSubmittedT2) return "test2"
    if (access.isAssignedT1 && access.hasSubmittedT1) return "test1"
  }

  return null
}

/**
 * Derives the target GemStatus after a successful submit.
 *
 * A second reading only happens when someone is assigned to give it. With no Tester 2
 * the stone is read once and Test 1 hands straight on to approval, so there is no empty
 * Test 2 queue entry for a gem nobody is going to pick up. The server decides this the
 * same way and from the same fact — the assignment itself — so a stale client cannot
 * route a gem into a stage that has no owner.
 */
export function resolveSubmitStatus(
  role: UserRole | undefined,
  isT1: boolean,
  isT2: boolean,
  hasSecondTester = true,
): GemStatus {
  if (role === UserRole.ADMIN || (!isT1 && !isT2)) return GEM_STATUSES.SUBMITTED_FOR_REPORT
  if (isT1) return hasSecondTester ? GEM_STATUSES.READY_FOR_T2 : GEM_STATUSES.READY_FOR_APPROVAL
  return GEM_STATUSES.READY_FOR_APPROVAL
}
