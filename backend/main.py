from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import engine, Base
from models.audit_log import AuditLog  # noqa: F401

# Importação dos roteadores
from api.auth import router as auth_router
from api.courses import router as courses_router
from api.lessons import router as lessons_router
from api.admin import router as admin_router

from api.enrollments import router as enrollments_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Executa ações durante o arranque (startup) e o encerramento (shutdown) da API.
    Neste caso, garante que as tabelas existem na base de dados antes de aceitar requisições.
    """
    async with engine.begin() as conn:
        # Cria as tabelas com base nos nossos ficheiros models/*.py
        await conn.run_sync(Base.metadata.create_all)
    yield  # A API fica a correr a partir daqui


# Inicialização da aplicação com o lifespan acoplado
app = FastAPI(
    title="CourseSphere API",
    description="""
    API avançada de gestão de cursos e aulas com arquitetura Multitenant e RBAC.
    - **Estudantes:** Podem consumir conteúdos.
    - **Professores:** Podem gerir os seus próprios cursos e aulas (Isolamento de Dados).
    - **Admin:** Pode promover utilizadores.
    """,
    version="1.0.0",
    lifespan=lifespan,  # <--- Evento de ciclo de vida ativado
    contact={
        "name": "Vinícius Leôncio",
        "url": "https://github.com/Lionzio",
        "email": "viniciusleoncio3267@gmail.com",
    },
)

# Configuração de CORS para permitir a comunicação com o Frontend (Vite)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Permite GET, POST, PUT, DELETE, OPTIONS, etc.
    allow_headers=["*"],  # Permite envio de Headers como Authorization (JWT)
)

# Registo dos roteadores com prefixos e tags para organização do Swagger
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Autenticação & Contas"])
app.include_router(
    admin_router, prefix="/api/v1/admin", tags=["Painel de Administração (RBAC)"]
)
app.include_router(courses_router, prefix="/api/v1/courses", tags=["Gestão de Cursos"])
app.include_router(lessons_router, prefix="/api/v1", tags=["Gestão de Aulas (Lessons)"])
app.include_router(
    enrollments_router,
    prefix="/api/v1/enrollments",
    tags=["Matrículas & Progresso"],
)


@app.get("/", tags=["Healthcheck"])
async def root():
    """Endpoint raiz para verificação de status (Healthcheck)."""
    return {
        "service": "CourseSphere API",
        "status": "Operando com sucesso",
        "version": "1.0.0",
    }
