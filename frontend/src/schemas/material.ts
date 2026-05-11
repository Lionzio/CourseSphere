// frontend/src/schemas/material.ts
import { z } from 'zod';

export const materialSchema = z.object({
  title: z.string().min(3, 'O título deve ter no mínimo 3 caracteres').max(255),
  // BUGFIX SPRINT 11: Substituição de 'required_error' por 'message'
  type: z.enum(['pdf', 'video', 'link', 'article', 'doc'], {
    message: 'Selecione o tipo de material',
  }),
  url: z.string().url('Insira uma URL válida (ex: https://...)'),
});

export type MaterialFormValues = z.infer<typeof materialSchema>;

export interface Material {
  id: number;
  lesson_id: number;
  title: string;
  type: 'pdf' | 'video' | 'link' | 'article' | 'doc';
  url: string;
}