# backend/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importação da base de dados para a criação automática das tabelas
from core.database import engine, Base

# Registro explícito dos modelos no SQLAlchemy (Garante a criação via Base.metadata)
from models.audit_log import AuditLog  # noqa: F401
from models.material import Material  # noqa: F401

# Importação dos roteadores
from api.auth import router as auth_router
from api.courses import router as courses_router
from api.lessons import router as lessons_router
from api.admin import router as admin_router
from api.enrollments import router as enrollments_router
from api.materials import router as materials_router
from api.quizzes import router as quizzes_router
from api.analytics import router as analytics_router


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


# ==========================================
# METADADOS PARA O SWAGGER / REDOC
# ==========================================
tags_metadata = [
    {
        "name": "Autenticação & Contas",
        "description": (
            "Operações de registo e login com **OAuth2PasswordBearer**. "
            "Retorna tokens JWT estritamente validados."
        ),
    },
    {
        "name": "Painel de Administração (RBAC)",
        "description": (
            "Rotas estritas para gestão de utilizadores e observabilidade global. "
            "Requer permissão `admin`."
        ),
    },
    {
        "name": "Gestão de Cursos",
        "description": (
            "CRUD completo para cursos. Professores gerem o seu próprio conteúdo; "
            "estudantes exploram e consomem o catálogo."
        ),
    },
    {
        "name": "Gestão de Aulas (Lessons)",
        "description": (
            "Estruturação hierárquica de aulas, suportando anexos de vídeo e "
            "processamento de conteúdos textuais profundos."
        ),
    },
    {
        "name": "Matrículas & Progresso",
        "description": (
            "Gestão de inscrições de estudantes em cursos e rastreio analítico "
            "de progresso individual em cada aula."
        ),
    },
    {
        "name": "Gestão de Materiais de Apoio",
        "description": "Registo e gestão de anexos, PDFs, documentações e links complementares.",
    },
    {
        "name": "Motor de Avaliações",
        "description": (
            "Criação inteligente de avaliações geradas por IA (Groq/Gemini), "
            "submissão de respostas e cálculo determinístico."
        ),
    },
    {
        "name": "Analytics",
        "description": (
            "Extração de métricas de desempenho para alimentar os painéis visuais "
            "de estudantes e professores."
        ),
    },
    {
        "name": "Healthcheck",
        "description": (
            "Verificação automatizada de disponibilidade do serviço na nuvem "
            "(utilizado pelos monitores do Render)."
        ),
    },
]

# Inicialização da aplicação com o lifespan acoplado e documentação enriquecida
app = FastAPI(
    title="CourseSphere API",
    description="""
🚀 **Plataforma Educacional Avançada com Inteligência Artificial**

Esta API suporta um ecossistema completo de E-Learning assente numa arquitetura
*Multitenant* e de Controlo de Acessos Baseado em Papéis (RBAC).

### 🛠️ Funcionalidades Principais:
* **Autenticação Segura:** Implementação nativa e isolada de JWT com o fluxo OAuth2.
* **IA Integrada:** Geração automática de testes baseados no contexto das aulas.
* **Camada de Autorização (RBAC):**
  * 🎓 **Estudantes:** Consumo de conteúdo, progresso e resolução de provas.
  * 👨‍🏫 **Professores:** Autoria total sobre cursos, módulos, anexos e métricas.
  * 🛡️ **Admin:** Observabilidade global da plataforma, auditoria e privilégios.

*(A documentação interativa abaixo permite testar as rotas em tempo real. Pressione o
botão **Authorize** com credenciais válidas para injetar automaticamente o token).*
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
    contact={
        "name": "Vinícius Leôncio",
        "url": "https://github.com/Lionzio",
        "email": "viniciusleoncio3267@gmail.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
)

# BUGFIX: Utilização de Regex para permitir qualquer porta no localhost/127.0.0.1.
# Adicionada também a origem de produção da Vercel para permitir o fluxo de auth.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost",
        "http://127.0.0.1",
        "https://lionzio-coursesphere.vercel.app",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registo dos roteadores com prefixos e tags mapeadas
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Autenticação & Contas"])
app.include_router(
    admin_router, prefix="/api/v1/admin", tags=["Painel de Administração (RBAC)"]
)
app.include_router(courses_router, prefix="/api/v1/courses", tags=["Gestão de Cursos"])
app.include_router(lessons_router, prefix="/api/v1", tags=["Gestão de Aulas (Lessons)"])
app.include_router(
    enrollments_router, prefix="/api/v1/enrollments", tags=["Matrículas & Progresso"]
)
app.include_router(
    materials_router, prefix="/api/v1", tags=["Gestão de Materiais de Apoio"]
)
app.include_router(quizzes_router, prefix="/api/v1", tags=["Motor de Avaliações"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])


@app.get(
    "/",
    tags=["Healthcheck"],
    summary="Verificar Estado da API",
    description=(
        "Retorna o status operacional do serviço em formato JSON. Extremamente útil "
        "para sondagens de *Uptime* e ferramentas de CI/CD garantirem a vitalidade."
    ),
    responses={
        200: {
            "description": "Serviço perfeitamente operacional",
            "content": {
                "application/json": {
                    "example": {
                        "service": "CourseSphere API",
                        "status": "Operando com sucesso",
                        "version": "1.0.0",
                    }
                }
            },
        }
    },
)
async def root():
    """Endpoint raiz para verificação de status (Healthcheck)."""
    return {
        "service": "CourseSphere API",
        "status": "Operando com sucesso",
        "version": "1.0.0",
    }
