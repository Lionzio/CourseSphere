# backend/schemas/analytics.py
from typing import List
from pydantic import BaseModel, Field


# ==========================================
# VISÃO DO ALUNO (STUDENT)
# ==========================================
class GradeEvolutionItem(BaseModel):
    quiz_title: str
    score: float
    completed_at: str


class StudentAnalytics(BaseModel):
    average_completion: float = Field(
        description="Média percentual de conclusão dos cursos matriculados"
    )
    completed_evaluations: int = Field(
        description="Quantidade de avaliações totalmente corrigidas"
    )
    pending_evaluations: int = Field(
        description="Quantidade de avaliações aguardando correção do professor"
    )
    grade_evolution: List[GradeEvolutionItem] = Field(
        default_factory=list,
        description="Série temporal de notas para montagem do gráfico de linhas",
    )


# ==========================================
# VISÃO DO PROFESSOR (TEACHER)
# ==========================================
class CoursePerformanceItem(BaseModel):
    course_name: str
    average_score: float
    total_attempts: int


class TeacherAnalytics(BaseModel):
    total_students: int = Field(
        description="Total de matrículas ativas nos cursos do professor"
    )
    pending_corrections: int = Field(
        description="Total de tentativas de alunos aguardando correção manual"
    )
    course_performance: List[CoursePerformanceItem] = Field(
        default_factory=list,
        description="Média de notas agregada por curso para gráfico de barras",
    )


# ==========================================
# VISÃO GLOBAL (ADMIN)
# ==========================================
class AdminAnalytics(BaseModel):
    total_users: int
    total_courses: int
    total_enrollments: int
    success_rate: float = Field(
        description="Percentual de aprovação (nota >= 70) global do sistema"
    )
    fail_rate: float = Field(
        description="Percentual de reprovação (nota < 70) global do sistema"
    )
