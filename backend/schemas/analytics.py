# backend/schemas/analytics.py
from typing import List
from pydantic import BaseModel, Field, ConfigDict


# ==========================================
# VISÃO DO ALUNO (STUDENT)
# ==========================================
class GradeEvolutionItem(BaseModel):
    quiz_title: str = Field(..., description="Título da avaliação")
    score: float = Field(..., description="Nota obtida na avaliação")
    completed_at: str = Field(..., description="Data de conclusão no formato ISO 8601")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "quiz_title": "Introdução à Inteligência Artificial",
                "score": 95.5,
                "completed_at": "2026-05-15T14:30:00Z",
            }
        }
    )


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

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "average_completion": 65.5,
                "completed_evaluations": 4,
                "pending_evaluations": 1,
                "grade_evolution": [
                    {
                        "quiz_title": "Introdução à Inteligência Artificial",
                        "score": 95.5,
                        "completed_at": "2026-05-15T14:30:00Z",
                    }
                ],
            }
        }
    )


# ==========================================
# VISÃO DO PROFESSOR (TEACHER)
# ==========================================
class CoursePerformanceItem(BaseModel):
    course_name: str = Field(..., description="Nome do curso lecionado")
    average_score: float = Field(..., description="Média das notas de todos os alunos")
    total_attempts: int = Field(..., description="Total de provas submetidas")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "course_name": "Desenvolvimento Web Avançado",
                "average_score": 82.3,
                "total_attempts": 150,
            }
        }
    )


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

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_students": 120,
                "pending_corrections": 5,
                "course_performance": [
                    {
                        "course_name": "Desenvolvimento Web Avançado",
                        "average_score": 82.3,
                        "total_attempts": 150,
                    }
                ],
            }
        }
    )


# ==========================================
# VISÃO GLOBAL (ADMIN)
# ==========================================
class AdminAnalytics(BaseModel):
    total_users: int = Field(..., description="Total de usuários na plataforma")
    total_courses: int = Field(..., description="Total de cursos criados")
    total_enrollments: int = Field(..., description="Total de matrículas ativas")
    success_rate: float = Field(
        description="Percentual de aprovação (nota >= 70) global do sistema"
    )
    fail_rate: float = Field(
        description="Percentual de reprovação (nota < 70) global do sistema"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_users": 1500,
                "total_courses": 45,
                "total_enrollments": 3200,
                "success_rate": 85.5,
                "fail_rate": 14.5,
            }
        }
    )
