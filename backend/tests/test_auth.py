import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.mark.asyncio
async def test_access_protected_route_without_token():
    """Valida se rotas protegidas rejeitam requisições sem JWT."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as ac:
        response = await ac.get("/api/v1/courses/")

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}
