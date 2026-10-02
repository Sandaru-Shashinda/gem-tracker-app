import * as z from "zod"
import { UserRole } from "@/lib/types"

export const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.nativeEnum(UserRole),
  password: z.string().min(6, "Password must be at least 6 characters"),
  age: z.string().optional().or(z.literal("")),
  dob: z.string().optional().or(z.literal("")),
  idNumber: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  phoneNumber: z.string().optional().or(z.literal("")),
})

export const editUserSchema = userSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.nativeEnum(UserRole),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),
})

export const profileSchema = userSchema.omit({ role: true, password: true })

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type UserFormValues = z.infer<typeof userSchema>
export type EditUserFormValues = z.infer<typeof editUserSchema>
export type ProfileFormValues = z.infer<typeof profileSchema>
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
