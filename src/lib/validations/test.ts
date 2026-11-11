import * as z from "zod"
import { emptyTreatments } from "@/lib/treatments"
import { isRiInput } from "@/lib/gemFormUtils"

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
    hpnt: treatmentAnswer,
    coating: treatmentAnswer,
    assembledStone: treatmentAnswer,
  })
  .default(emptyTreatments)

/** A field that must be filled before the stage can be submitted. Drafts skip the schema. */
const requiredText = (message: string) =>
  z.string({ error: message }).refine((v) => v.trim() !== "", message)

/** A required reading that must also be a number above zero — weight and dimensions. */
const requiredPositive = (message: string) =>
  requiredText(message).refine((v) => v.trim() === "" || Number(v) > 0, "Must be greater than 0")

export const testSchema = z.object({
  // R.I. is a range: a doubly refractive stone gives two readings (birefringence), so
  // both are recorded. riMax is left blank for a singly refractive stone, and every
  // reader treats an absent riMax as "the same reading", not as missing data.
  // Either box takes "-" when the refractometer gives no reading (a negative R.I.).
  riMin: z
    .string()
    .min(1, "R.I. is required")
    .refine(isRiInput, "Enter a number, or - for a negative reading"),
  riMax: z
    .string()
    .optional()
    .refine((v) => !v || isRiInput(v), "Enter a number, or - for a negative reading"),
  sg: z.string().optional(),
  // Hardness is a single reading — what the lab measured, not the species' published
  // range. That range lives on GemReference and is what this value is scored against.
  hardness: z.string().optional(),
  cuttingShape: requiredText("Shape is required"),
  cuttingStyle: z.string().optional(),
  // Dimensions are Length × Width × Height; all three are required.
  messurementX: requiredPositive("Length is required"),
  messurementY: requiredPositive("Width is required"),
  messurementZ: requiredPositive("Height is required"),
  transparency: z.string().optional(),
  origin: z.string().optional(),
  grade: z.string().optional(),
  spectroscopy: z.string().optional(),
  cuttingGrade: z.number().optional(),
  polishingGrade: z.string().default("Fine"),
  proportionGrade: z.string().default("Fine"),
  clarityEnhancement: z.string().optional(),
  clarityGrade: z.string().optional(),
  // The cutting style is recorded as crown + pavilion; both are required.
  crownStyle: requiredText("Crown style is required"),
  pavilionStyle: requiredText("Pavilion style is required"),
  species: requiredText("Species is required"),
  selectedVariety: requiredText("Variety is required"),
  comments: z.string().optional(),
  itemDescription: z.string().optional(),
  specialNote: z.string().optional(),
  /** The stage owner's private working note — saved with the stage, never printed. */
  myNote: z.string().optional(),
  treatment: z.string().optional(),
  treatments: treatmentsSchema,
  // Colour and weight are recorded per stage: each tester observes the stone for
  // themselves, and the approval carries the pair that ends up on the certificate.
  colour: requiredText("Colour is required"),
  weight: requiredPositive("Weight is required"),
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
