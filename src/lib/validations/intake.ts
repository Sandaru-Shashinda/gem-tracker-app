import * as z from "zod"

export const intakeSchema = z.object({
  gemId: z.string().min(1, "GRC Number is required"),
  weight: z.coerce.number().positive("Weight must be a positive number"),
  color: z.string().min(1, "Color is required"),
  itemDescription: z.string().optional(),
  customerId: z.string().optional(),
  testerId1: z.string().min(1, "Tester 1 is required"),
  testerId2: z.string().min(1, "Tester 2 is required"),
  reportTypes: z.array(z.string()).min(1, "At least one report type is required"),
})

export type IntakeFormValues = z.infer<typeof intakeSchema>
