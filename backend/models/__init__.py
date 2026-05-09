# backend/models/__init__.py
from core.database import Base
from .user import User
from .course import Course
from .lesson import Lesson
from .enrollment import Enrollment
from .lesson_progress import LessonProgress
from .material import Material

# Importação do agregado do Motor de Avaliações
from .quiz import Quiz, Question, Option

# Importação do Motor de Resolução (Sprint 5)
from .attempt import QuizAttempt, StudentAnswer

__all__ = [
    "Base",
    "User",
    "Course",
    "Lesson",
    "Enrollment",
    "LessonProgress",
    "Material",
    "Quiz",
    "Question",
    "Option",
    "QuizAttempt",
    "StudentAnswer",
]
