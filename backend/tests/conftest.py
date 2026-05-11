# backend/tests/conftest.py
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.database import Base, get_db
from main import app

# Configuração da base de dados SQLite em memória para testes ultrarrápidos e isolados
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine_test = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    bind=engine_test, class_=AsyncSession, expire_on_commit=False
)


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """
    Fixture executada automaticamente antes de CADA teste.
    Garante que temos um esquema de base de dados fresco e limpo.
    """
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session():
    """Fornece uma sessão de banco de dados de teste isolada."""
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    """
    Cliente HTTP assíncrono para testar os endpoints da API (substitui o TestClient síncrono).
    Faz o override da dependência `get_db` para injetar a nossa DB em memória.
    """

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # ASGITransport é a forma moderna e recomendada de testar FastAPI com httpx assíncrono
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    # Limpa as substituições para não poluir outros testes
    app.dependency_overrides.clear()
