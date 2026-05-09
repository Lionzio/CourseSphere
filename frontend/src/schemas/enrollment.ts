export interface Enrollment {
  id: number;
  user_id: number;
  course_id: number;
  enrolled_at: string;
  completion_percentage: number; // Retornado nativamente pelo nosso backend otimizado
}

export interface LessonProgress {
  id: number;
  enrollment_id: number;
  lesson_id: number;
  completed_at: string;
}