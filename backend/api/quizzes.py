# backend/api/quizzes.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_teacher, get_current_user
from core.database import get_db
from crud import attempt as crud_attempt
from crud import course as crud_course
from crud import enrollment as crud_enrollment
from crud import lesson as crud_lesson
from crud import quiz as crud_quiz
from models.lesson import Lesson
from models.user import Role, User
from schemas.ai_quiz import AIQuizSchema
from schemas.attempt import QuizAttemptCreate, QuizAttemptResponse, QuizGradeUpdate
from schemas.quiz import QuizCreate, QuizResponse
from services.ai_service import generate_quiz_from_content

router = APIRouter()


# ==========================================
# MOTOR DE AUTORIZAÇÃO CENTRAL
# ==========================================


async def verify_quiz_access(
    lesson_id: int,
    user: User,
    db: AsyncSession,
    require_ownership: bool = False,
) -> Lesson:
    """
    Motor central de autorização para todas as rotas de avaliação.

    Args:
        lesson_id: ID da aula à qual o quiz pertence.
        user: Utilizador autenticado via JWT.
        db: Sessão assíncrona do banco de dados.
        require_ownership: Se True, exige que o utilizador seja o criador
                           do curso ou admin. Se False, valida matrícula ativa.

    Returns:
        O objeto Lesson validado.

    Raises:
        HTTPException 404: Aula não encontrada.
        HTTPException 403: Permissões insuficientes.
    """
    lesson = await crud_lesson.get_lesson_by_id(db, lesson_id)
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aula não encontrada.",
        )

    course = await crud_course.get_course_by_id(db, lesson.course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso associado a esta aula não foi encontrado.",
        )

    is_manager = user.role == Role.admin or course.creator_id == user.id

    # Rota de gestão: exige ser o professor criador ou admin
    if require_ownership and not is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas o professor do curso pode gerir esta avaliação.",
        )

    # Rota de consumo: managers passam diretamente; alunos precisam de matrícula
    if not require_ownership and not is_manager:
        enrollment = await crud_enrollment.get_enrollment(
            db, user_id=user.id, course_id=course.id
        )
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado. Matricule-se no curso para interagir com esta avaliação.",
            )

    return lesson


# ==========================================
# ROTAS DO PROFESSOR — Gestão do Quiz
# ==========================================


@router.post(
    "/lessons/{lesson_id}/quizzes",
    response_model=QuizResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar avaliação para uma aula",
)
async def create_quiz_for_lesson(
    lesson_id: int,
    quiz: QuizCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_teacher),
) -> QuizResponse:
    """
    Cria um questionário completo (com questões e opções) para uma aula.
    Apenas o professor criador do curso ou um admin pode usar este endpoint.
    Retorna 409 se a aula já possuir uma avaliação ativa.
    """
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=True)

    existing_quiz = await crud_quiz.get_quiz_by_lesson(db, lesson_id)
    if existing_quiz:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta aula já possui uma avaliação ativa. Exclua-a primeiro para criar uma nova.",
        )

    return await crud_quiz.create_quiz(db=db, quiz_in=quiz, lesson_id=lesson_id)


@router.get(
    "/lessons/{lesson_id}/quizzes",
    response_model=QuizResponse,
    summary="Buscar avaliação de uma aula",
)
async def get_quiz_for_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuizResponse:
    """
    Retorna a avaliação de uma aula.
    - Professores/Admins veem o gabarito completo.
    - Estudantes matriculados recebem as questões sem indicação da resposta correta
      (filtragem feita na camada de schema/crud).
    """
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=False)

    quiz = await crud_quiz.get_quiz_by_lesson(db, lesson_id)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhuma avaliação encontrada para esta aula.",
        )

    return quiz


@router.delete(
    "/lessons/{lesson_id}/quizzes",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir avaliação de uma aula",
)
async def delete_quiz_from_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_teacher),
) -> None:
    """
    Remove a avaliação de uma aula em cascata (Quiz → Questões → Opções → Tentativas).
    Ação irreversível. Apenas o professor criador ou admin pode executá-la.
    """
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=True)

    quiz = await crud_quiz.get_quiz_by_lesson(db, lesson_id)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhuma avaliação encontrada para excluir.",
        )

    await crud_quiz.delete_quiz(db, quiz)


# ==========================================
# ROTA DE IA — Geração Automática de Quiz (SPRINT 7)
# ==========================================


@router.post(
    "/lessons/{lesson_id}/quizzes/ai-generate",
    response_model=AIQuizSchema,
    status_code=status.HTTP_200_OK,
    summary="Gerar quiz automaticamente com IA",
)
async def ai_generate_quiz(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_teacher),
) -> AIQuizSchema:
    """
    Lê o conteúdo da aula e gera autonomamente um questionário completo via IA.

    Utiliza Gemini Structured Outputs como primário e Groq como fallback.
    O JSON retornado é validado pelo Pydantic antes de ser enviado ao frontend,
    garantindo que o contrato de dados seja sempre respeitado.

    Apenas o professor criador do curso ou admin pode aceder.
    Retorna 400 se a aula não tiver conteúdo suficiente para gerar questões.
    Retorna 503 se todos os nós de IA estiverem indisponíveis.
    """
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=True)

    lesson = await crud_lesson.get_lesson_by_id(db, lesson_id)
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aula não encontrada.",
        )

    # Garante que existe conteúdo suficiente para gerar questões
    content = getattr(lesson, "content", None) or getattr(lesson, "ai_summary", None)
    if not content or len(content.strip()) < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "A aula não possui conteúdo suficiente para gerar questões. "
                "Adicione o conteúdo/transcrição da aula antes de usar o AI Quiz Builder."
            ),
        )

    try:
        generated_quiz = await generate_quiz_from_content(
            lesson_title=lesson.title,
            content=content,
        )
        return generated_quiz

    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )


# ==========================================
# ROTAS DO PROFESSOR — Correção Manual
# ==========================================


@router.get(
    "/lessons/{lesson_id}/quizzes/attempts",
    response_model=List[QuizAttemptResponse],
    summary="Listar tentativas dos alunos (Painel de Correção)",
)
async def list_quiz_attempts(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_teacher),
) -> List[QuizAttemptResponse]:
    """
    Lista todas as tentativas submetidas pelos alunos para uma avaliação.
    Exclusivo para o professor do curso e admins.
    """
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=True)

    quiz = await crud_quiz.get_quiz_by_lesson(db, lesson_id)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avaliação não encontrada.",
        )

    return await crud_attempt.get_all_attempts_for_quiz(db, quiz.id)


@router.patch(
    "/lessons/{lesson_id}/quizzes/attempts/{attempt_id}/grade",
    response_model=QuizAttemptResponse,
    summary="Corrigir manualmente questões abertas",
)
async def grade_student_attempt(
    lesson_id: int,
    attempt_id: int,
    grading_in: QuizGradeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_teacher),
) -> QuizAttemptResponse:
    """
    Atribui notas e feedback às questões abertas de uma tentativa específica.
    Apenas o professor do curso ou admin pode corrigir.
    """
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=True)

    try:
        return await crud_attempt.grade_attempt_manually(db, attempt_id, grading_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# ROTAS DO ALUNO — Execução e Visualização
# ==========================================


@router.post(
    "/lessons/{lesson_id}/quizzes/attempts",
    response_model=QuizAttemptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submeter respostas para auto-correção",
)
async def submit_quiz_attempt(
    lesson_id: int,
    attempt: QuizAttemptCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuizAttemptResponse:
    """
    Submete as respostas de um aluno para auto-correção imediata.
    Regras de negócio aplicadas:
    - Aluno precisa estar matriculado no curso.
    - Apenas uma tentativa por avaliação é permitida (anti-cheat).
    """
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=False)

    quiz = await crud_quiz.get_quiz_by_lesson(db, lesson_id)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avaliação não encontrada.",
        )

    existing_attempt = await crud_attempt.get_user_attempt(
        db, user_id=current_user.id, quiz_id=quiz.id
    )
    if existing_attempt:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Você já realizou esta avaliação. Apenas uma tentativa é permitida.",
        )

    try:
        return await crud_attempt.create_and_grade_attempt(
            db=db, attempt_in=attempt, quiz_id=quiz.id, user_id=current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/lessons/{lesson_id}/quizzes/attempts/my",
    response_model=QuizAttemptResponse,
    summary="Consultar meu boletim de notas",
)
async def get_my_quiz_attempt(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuizAttemptResponse:
    """
    Retorna o boletim de notas da tentativa já realizada pelo aluno autenticado.
    Retorna 404 se o aluno ainda não submeteu respostas para esta avaliação.
    """
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=False)

    quiz = await crud_quiz.get_quiz_by_lesson(db, lesson_id)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avaliação não encontrada.",
        )

    attempt = await crud_attempt.get_user_attempt(
        db, user_id=current_user.id, quiz_id=quiz.id
    )
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Você ainda não realizou esta avaliação.",
        )

    return attempt
