import * as z from "zod"

export const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "HELPER", "TESTER"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
  age: z.string().optional().or(z.literal("")),
  dob: z.string().optional().or(z.literal("")),
  idNumber: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  phoneNumber: z.string().optional().or(z.literal("")),
})

export const editUserSchema = userSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["ADMIN", "HELPER", "TESTER"]),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),
})

export type UserFormValues = z.infer<typeof userSchema>
export type EditUserFormValues = z.infer<typeof editUserSchema>
