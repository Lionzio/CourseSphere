// frontend/src/schemas/lesson.ts
import { z } from 'zod';

export const lessonSchema = z.object({
  title: z.string().min(3, 'O título deve ter no mínimo 3 caracteres').max(255),
  // BUGFIX SPRINT 11: Substituição de 'required_error' por 'message' para compatibilidade de tipagem
  status: z.enum(['draft', 'published'], {
    message: 'Selecione o estado da aula',
  }),
  video_url: z
    .string()
    .url('Insira uma URL válida (ex: https://youtube.com/...)')
    .optional()
    .or(z.literal('')),
});

export type LessonFormValues = z.infer<typeof lessonSchema>;

export interface Lesson {
  id: number;
  course_id: number;
  title: string;
  status: 'draft' | 'published';
  video_url: string | null;
  /** Conteúdo/transcrição da aula — fonte para o AI Quiz Builder e Smart Summary */
  content: string | null;
  /** Cache do resumo gerado pela IA (Sprint 6) */
  ai_summary: string | null;
}