import * as z from "zod"

import { CUSTOM_REPORT_SIZES, REPORT_MODES } from "@/lib/types"

export const intakeSchema = z
  .object({
    gemId: z.string().min(1, "GRC Number is required"),
    weight: z.coerce.number().positive("Weight must be a positive number"),
    color: z.string().min(1, "Color is required"),
    itemDescription: z.string().optional(),
    customerId: z.string().optional(),
    testerId1: z.string().optional(),
    /**
     * Optional on purpose. A stone can be given one reading instead of two, in which
     * case Test 1 hands straight on to approval — see resolveSubmitStatus.
     */
    testerId2: z.string().optional(),
    /**
     * Standard certificate or a card written for this stone. It gates the field below:
     * paper sizes are a question about the lab's standard certificates, and a custom
     * card is not one of them.
     */
    reportMode: z.enum([REPORT_MODES.DEFAULT, REPORT_MODES.CUSTOM]),
    reportTypes: z.array(z.string()),
    // Bypasses Test 1 / Test 2 — the gem goes straight to final approval,
    // so no testers need to be assigned.
    skipTesting: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reportMode === REPORT_MODES.CUSTOM) {
      // A custom job asks for exactly one certificate, at one of the two sizes that
      // have an editor. It is also the end of the questions: there is nothing to test
      // and nothing to approve, so no tester is required either.
      if (data.reportTypes.length !== 1 || !(CUSTOM_REPORT_SIZES as readonly string[]).includes(data.reportTypes[0])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reportTypes"],
          message: "Choose a card size",
        })
      }
      return
    }

    if (data.reportTypes.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reportTypes"],
        message: "At least one report type is required",
      })
    }

    if (data.skipTesting) return
    if (!data.testerId1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["testerId1"],
        message: "Tester 1 is required",
      })
    }
    // No check on testerId2: leaving it unassigned is a choice about this stone, not
    // an incomplete form.
  })

export type IntakeFormValues = z.infer<typeof intakeSchema>
