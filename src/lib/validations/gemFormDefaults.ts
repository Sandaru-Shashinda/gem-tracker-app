import { type TestFormValues } from "@/lib/validations/test"
import { emptyTreatments } from "@/lib/treatments"

/**
 * A factory, not a shared constant: `treatments` is a nested object, so handing the
 * same instance to every form would let one gem's checklist be written into the
 * defaults and leak into the next gem loaded.
 */
export const makeFormDefaults = (): TestFormValues => ({
  ri: "",
  sg: "",
  hardnessMin: "",
  hardnessMax: "",
  species: "",
  selectedVariety: "",
  itemDescription: "",
  colour: "",
  hue: "",
  tone: "",
  saturation: "",
  clarityGrade: "",
  grade: "",
  polishingGrade: "Fine",
  proportionGrade: "Fine",
  cuttingGrade: 0,
  colourGrade: 0,
  finalGrade: 0,
  cuttingShape: "",
  crownStyle: "",
  pavilionStyle: "",
  messurementX: "",
  messurementY: "",
  messurementZ: "",
  transparency: "",
  origin: "",
  spectroscopy: "",
  comments: "",
  specialNote: "",
  treatment: "",
  treatments: emptyTreatments(),
  clarityEnhancement: "",
  isHeated: false,
  showHeatInReport: false,
  isEmerald: false,
  isMixCut: false,
})
