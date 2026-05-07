import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Insira um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;