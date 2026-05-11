# backend/crud/analytics.py
from typing import cast
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case
from sqlalchemy.orm import selectinload

from models.user import User
from models.course import Course
from models.enrollment import Enrollment
from models.lesson import Lesson
from models.quiz import Quiz
from models.attempt import QuizAttempt
from schemas.analytics import (
    StudentAnalytics,
    GradeEvolutionItem,
    TeacherAnalytics,
    CoursePerformanceItem,
    AdminAnalytics,
)


async def get_student_analytics(db: AsyncSession, user_id: int) -> StudentAnalytics:
    """Calcula as métricas de desempenho para o dashboard do Aluno."""

    # 1. BUGFIX SPRINT 10: Calcula a média em memória com eager loading (selectinload)
    # Evita AttributeError ao tentar usar func.avg() numa @property do Python
    enrollments_result = await db.execute(
        select(Enrollment)
        .options(
            selectinload(Enrollment.course).selectinload(Course.lessons),
            selectinload(Enrollment.progresses),
        )
        .where(Enrollment.user_id == user_id)
    )
    enrollments = enrollments_result.scalars().all()

    if enrollments:
        total_pct = sum(e.completion_percentage for e in enrollments)
        avg_completion = total_pct / len(enrollments)
    else:
        avg_completion = 0.0

    # 2. Contagem de avaliações (Corrigidas vs Pendentes)
    status_counts_result = await db.execute(
        select(QuizAttempt.status, func.count(QuizAttempt.id))
        .where(QuizAttempt.user_id == user_id)
        .group_by(QuizAttempt.status)
    )
    status_counts = dict(status_counts_result.all())

    completed = status_counts.get("graded", 0)
    pending = status_counts.get("pending_correction", 0)

    # 3. Evolução de Notas (Join entre Attempt e Quiz para o Gráfico)
    evolution_result = await db.execute(
        select(Quiz.title, QuizAttempt.score, QuizAttempt.completed_at)
        .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
        .where(QuizAttempt.user_id == user_id, QuizAttempt.status == "graded")
        .order_by(QuizAttempt.completed_at.asc())
    )

    grade_evolution = []
    for row in evolution_result.all():
        grade_evolution.append(
            GradeEvolutionItem(
                quiz_title=row.title,
                score=cast(float, row.score),
                # Formata a data para leitura fácil no Recharts
                completed_at=(
                    row.completed_at.strftime("%d/%m") if row.completed_at else ""
                ),
            )
        )

    return StudentAnalytics(
        average_completion=round(float(avg_completion), 1),
        completed_evaluations=completed,
        pending_evaluations=pending,
        grade_evolution=grade_evolution,
    )


async def get_teacher_analytics(db: AsyncSession, teacher_id: int) -> TeacherAnalytics:
    """Agrega os dados de engajamento para os cursos do Professor."""

    # 1. Total de Alunos matriculados nos cursos deste professor
    total_students_result = await db.execute(
        select(func.count(Enrollment.id))
        .join(Course, Enrollment.course_id == Course.id)
        .where(Course.creator_id == teacher_id)
    )
    total_students = total_students_result.scalar() or 0

    # 2. Total de correções manuais pendentes nas provas deste professor
    pending_result = await db.execute(
        select(func.count(QuizAttempt.id))
        .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
        .join(Lesson, Quiz.lesson_id == Lesson.id)
        .join(Course, Lesson.course_id == Course.id)
        .where(
            Course.creator_id == teacher_id, QuizAttempt.status == "pending_correction"
        )
    )
    pending_corrections = pending_result.scalar() or 0

    # 3. Desempenho por Curso (Média de Notas e Total de Tentativas)
    perf_result = await db.execute(
        select(
            Course.name,
            func.avg(QuizAttempt.score).label("avg_score"),
            func.count(QuizAttempt.id).label("total_attempts"),
        )
        .join(Lesson, Lesson.course_id == Course.id)
        .join(Quiz, Quiz.lesson_id == Lesson.id)
        .join(QuizAttempt, QuizAttempt.quiz_id == Quiz.id)
        .where(Course.creator_id == teacher_id, QuizAttempt.status == "graded")
        .group_by(Course.id)
    )

    course_performance = []
    for row in perf_result.all():
        course_performance.append(
            CoursePerformanceItem(
                course_name=row.name,
                average_score=round(float(row.avg_score or 0), 1),
                total_attempts=row.total_attempts,
            )
        )

    return TeacherAnalytics(
        total_students=total_students,
        pending_corrections=pending_corrections,
        course_performance=course_performance,
    )


async def get_admin_analytics(db: AsyncSession) -> AdminAnalytics:
    """Busca as métricas globais e taxa de sucesso do sistema para Admins."""

    # 1. Contagens Básicas
    users_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    courses_count = (await db.execute(select(func.count(Course.id)))).scalar() or 0
    enrollments_count = (
        await db.execute(select(func.count(Enrollment.id)))
    ).scalar() or 0

    # 2. Taxa de Sucesso vs Reprovação
    # BUGFIX: Utilização de `case` garante compatibilidade entre PostgreSQL e SQLite
    attempts_result = await db.execute(
        select(
            func.count(QuizAttempt.id).label("total"),
            func.sum(case((QuizAttempt.score >= 70, 1), else_=0)).label("passed"),
        ).where(QuizAttempt.status == "graded")
    )
    row = attempts_result.one()
    total_graded = row.total or 0
    passed = row.passed or 0

    if total_graded > 0:
        success_rate = (passed / total_graded) * 100
        fail_rate = 100.0 - success_rate
    else:
        success_rate = 0.0
        fail_rate = 0.0

    return AdminAnalytics(
        total_users=users_count,
        total_courses=courses_count,
        total_enrollments=enrollments_count,
        success_rate=round(success_rate, 1),
        fail_rate=round(fail_rate, 1),
    )
