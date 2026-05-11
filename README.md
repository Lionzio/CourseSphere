# 🌐 CourseSphere
### *Plataforma de E-Learning Full Stack com Inteligência Artificial Generativa*

<div align="center">

[![CI/CD Pipeline](https://github.com/Lionzio/CourseSphere/actions/workflows/ci.yml/badge.svg)](https://github.com/Lionzio/CourseSphere/actions/workflows/ci.yml)
[![Frontend — Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://lionzio-coursesphere.vercel.app/login)
[![Backend — Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat&logo=render&logoColor=white)](https://lionzio-coursesphere.onrender.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

<div align="center">

## 🔗 Acesso Direto

| 🎓 Aplicação em produção | 📡 API & Documentação |
|:---:|:---:|
| **[lionzio-coursesphere.vercel.app](https://lionzio-coursesphere.vercel.app/login)** | **[lionzio-coursesphere.onrender.com/docs](https://lionzio-coursesphere.onrender.com/docs)** |
| Interface completa com login, RBAC e IA | Swagger UI interativo com todos os endpoints |

> ⚠️ **Nota:** O serviço de backend está hospedado no plano gratuito do Render. A primeira requisição após um período de inatividade pode demorar entre **30 a 60 segundos** para o servidor acordar ("cold start"). Isso é completamente normal e esperado.

</div>

---

## 📖 O Que É o CourseSphere?

O **CourseSphere** é uma plataforma web de gestão de ensino a distância (E-Learning) concebida para modernizar a relação entre educadores e estudantes. Imagine um ambiente onde o professor nunca mais precisa criar manualmente um questionário a partir do zero — basta escrever o conteúdo da aula e a Inteligência Artificial gera avaliações completas, prontas a publicar, em segundos.

### O problema que resolve

Educadores perdem, em média, **30% do seu tempo pedagógico** em tarefas administrativas e repetitivas: criar avaliações, corrigir provas, gerir permissões de acesso a conteúdos e acompanhar o progresso de cada aluno. O CourseSphere automatiza precisamente este ciclo, libertando professores para focarem no que verdadeiramente importa: o ensino.

### Para além de um gestor de cursos

O CourseSphere é um **ecossistema inteligente** que une:

- **Gestão estruturada** de cursos, aulas e matrículas num único painel;
- **IA Generativa** (Groq/Gemini) para criação automática de quizzes e resumos de aulas;
- **Controlo de acesso granular** (RBAC) que garante que cada utilizador vê apenas o que deve ver;
- **Analytics em tempo real** para acompanhar o desempenho dos estudantes;
- **Exportação de resumos em PDF** para estudo offline.

Este projeto foi desenvolvido como submissão ao **Desafio Técnico — Desenvolvedor(a) Full Stack da V-LAB**, superando os requisitos mínimos por uma margem considerável.

---

## 🎯 Cumprimento do Desafio Técnico (V-LAB)

A tabela abaixo mapeia cada requisito do edital oficial da V-LAB para a sua implementação concreta no CourseSphere:

| Requisito do Edital (V-LAB) | Implementação no CourseSphere | Status |
| :--- | :--- | :---: |
| **Autenticação e Registro de Utilizador** | Sistema completo de login/registo com **JWT (JSON Web Tokens)** e hashing de passwords via **BCrypt**. Tokens com expiração configurável. Logout destrói o token no cliente via Zustand. | ✅ |
| **Proteção de Rotas** | Middleware de autenticação no **FastAPI** (`get_current_user`) bloqueia qualquer rota protegida. No frontend, guardas de rota em React redirecionam utilizadores não autenticados para `/login`. | ✅ |
| **Entidade: User** | Modelo completo com `name`, `email` (único), `hashed_password` e `role` (Admin/Professor/Student). Validações via **Pydantic V2** no backend e **Zod** no frontend. | ✅ |
| **Entidade: Course** | Atributos `name` (mín. 3 chars), `description`, `start_date`, `end_date` (com validação de intervalo) e `creator_id` (FK para User). Apenas o criador pode editar/eliminar. | ✅ |
| **Entidade: Lesson** | Atributos `title`, `status` (`draft`/`published`), `video_url` (validação de URL), `content` (Markdown), `course_id` (FK). Estrutura hierárquica vinculada ao curso. | ✅ |
| **CRUD de Courses** | Endpoints REST completos: `GET /courses`, `POST /courses`, `GET /courses/{id}`, `PUT /courses/{id}`, `DELETE /courses/{id}`. | ✅ |
| **CRUD de Lessons** | Endpoints REST completos: `GET /lessons`, `POST /lessons`, `GET /lessons/{id}`, `PUT /lessons/{id}`, `DELETE /lessons/{id}`. | ✅ |
| **Consumo de API Externa** | Integração com a **Random User API** (`randomuser.me`) para sugerir "instrutores convidados" na página de detalhes de cada curso. | ✅ |
| **Busca e Filtros** | Campo de pesquisa por nome de curso no Dashboard. Filtro por `status` (`draft`/`published`) nas listagens de aulas. | ✅ |
| **Deploy Funcional** | Frontend em **Vercel**, Backend em **Render** com base de dados **PostgreSQL** gerida. Ambos com URLs públicas e funcionais. | ✅ |
| **Docker** | `docker-compose.yml` na raiz do repositório sobe o ecossistema completo: API + PostgreSQL + Frontend (Nginx). | ✅ |
| **Testes Automatizados** | Suite de testes assíncronos com **Pytest + AsyncIO** (backend) e **Vitest + Testing Library** (frontend). Cobertura publicada como artefato no GitHub Actions. | ✅ |
| **README Completo** | Este documento. Inclui descrição, passo a passo de instalação, credenciais de teste, links de produção e documentação de arquitectura. | ✅ |
| **Organização de Commits** | Mensagens semânticas com prefixos (`feat:`, `fix:`, `test:`, `ci:`, `docs:`) ao longo de toda a história do repositório. | ✅ |
| **Diferencial — IA Generativa** | Geração automática de **questionários** (múltipla escolha, pesos, questões manuais) e **resumos** de aulas via **Groq** (Llama 3) e **Google Gemini**. | 🌟 |
| **Diferencial — RBAC Avançado** | Controlo de acesso baseado em três papéis (`Admin`, `Professor`, `Student`) com permissões granulares por endpoint no backend e por componente no frontend. | 🌟 |
| **Diferencial — CI/CD Pipeline** | Pipeline completa no **GitHub Actions** com 5 fases ordenadas: Lint (Black + Flake8 + ESLint) → Testes → Deploy (Render + Vercel). Deploy bloqueado se qualquer fase falhar. | 🌟 |
| **Diferencial — Analytics** | Dashboard com gráficos de desempenho por estudante. Motor de avaliação com pontuação automática, rastreio de tentativas e revisão de respostas. | 🌟 |

---

## ✨ Funcionalidades & Guia de Teste em Produção

### 🔐 Credenciais de Teste

Para explorar a plataforma imediatamente sem a necessidade de criar um novo cadastro, utilize as contas pré-configuradas abaixo. Cada perfil demonstra um nível de acesso específico do nosso sistema de **Controlo de Acesso Baseado em Papéis (RBAC)**:

| Papel | Email | Senha | Permissões |
| :--- | :--- | :--- | :--- |
| **Administrador** | `administrador1@gmail.com` | `administrador1` | **Acesso Total:** Gestão de utilizadores, auditoria e painel administrativo. |
| **Professor** | `professor1@gmail.com` | `professor1` | **Gestão Pedagógica:** Criar cursos/aulas, IA Quiz Builder e correção manual. |
| **Estudante 1** | `aluno1@gmail.com` | `aluno1` | **Aprendizagem:** Consumo de conteúdo, realização de quizzes e dashboards. |
| **Estudante 2** | `aluno2@gmail.com` | `aluno2` | **Aprendizagem:** Segunda conta para testes de concorrência e progresso. |

> 📝 **Nota sobre Registos:** É possível criar uma conta nova através da página de Registo. Por padrão, **todo novo utilizador é registado como "Estudante"**. A alteração para o papel de "Professor" ou "Admin" deve ser realizada diretamente na base de dados ou através de um utilizador com privilégios de Administrador.

> 💡 **Dica de Segurança:** Experimente tentar aceder à rota `/admin` autenticado como Estudante. O sistema bloqueará o acesso tanto no **Frontend** (Route Guards) como no **Backend** (Middleware de Autorização JWT), garantindo a integridade dos dados.

---

### 🤖 1. Geração Automática de Quizzes com IA

**O porquê:** Criar avaliações relevantes e bem estruturadas é uma das tarefas que mais tempo consome na prática docente. Esta funcionalidade elimina o trabalho repetitivo, permitindo ao professor validar e publicar uma avaliação completa em menos de um minuto.

**Como testar:**
1. Aceda com a conta de **Professor**.
2. Navegue até a qualquer aula com conteúdo (ex.: "Introdução ao Python").
3. Clique no botão **"✨ AI Quiz Builder"**.
4. A IA irá ler o conteúdo da aula e gerar um conjunto de questões de múltipla escolha com os pesos já definidos.
5. Reveja, ajuste se necessário, e publique.

---

### 🛡️ 2. Controlo de Acesso por Papéis (RBAC)

**O porquê:** Num ambiente educativo, a integridade pedagógica depende de uma hierarquia clara. Estudantes não devem poder editar conteúdos; professores não devem poder gerir toda a plataforma. O RBAC garante que cada utilizador opera apenas no seu domínio de responsabilidade.

**Como testar:**
- Com a conta de **Estudante**, tente aceder a `/admin` ou clicar em "Criar Curso". Ambas as ações serão bloqueadas.
- Com a conta de **Professor**, o menu de administração não aparece e a edição de cursos de outros professores é negada pelo backend.
- Com a conta de **Admin**, o painel `/admin` está acessível com controlo total sobre utilizadores e papéis.

---

### 📊 3. Motor de Avaliações & Analytics

**O porquê:** Avaliação sem feedback é inútil. O sistema não só aplica quizzes como regista tentativas, pontuações e respostas, permitindo ao professor identificar quais os conceitos onde os estudantes têm mais dificuldades.

**Como testar:**
1. Aceda com a conta de **Estudante** e realize um quiz numa aula.
2. No final, verá a sua pontuação imediatamente.
3. Aceda ao **Dashboard** para ver os seus resultados históricos em gráficos dinâmicos.
4. Como **Professor**, aceda ao painel de correção para ver as respostas de cada aluno e atribuir notas a questões de resposta aberta.

---

### 📄 4. Resumos e Exportação para PDF

**O porquê:** O conhecimento precisa de ser portátil. A capacidade de gerar um resumo inteligente do conteúdo de uma aula e exportá-lo em formato PDF permite ao estudante estudar offline e partilhar materiais de forma profissional.

**Como testar:**
1. Entre numa aula com conteúdo.
2. Clique em **"Gerar Resumo com IA"**.
3. Após a geração, clique em **"Exportar PDF"** para descarregar o documento formatado.

---

### 👥 5. Instrutor Convidado (API Externa)

**O porquê:** A integração com a [Random User API](https://randomuser.me/) demonstra a capacidade de consumir APIs externas e enriquecer dinamicamente a interface. Na página de detalhes de cada curso, um "instrutor convidado" fictício (com nome, foto e localização) é apresentado para contextualizar a turma.

**Como testar:** Aceda aos detalhes de qualquer curso. Na secção lateral, encontrará o card do instrutor convidado com dados gerados em tempo real pela API externa.

---

## 🛠️ Arquitetura e Tecnologias

### Backend

| Tecnologia | Versão | Função |
| :--- | :--- | :--- |
| **Python** | 3.11+ | Linguagem base do servidor |
| **FastAPI** | 0.111+ | Framework REST de alta performance com suporte nativo a `async/await` |
| **SQLAlchemy** | 2.0 | ORM com suporte a operações assíncronas (`asyncpg`) |
| **PostgreSQL** | 16 | Base de dados relacional principal (produção) |
| **Alembic** | — | Gestão de migrações da base de dados com histórico versionado |
| **Pydantic V2** | — | Validação e serialização de esquemas de dados com performance máxima |
| **Python-JOSE** | — | Geração e verificação de tokens JWT |
| **Passlib + BCrypt** | — | Hashing seguro de passwords |
| **Pytest + AsyncIO** | — | Suite de testes assíncronos para o backend |
| **Black + Flake8** | — | Formatação e linting do código Python |
| **Pipenv** | — | Gestão de dependências e ambientes virtuais |

### Frontend

| Tecnologia | Versão | Função |
| :--- | :--- | :--- |
| **React** | 19 | Biblioteca de UI para construção da interface |
| **Vite** | 6.x | Bundler e servidor de desenvolvimento de nova geração |
| **TypeScript** | 5.x | Tipagem estática para redução de bugs em produção |
| **Tailwind CSS** | 4.x | Framework CSS utilitário para UI responsiva |
| **Zustand** | — | Gestão de estado global (autenticação, sessão) |
| **React Router** | v7 | Roteamento declarativo com guardas de rota |
| **Zod** | — | Validação de formulários no cliente (espelhando o Pydantic) |
| **Vitest + Testing Library** | — | Testes de componente e integração |
| **ESLint** | — | Linting com regras estritas de TypeScript |

### Infraestrutura e IA

| Serviço | Função |
| :--- | :--- |
| **Vercel** | Hosting do frontend com CI/CD automático e CDN global |
| **Render** | Hosting do backend FastAPI com PostgreSQL gerido |
| **GitHub Actions** | Pipeline de CI/CD com 5 fases sequenciais |
| **Docker + Compose** | Ambiente de desenvolvimento reprodutível e isolado |
| **Google Gemini** | Modelo de IA para geração de conteúdo e resumos |
| **Groq (Llama 3)** | Inferência de IA de baixa latência para geração de quizzes |

---

## 🛡️ Garantia de Qualidade (QA) e CI/CD

O CourseSphere adota uma cultura de **"Failure-Proof Code"**: nenhuma linha de código entra em produção sem passar pelo nosso "Muro de Qualidade".

### Padronização de Código

**Backend (Python):**
- **Black** garante formatação determinística e consistente em todo o código Python. A configuração está em `pyproject.toml`.
- **Flake8** verifica a conformidade com as PEPs de estilo (máximo de 119 caracteres por linha, conforme `.flake8`).
- Qualquer desvio destas regras **bloqueia o merge** e impede o deploy.

**Frontend (TypeScript/React):**
- **ESLint** com regras estritas de TypeScript e React Hooks (`eslint.config.js`) garante qualidade e consistência no código do frontend.
- O comando `npm run lint` é executado em cada push como condição obrigatória antes dos testes.

### Pipeline de CI/CD (GitHub Actions)

O ficheiro `.github/workflows/ci.yml` define uma pipeline de **5 fases dependentes**, onde cada fase só arranca se a anterior passou com sucesso:

```
Push para main / Pull Request
         │
         ├── [Fase 1A] 🐍 Backend Lint (Black + Flake8)
         │         └── falha → pipeline abortada ✗
         │
         ├── [Fase 1B] ⚛️  Frontend Lint (ESLint)
         │         └── falha → pipeline abortada ✗
         │
         ├── [Fase 2A] 🧪 Backend Tests (Pytest + AsyncIO)  ← depende da Fase 1A
         │         └── falha → pipeline abortada ✗
         │
         ├── [Fase 2B] 🧪 Frontend Tests (Vitest)           ← depende da Fase 1B
         │         └── falha → pipeline abortada ✗
         │
         └── [Fase 3] 🚀 Deploy (Render + Vercel)          ← depende de TODAS as fases anteriores
                   └── apenas em push para main ✓
```

**Detalhes técnicos:**
- Os testes de backend executam contra uma base de dados **SQLite in-memory** no CI, eliminando qualquer dependência de infraestrutura externa.
- O relatório de cobertura (`coverage.xml`) é publicado como **artefato** no GitHub Actions e retido por 7 dias para inspeção.
- O deploy para o **Render** é disparado via _Deploy Hook_ seguro (URL armazenada como secret no GitHub).
- O deploy para a **Vercel** utiliza o CLI oficial (`vercel build --prod`) com injeção da variável `VITE_API_URL` diretamente pelo Actions, garantindo que o frontend aponta sempre para o backend correto.
- O mecanismo de `concurrency` cancela runs anteriores do mesmo PR, poupando minutos do GitHub Actions.

### Execução Local de Qualidade

```bash
# Backend — verificar antes de cada commit
cd backend
pipenv run black --check .
pipenv run flake8 .
pipenv run pytest --tb=short -q

# Frontend — verificar antes de cada commit
cd frontend
npm run lint
npm run test -- --run
```

---

## 🚀 Guia de Instalação Local

### Pré-requisitos

Certifique-se de que tem instalados:

- **Git** (qualquer versão recente)
- **Python 3.11+** — [download](https://www.python.org/downloads/)
- **Node.js 20+** e **npm** — [download](https://nodejs.org/)
- **PostgreSQL 14+** (se não usar Docker) — [download](https://www.postgresql.org/download/)
- **Docker e Docker Compose** (opcional, mas recomendado) — [download](https://docs.docker.com/get-docker/)

---

### Passo 1 — Clonar o Repositório

```bash
git clone https://github.com/Lionzio/CourseSphere.git
cd CourseSphere
```

---

### Passo 2 — Configurar o Backend

#### 2.1 — Instalar dependências

```bash
cd backend
pip install pipenv          # Instalar o gestor de pacotes
pipenv install --dev        # Instalar todas as dependências (incluindo dev)
```

#### 2.2 — Criar o ficheiro de variáveis de ambiente

Crie um ficheiro `.env` dentro da pasta `backend/` com o seguinte conteúdo:

```dotenv
# Base de Dados (adapte ao seu PostgreSQL local)
DATABASE_URL=postgresql+asyncpg://postgres:password123@localhost:5432/coursesphere

# Segurança JWT
SECRET_KEY=uma_chave_secreta_longa_e_aleatoria_para_jwt
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Chaves de IA (obtenha gratuitamente em console.groq.com e aistudio.google.com)
GEMINI_API_KEY=sua_chave_gemini_aqui
GROQ_API_KEY=sua_chave_groq_aqui
```

> 💡 **Dica:** As funcionalidades de IA (geração de quizzes e resumos) requerem pelo menos uma das chaves de API. A plataforma funciona sem elas, mas as funcionalidades de IA ficarão desativadas.

#### 2.3 — Criar a base de dados e executar migrações

```bash
# Crie a base de dados no PostgreSQL (substitua 'postgres' pelo seu utilizador)
createdb -U postgres coursesphere

# Execute as migrações para criar todas as tabelas
pipenv run alembic upgrade head
```

#### 2.4 — (Opcional) Criar utilizadores de seed

```bash
# Caso queira popular a base de dados com dados de demonstração
pipenv run python seed.py
```

#### 2.5 — Iniciar o servidor de desenvolvimento

```bash
pipenv run uvicorn main:app --reload --port 8000
```

O backend estará disponível em `http://localhost:8000`.
A documentação interativa (Swagger) estará em `http://localhost:8000/docs`.

---

### Passo 3 — Configurar o Frontend

```bash
# A partir da raiz do repositório
cd frontend

# Instalar dependências
npm install --legacy-peer-deps

# Criar o ficheiro de variáveis de ambiente
echo "VITE_API_URL=http://localhost:8000" > .env.local

# Iniciar o servidor de desenvolvimento
npm run dev
```

O frontend estará disponível em `http://localhost:5173`.

---

### Passo 4 — Método Recomendado: Docker Compose

Para subir o ecossistema completo (API + PostgreSQL + Frontend) com um único comando, sem necessidade de configurar nada manualmente:

```bash
# A partir da raiz do repositório
docker-compose up --build
```

| Serviço | URL Local |
| :--- | :--- |
| **Frontend** (Nginx) | `http://localhost:3000` |
| **Backend** (FastAPI) | `http://localhost:8000` |
| **API Docs** (Swagger) | `http://localhost:8000/docs` |
| **PostgreSQL** | `localhost:5433` |

Para parar todos os serviços:

```bash
docker-compose down
```

Para parar e apagar todos os dados (volumes):

```bash
docker-compose down -v
```

---

## 📁 Estrutura do Repositório

```
CourseSphere/
├── .github/
│   └── workflows/
│       └── ci.yml              # Pipeline completa de CI/CD
├── backend/
│   ├── api/                    # Routers FastAPI (auth, courses, lessons, quizzes, admin…)
│   ├── core/                   # Configuração, base de dados e segurança
│   ├── crud/                   # Lógica de acesso a dados (Repository Pattern)
│   ├── migrations/             # Migrações Alembic (histórico versionado)
│   ├── models/                 # Modelos SQLAlchemy (User, Course, Lesson, Quiz…)
│   ├── schemas/                # Esquemas Pydantic V2 (validação e serialização)
│   ├── services/               # Serviços de negócio (AI Service, PDF Service)
│   ├── tests/                  # Suite de testes (Pytest + AsyncIO)
│   ├── Dockerfile
│   ├── Pipfile
│   └── main.py                 # Ponto de entrada da aplicação
├── frontend/
│   ├── src/
│   │   ├── __tests__/          # Testes de componente (Vitest)
│   │   ├── components/         # Componentes reutilizáveis (Modais, Forms…)
│   │   ├── pages/              # Páginas principais (Dashboard, Login, Admin…)
│   │   ├── schemas/            # Validação Zod (espelhando o backend)
│   │   ├── services/           # Cliente HTTP (api.ts)
│   │   └── stores/             # Estado global Zustand
│   ├── Dockerfile
│   └── vite.config.ts
├── docker-compose.yml          # Orquestração completa do ecossistema
└── render.yaml                 # Configuração de deploy no Render
```

---

## 👤 Autor

<div align="center">

**Vinícius Leôncio**
*Estudante de Ciência da Computação · CIn — UFPE*

[![GitHub](https://img.shields.io/badge/GitHub-Lionzio-181717?style=flat&logo=github)](https://github.com/Lionzio)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Vinícius_Leôncio-0A66C2?style=flat&logo=linkedin)](https://www.linkedin.com/in/vin%C3%ADcius-le%C3%B4ncio-3226a9366/)
[![Email](https://img.shields.io/badge/Email-viniciusleoncio3267@gmail.com-EA4335?style=flat&logo=gmail)](mailto:viniciusleoncio3267@gmail.com)
[![Email Institucional](https://img.shields.io/badge/UFPE-vlacg@cin.ufpe.br-003087?style=flat&logo=academia)](mailto:vlacg@cin.ufpe.br)

</div>

---

<div align="center">

*Desenvolvido com foco em escalabilidade, segurança e experiência do utilizador.*
*Submetido ao Desafio Técnico — V-LAB · 2026*

</div>
