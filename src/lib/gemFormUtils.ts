import { type TestFormValues } from "@/lib/validations/test"
import { type GemStatus, GEM_STATUSES, UserRole } from "@/lib/types"

export type SearchSetters = {
  setSpeciesSearch: (v: string) => void
  setVarietySearch: (v: string) => void
  setCrownStyleSearch: (v: string) => void
  setPavilionStyleSearch: (v: string) => void
  setCuttingShapeSearch: (v: string) => void
  setColourSearch: (v: string) => void
}

/** Maps raw gem stage data (test1 / test2 / finalApproval) into form values. */
export function mapSourceToFormValues(source: any): TestFormValues {
  const obs = source.observations || source.finalObservations || {}
  return {
    riMin: source.riMin?.toString() || "",
    riMax: source.riMax?.toString() || "",
    sg: source.sg?.toString() || "",
    hardnessMin: source.hardnessMin?.toString() || "",
    hardnessMax: source.hardnessMax?.toString() || "",
    species: obs.species || "",
    selectedVariety: source.selectedVariety || source.finalVariety || obs.variety || "",
    itemDescription: obs.itemDescription || source.itemDescription || "",
    colour: obs.colour || "",
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
    messurementX: obs.messurementX?.toString() || "",
    messurementY: obs.messurementY?.toString() || "",
    messurementZ: obs.messurementZ?.toString() || "",
    transparency: obs.transparency || "",
    origin: obs.origin || "",
    spectroscopy: obs.spectroscopy || "",
    comments: obs.comments || "",
    specialNote: obs.specialNote || "",
    treatment: obs.treatment || "",
    clarityEnhancement: obs.clarityEnhancement || "",
    isHeated: obs.isHeated ?? source.isHeated ?? false,
    showHeatInReport: obs.showHeatInReport ?? source.showHeatInReport ?? false,
    isEmerald: obs.isEmerald ?? source.isEmerald ?? false,
    isMixCut: obs.isMixCut ?? source.isMixCut ?? false,
  }
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

/** Derives the target GemStatus after a successful submit. */
export function resolveSubmitStatus(
  role: UserRole | undefined,
  isT1: boolean,
  isT2: boolean,
): GemStatus {
  if (role === UserRole.ADMIN || (!isT1 && !isT2)) return GEM_STATUSES.SUBMITTED_FOR_REPORT
  if (isT1) return GEM_STATUSES.READY_FOR_T2
  return GEM_STATUSES.READY_FOR_APPROVAL
}
