import { z } from "zod";

const emailSchema = z.email().trim().toLowerCase().max(254);
const passwordSchema = z.string().min(12).max(128);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ["newPassword"],
    message: "New password must be different",
  });

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["manager", "cashier"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
