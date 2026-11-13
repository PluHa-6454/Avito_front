import { z } from 'zod'

export const RoleSchema = z.enum(['intern', 'mentor', 'lead'])

export type Role = z.infer<typeof RoleSchema>

export const UserSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  role: RoleSchema,
  team_id: z.string(),
  team_name: z.string(),
  onboarding_stage: z.string().nullish(),
})

export type User = z.infer<typeof UserSchema>

export const LoginRequestSchema = z.object({
  email: z.email(),
})

export type LoginRequest = z.infer<typeof LoginRequestSchema>

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
})

export type LoginResponse = z.infer<typeof LoginResponseSchema>
