import { z } from 'zod';

// Esquema de validação rigorosa para a criação e edição de aulas
export const lessonSchema = z.object({
  title: z.string().min(3, 'O título deve ter no mínimo 3 caracteres').max(255),
  status: z.enum(['draft', 'published'], {
    required_error: 'Selecione o estado da aula',
  }),
  // O video_url é opcional, mas se for preenchido, tem de ser uma URL válida.
  // Usamos .or(z.literal('')) para permitir que o input seja apagado e fique vazio.
  video_url: z.string().url('Insira uma URL válida (ex: https://youtube.com/...)').optional().or(z.literal('')),
});

// Inferência estrita de tipos para o React Hook Form
export type LessonFormValues = z.infer<typeof lessonSchema>;

// Tipagem da entidade Lesson que virá do backend
export interface Lesson {
  id: number;
  course_id: number;
  title: string;
  status: 'draft' | 'published';
  video_url: string | null;
}