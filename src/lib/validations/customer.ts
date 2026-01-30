import * as z from "zod"

export const customerSchema = z.object({
    customerName: z.string().min(2, "Customer name is required"),
    companyName: z.string().min(2, "Company name is required"),
    email: z.string().email("Invalid email address"),
    phoneNumber: z.string().optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
})

export type CustomerFormValues = z.infer<typeof customerSchema>
