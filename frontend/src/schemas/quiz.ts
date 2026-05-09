import { z } from 'zod';

export const optionSchema = z.object({
  text: z.string().min(1, 'A opção não pode ser vazia').max(255),
  is_correct: z.boolean().default(false),
});

export const questionSchema = z.object({
  text: z.string().min(5, 'O enunciado deve ter pelo menos 5 caracteres'),
  question_type: z.enum(['multiple_choice', 'open']),
  weight: z.coerce.number().min(0.1, 'O peso deve ser maior que zero').default(1.0),
  options: z.array(optionSchema).default([]),
}).superRefine((data, ctx) => {
  // Espelhando a regra de negócio do Backend no Frontend!
  if (data.question_type === 'multiple_choice') {
    if (data.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Questões de múltipla escolha precisam de pelo menos 2 opções',
        path: ['options'],
      });
    } else if (!data.options.some((opt) => opt.is_correct)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Marque pelo menos uma opção como correta',
        path: ['options'],
      });
    }
  }
});

export const quizSchema = z.object({
  title: z.string().min(3, 'O título do questionário deve ter no mínimo 3 caracteres').max(255),
  questions: z.array(questionSchema).min(1, 'Adicione pelo menos uma questão ao questionário'),
});

// Inferência de Tipos
export type OptionFormValues = z.infer<typeof optionSchema>;
export type QuestionFormValues = z.infer<typeof questionSchema>;
export type QuizFormValues = z.infer<typeof quizSchema>;

// Tipos de Resposta da API
export interface OptionResponse {
  id: number;
  question_id: number;
  text: string;
  is_correct: boolean;
}

export interface QuestionResponse {
  id: number;
  quiz_id: int;
  text: string;
  question_type: 'multiple_choice' | 'open';
  weight: number;
  options: OptionResponse[];
}

export interface QuizResponse {
  id: number;
  lesson_id: number;
  title: string;
  questions: QuestionResponse[];
}