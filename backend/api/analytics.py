# backend/api/analytics.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_teacher, get_current_user
from core.database import get_db
from crud import analytics as crud_analytics
from models.user import Role, User
from schemas.analytics import AdminAnalytics, StudentAnalytics, TeacherAnalytics

router = APIRouter()


# ==========================================
# DASHBOARD DO ALUNO
# ==========================================
@router.get(
    "/student",
    response_model=StudentAnalytics,
    summary="Obter métricas de desempenho do Aluno",
)
async def get_student_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentAnalytics:
    """
    Retorna as agregações de desempenho do aluno autenticado.
    Os dados são filtrados pelo ID do token JWT para garantir isolamento.
    """
    return await crud_analytics.get_student_analytics(db, current_user.id)


# ==========================================
# DASHBOARD DO PROFESSOR
# ==========================================
@router.get(
    "/teacher",
    response_model=TeacherAnalytics,
    summary="Obter métricas de engajamento do Professor",
)
async def get_teacher_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_teacher),
) -> TeacherAnalytics:
    """
    Retorna as agregações de engajamento dos cursos criados pelo professor.
    O 'get_current_teacher' já bloqueia utilizadores com role 'student'.
    """
    return await crud_analytics.get_teacher_analytics(db, current_user.id)


# ==========================================
# DASHBOARD DO ADMINISTRADOR
# ==========================================
@router.get(
    "/admin",
    response_model=AdminAnalytics,
    summary="Obter métricas globais da Plataforma",
)
async def get_admin_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AdminAnalytics:
    """
    Retorna estatísticas globais da plataforma (Taxa de sucesso, total de usuários, etc).
    Acesso estritamente bloqueado a administradores através de RBAC rígido.
    """
    # Validação Nível Enterprise: Hardcode do super-admin para evitar lock-out
    is_admin = (
        current_user.role == Role.admin
        or current_user.email == "viniciusleoncio3267@gmail.com"
    )

    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Acesso negado. Esta visão de observabilidade "
                "é restrita a administradores do sistema."
            ),
        )

    return await crud_analytics.get_admin_analytics(db)
