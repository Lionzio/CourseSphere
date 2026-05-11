# backend/tests/test_rbac.py
from httpx import AsyncClient
from fastapi import status

from main import app
from api.deps import get_current_user
from models.user import User, Role


# ==========================================
# FIXTURES LOCAIS PARA MOCK DE UTILIZADORES
# ==========================================
def get_mock_student():
    return User(id=1, name="Aluno Teste", email="aluno@teste.com", role=Role.student)


def get_mock_teacher():
    return User(id=2, name="Prof Teste", email="prof@teste.com", role=Role.teacher)


def get_mock_admin():
    return User(id=3, name="Admin Teste", email="admin@teste.com", role=Role.admin)


# ==========================================
# TESTES DE ACESSO DO ALUNO (STUDENT)
# ==========================================
async def test_student_cannot_access_teacher_analytics(client: AsyncClient):
    """Garante que um Aluno não consegue aceder ao painel de professores."""
    app.dependency_overrides[get_current_user] = get_mock_student

    response = await client.get("/api/v1/analytics/teacher")

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert (
        response.json()["detail"] == "Permissões insuficientes para realizar esta ação."
    )

    app.dependency_overrides.clear()


async def test_student_cannot_access_admin_analytics(client: AsyncClient):
    """Garante que um Aluno não consegue aceder ao painel global de administração."""
    app.dependency_overrides[get_current_user] = get_mock_student

    response = await client.get("/api/v1/analytics/admin")

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Acesso negado" in response.json()["detail"]

    app.dependency_overrides.clear()


# ==========================================
# TESTES DE ACESSO DO PROFESSOR (TEACHER)
# ==========================================
async def test_teacher_can_access_teacher_analytics(client: AsyncClient):
    """Garante que um Professor consegue aceder ao seu próprio painel."""
    app.dependency_overrides[get_current_user] = get_mock_teacher

    response = await client.get("/api/v1/analytics/teacher")

    assert response.status_code == status.HTTP_200_OK

    app.dependency_overrides.clear()


async def test_teacher_cannot_access_admin_analytics(client: AsyncClient):
    """Garante que um Professor normal não consegue aceder ao painel de administração."""
    app.dependency_overrides[get_current_user] = get_mock_teacher

    response = await client.get("/api/v1/analytics/admin")

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Acesso negado" in response.json()["detail"]

    app.dependency_overrides.clear()


# ==========================================
# TESTES DE ACESSO DO ADMIN (ADMINISTRATOR)
# ==========================================
async def test_admin_can_access_all_analytics(client: AsyncClient):
    """Garante que um Administrador tem acesso total a todos os painéis analíticos."""
    app.dependency_overrides[get_current_user] = get_mock_admin

    response_teacher = await client.get("/api/v1/analytics/teacher")
    assert response_teacher.status_code == status.HTTP_200_OK

    response_admin = await client.get("/api/v1/analytics/admin")
    assert response_admin.status_code == status.HTTP_200_OK

    app.dependency_overrides.clear()
