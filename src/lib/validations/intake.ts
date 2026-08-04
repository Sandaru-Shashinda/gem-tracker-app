import * as z from "zod"

export const intakeSchema = z
  .object({
    gemId: z.string().min(1, "GRC Number is required"),
    weight: z.coerce.number().positive("Weight must be a positive number"),
    color: z.string().min(1, "Color is required"),
    itemDescription: z.string().optional(),
    customerId: z.string().optional(),
    testerId1: z.string().optional(),
    testerId2: z.string().optional(),
    reportTypes: z.array(z.string()).min(1, "At least one report type is required"),
    // Bypasses Test 1 / Test 2 — the gem goes straight to final approval,
    // so no testers need to be assigned.
    skipTesting: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.skipTesting) return
    if (!data.testerId1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["testerId1"],
        message: "Tester 1 is required",
      })
    }
    if (!data.testerId2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["testerId2"],
        message: "Tester 2 is required",
      })
    }
  })

export type IntakeFormValues = z.infer<typeof intakeSchema>
