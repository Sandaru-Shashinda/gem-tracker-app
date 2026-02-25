import * as z from "zod"

export const testSchema = z.object({
  ri: z.string().min(1, "R.I. is required"),
  sg: z.string().min(1, "S.G. is required"),
  hardness: z.string().optional(),
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
  clarityGrade: z.string().default("Fine"),
  species: z.string().min(1, "Species is required"),
  selectedVariety: z.string().min(1, "Variety is required"),
  comments: z.string().optional(),
  itemDescription: z.string().optional(),
  specialNote: z.string().optional(),
  colour: z.string().optional(),
  colourGrade: z.number().optional(),
})

export type TestFormValues = z.infer<typeof testSchema>
