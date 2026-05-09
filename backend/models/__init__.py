# backend/models/__init__.py
from core.database import Base
from .user import User
from .course import Course
from .lesson import Lesson
from .enrollment import Enrollment
from .lesson_progress import LessonProgress

__all__ = ["Base", "User", "Course", "Lesson", "Enrollment", "LessonProgress"]
