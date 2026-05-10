# backend/api/quizzes.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
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
from services.pdf_service import generate_quiz_report_pdf

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
    """Motor central de autorização para todas as rotas de avaliação."""
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

    if require_ownership and not is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Acesso negado. Apenas o professor do curso "
                "pode gerir esta avaliação."
            ),
        )

    if not require_ownership and not is_manager:
        enrollment = await crud_enrollment.get_enrollment(
            db, user_id=user.id, course_id=course.id
        )
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Acesso negado. Matricule-se no curso para "
                    "interagir com as avaliações."
                ),
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
    """Cria um questionário completo (1:N)."""
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=True)
    return await crud_quiz.create_quiz(db=db, quiz_in=quiz, lesson_id=lesson_id)


@router.get(
    "/lessons/{lesson_id}/quizzes",
    response_model=List[QuizResponse],
    summary="Listar todas as avaliações de uma aula",
)
async def get_quizzes_for_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[QuizResponse]:
    """Retorna a lista de todas as avaliações disponíveis para esta aula."""
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=False)
    return await crud_quiz.get_quizzes_by_lesson(db, lesson_id)


@router.get(
    "/lessons/{lesson_id}/quizzes/{quiz_id}",
    response_model=QuizResponse,
    summary="Buscar uma avaliação específica",
)
async def get_quiz_by_id_endpoint(
    lesson_id: int,
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuizResponse:
    """
    BUGFIX: Retorna os dados de uma avaliação específica.
    Necessário para os alunos conseguirem renderizar a prova no frontend.
    """
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=False)

    quiz = await crud_quiz.get_quiz_by_id(db, quiz_id)
    if not quiz or quiz.lesson_id != lesson_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avaliação não encontrada ou não pertence a esta aula.",
        )
    return quiz


@router.delete(
    "/lessons/{lesson_id}/quizzes/{quiz_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir avaliação específica",
)
async def delete_quiz_from_lesson(
    lesson_id: int,
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_teacher),
) -> None:
    """Remove uma avaliação específica pelo seu ID (Cascata habilitada)."""
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=True)

    quiz = await crud_quiz.get_quiz_by_id(db, quiz_id)
    if not quiz or quiz.lesson_id != lesson_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avaliação não encontrada ou não pertence a esta aula.",
        )

    await crud_quiz.delete_quiz(db, quiz)


# ==========================================
# ROTA DE IA — Geração Automática
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
    """Lê o conteúdo da aula e gera autonomamente um questionário via IA."""
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=True)
    lesson = await crud_lesson.get_lesson_by_id(db, lesson_id)

    content = getattr(lesson, "content", None) or getattr(lesson, "ai_summary", None)
    if not content or len(content.strip()) < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "A aula não possui conteúdo suficiente para gerar questões. "
                "Adicione o conteúdo/transcrição da aula antes de usar "
                "o AI Quiz Builder."
            ),
        )

    try:
        return await generate_quiz_from_content(
            lesson_title=lesson.title,
            content=content,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


# ==========================================
# ROTAS DO PROFESSOR — Correção Manual
# ==========================================


@router.get(
    "/lessons/{lesson_id}/quizzes/{quiz_id}/attempts",
    response_model=List[QuizAttemptResponse],
    summary="Listar tentativas de um quiz específico",
)
async def list_quiz_attempts(
    lesson_id: int,
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_teacher),
) -> List[QuizAttemptResponse]:
    """Lista as submissões dos alunos para o painel de correção do professor."""
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=True)
    return await crud_attempt.get_all_attempts_for_quiz(db, quiz_id)


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
    """Atribui notas e feedback às questões abertas de uma tentativa."""
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=True)
    try:
        return await crud_attempt.grade_attempt_manually(db, attempt_id, grading_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# ROTAS DO ALUNO E PDF — Execução e Exportação
# ==========================================


@router.post(
    "/lessons/{lesson_id}/quizzes/{quiz_id}/attempts",
    response_model=QuizAttemptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submeter respostas para um quiz específico",
)
async def submit_quiz_attempt(
    lesson_id: int,
    quiz_id: int,
    attempt: QuizAttemptCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuizAttemptResponse:
    """Submete as respostas de um aluno para auto-correção imediata."""
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=False)

    existing_attempt = await crud_attempt.get_user_attempt(
        db, user_id=current_user.id, quiz_id=quiz_id
    )
    if existing_attempt:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Você já realizou esta avaliação específica.",
        )

    try:
        return await crud_attempt.create_and_grade_attempt(
            db=db, attempt_in=attempt, quiz_id=quiz_id, user_id=current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/lessons/{lesson_id}/quizzes/{quiz_id}/attempts/my",
    response_model=QuizAttemptResponse,
    summary="Consultar meu boletim de notas de um quiz",
)
async def get_my_quiz_attempt(
    lesson_id: int,
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuizAttemptResponse:
    """Retorna o boletim de notas da tentativa já realizada pelo aluno."""
    await verify_quiz_access(lesson_id, current_user, db, require_ownership=False)

    attempt = await crud_attempt.get_user_attempt(
        db, user_id=current_user.id, quiz_id=quiz_id
    )
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Você ainda não realizou esta avaliação.",
        )

    return attempt


@router.get(
    "/lessons/{lesson_id}/quizzes/{quiz_id}/attempts/{attempt_id}/pdf",
    response_class=StreamingResponse,
    summary="Download do Boletim de Avaliação em PDF",
)
async def download_quiz_attempt_pdf(
    lesson_id: int,
    quiz_id: int,
    attempt_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Gera dinamicamente o arquivo PDF contendo o boletim e gabarito da avaliação.
    Retorna via StreamingResponse para o navegador do cliente.
    """
    lesson = await verify_quiz_access(
        lesson_id, current_user, db, require_ownership=False
    )

    quiz = await crud_quiz.get_quiz_by_id(db, quiz_id)
    if not quiz or quiz.lesson_id != lesson_id:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada.")

    attempt = await crud_attempt.get_attempt_by_id(db, attempt_id)
    if not attempt or attempt.quiz_id != quiz_id:
        raise HTTPException(status_code=404, detail="Tentativa não encontrada.")

    course = await crud_course.get_course_by_id(db, lesson.course_id)
    is_manager = current_user.role == Role.admin or course.creator_id == current_user.id
    if not is_manager and attempt.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas pode baixar o seu próprio boletim.",
        )

    answers_details = [
        {
            "question_id": ans.question_id,
            "is_correct": ans.is_correct,
            "manual_score": ans.manual_score,
            "teacher_feedback": ans.teacher_feedback,
        }
        for ans in attempt.answers
    ]
    score = attempt.score if attempt.score is not None else 0.0

    pdf_bytes = generate_quiz_report_pdf(
        quiz_title=quiz.title,
        score=score,
        student_id=attempt.user_id,
        answers_details=answers_details,
    )

    filename = f"Boletim_{quiz.id}_Aluno_{attempt.user_id}.pdf"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}

    return StreamingResponse(
        pdf_bytes,
        media_type="application/pdf",
        headers=headers,
    )
