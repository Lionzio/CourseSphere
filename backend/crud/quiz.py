from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from models.quiz import Quiz, Question, Option
from schemas.quiz import QuizCreate


async def create_quiz(db: AsyncSession, quiz_in: QuizCreate, lesson_id: int) -> Quiz:
    """
    Desempacota o JSON gigante e salva o Quiz, as suas Questões e Opções
    numa única transação de base de dados (ACID compliant).
    """
    # 1. Cria o agregado principal (Quiz)
    db_quiz = Quiz(title=quiz_in.title, lesson_id=lesson_id)
    db.add(db_quiz)
    await db.flush()  # Gera o db_quiz.id sem commitar na base de dados final

    # 2. Itera sobre as questões recebidas
    for q_in in quiz_in.questions:
        db_question = Question(
            quiz_id=db_quiz.id,
            text=q_in.text,
            question_type=q_in.question_type,
            weight=q_in.weight,
        )
        db.add(db_question)
        await db.flush()  # Gera o db_question.id

        # 3. Itera sobre as opções de cada questão
        for opt_in in q_in.options:
            db_option = Option(
                question_id=db_question.id,
                text=opt_in.text,
                is_correct=opt_in.is_correct,
            )
            db.add(db_option)

    # Faz o commit de toda a árvore de uma só vez
    await db.commit()

    # Retorna o quiz recém-criado usando a busca por ID
    return await get_quiz_by_id(db, db_quiz.id)


async def get_quiz_by_id(db: AsyncSession, quiz_id: int) -> Quiz | None:
    """
    Busca um Quiz específico pelo seu ID.
    Carrega a árvore inteira (Quiz -> Questions -> Options).
    """
    result = await db.execute(
        select(Quiz)
        .options(joinedload(Quiz.questions).joinedload(Question.options))
        .where(Quiz.id == quiz_id)
    )
    return result.unique().scalars().first()


async def get_quizzes_by_lesson(db: AsyncSession, lesson_id: int) -> List[Quiz]:
    """
    REFACTOR SPRINT 8: Retorna todos os Quizzes de uma aula (Relação 1:N).
    Utiliza `joinedload` para evitar N+1 queries.
    """
    result = await db.execute(
        select(Quiz)
        .options(joinedload(Quiz.questions).joinedload(Question.options))
        .where(Quiz.lesson_id == lesson_id)
    )
    return list(result.unique().scalars().all())


async def delete_quiz(db: AsyncSession, db_quiz: Quiz):
    """
    Apaga o quiz. Graças ao cascade="all, delete-orphan",
    as questões e opções associadas serão apagadas automaticamente.
    """
    await db.delete(db_quiz)
    await db.commit()
