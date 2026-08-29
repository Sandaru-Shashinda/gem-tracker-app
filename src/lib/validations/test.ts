import * as z from "zod"
import { emptyTreatments } from "@/lib/treatments"

/**
 * The treatment checklist. "" means the treatment has not been assessed, which is
 * deliberately distinct from "No" — "not tested" and "tested, not present" are
 * different claims on a certificate. Labels and section grouping live in
 * lib/treatments.ts; the keys below must stay in step with TREATMENT_KEYS there.
 */
const treatmentAnswer = z.enum(["", "Yes", "No"]).default("")

export const treatmentsSchema = z
  .object({
    heatTreatment: treatmentAnswer,
    irradiationTreatment: treatmentAnswer,
    hpht: treatmentAnswer,
    diffusionTreatment: treatmentAnswer,
    dyeing: treatmentAnswer,
    bleaching: treatmentAnswer,
    fractureFillingOil: treatmentAnswer,
    fractureFillingResinGlass: treatmentAnswer,
    laserDrilling: treatmentAnswer,
    coating: treatmentAnswer,
  })
  .default(emptyTreatments)

export const testSchema = z.object({
  ri: z.string().min(1, "R.I. is required"),
  sg: z.string().optional(),
  hardnessMin: z.string().optional(),
  hardnessMax: z.string().optional(),
  cuttingShape: z.string().optional(),
  cuttingStyle: z.string().optional(),
  messurementX: z.string().optional(),
  messurementY: z.string().optional(),
  messurementZ: z.string().optional(),
  transparency: z.string().optional(),
  origin: z.string().optional(),
  grade: z.string().optional(),
  spectroscopy: z.string().optional(),
  cuttingGrade: z.number().optional(),
  polishingGrade: z.string().default("Fine"),
  proportionGrade: z.string().default("Fine"),
  clarityEnhancement: z.string().optional(),
  clarityGrade: z.string().optional(),
  crownStyle: z.string().optional(),
  pavilionStyle: z.string().optional(),
  species: z.string().min(1, "Species is required"),
  selectedVariety: z.string().min(1, "Variety is required"),
  comments: z.string().optional(),
  itemDescription: z.string().optional(),
  specialNote: z.string().optional(),
  treatment: z.string().optional(),
  treatments: treatmentsSchema,
  colour: z.string().optional(),
  hue: z.string().optional(),
  tone: z.string().optional(),
  saturation: z.string().optional(),
  colourGrade: z.number().optional(),
  finalGrade: z.number().optional(),
  isHeated: z.boolean().default(false).optional(),
  showHeatInReport: z.boolean().default(false).optional(),
  isEmerald: z.boolean().default(false).optional(),
  isMixCut: z.boolean().default(false).optional(),
})

export type TestFormValues = z.infer<typeof testSchema>
