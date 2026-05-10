// frontend/src/schemas/ai_quiz.ts

export interface AIOptionSchema {
  text: string;
  is_correct: boolean;
}

export interface AIQuestionSchema {
  text: string;
  question_type: 'multiple_choice' | 'open';
  weight: number;
  options: AIOptionSchema[];
}

export interface AIQuizSchema {
  title: string;
  questions: AIQuestionSchema[];
}