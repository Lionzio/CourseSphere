import { z } from 'zod';

export const courseSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres').max(255),
  description: z.string().optional(),
  start_date: z.string().min(1, 'A data de início é obrigatória'),
  end_date: z.string().min(1, 'A data de término é obrigatória'),
}).refine((data) => {
  if (!data.start_date || !data.end_date) return true;
  return new Date(data.end_date) >= new Date(data.start_date);
}, {
  message: 'A data de término deve ser igual ou posterior à data de início',
  path: ['end_date'],
});

export type CourseFormValues = z.infer<typeof courseSchema>;

export interface Course {
  id: number;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  creator_id: number;
}