from typing import List, Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator


# ==========================================
# SCHEMAS DE OPÇÕES (Alternativas)
# ==========================================
class OptionBase(BaseModel):
    text: str = Field(
        ..., min_length=1, max_length=255, description="Texto da alternativa"
    )
    is_correct: bool = Field(
        default=False, description="Indica se é a alternativa correta"
    )


class OptionCreate(OptionBase):
    pass


class OptionResponse(OptionBase):
    id: int
    question_id: int

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# SCHEMAS DE QUESTÕES
# ==========================================
class QuestionBase(BaseModel):
    text: str = Field(..., min_length=5, description="Enunciado da questão")
    question_type: Literal["multiple_choice", "open"] = Field(
        default="multiple_choice", description="Tipo da questão (Fechada ou Aberta)"
    )
    weight: float = Field(
        default=1.0, gt=0.0, description="Peso da questão na Nota Final da Prova (NFP)"
    )


class QuestionCreate(QuestionBase):
    options: List[OptionCreate] = Field(
        default_factory=list,
        description="Lista de alternativas (apenas para múltipla escolha)",
    )

    @model_validator(mode="after")
    def validate_options(self) -> "QuestionCreate":
        """
        Validação avançada de Regras de Negócio Nível Enterprise:
        - Múltipla escolha: Exige >= 2 opções e pelo menos 1 correta.
        - Aberta: Não deve possuir opções (são ignoradas ou bloqueadas).
        """
        if self.question_type == "multiple_choice":
            if len(self.options) < 2:
                raise ValueError(
                    "Questões de múltipla escolha exigem pelo menos 2 opções."
                )
            if not any(opt.is_correct for opt in self.options):
                raise ValueError(
                    "Questões de múltipla escolha devem ter pelo menos 1 opção marcada como correta."
                )
        elif self.question_type == "open":
            if len(self.options) > 0:
                raise ValueError(
                    "Questões abertas/discursivas não devem possuir alternativas cadastradas."
                )
        return self


class QuestionResponse(QuestionBase):
    id: int
    quiz_id: int
    options: List[OptionResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# SCHEMAS DO QUIZ (Agregador)
# ==========================================
class QuizBase(BaseModel):
    title: str = Field(
        ..., min_length=3, max_length=255, description="Título do Questionário"
    )
    weight: float = Field(
        default=1.0,
        gt=0.0,
        description="Peso da prova para o cálculo da Nota Final da Disciplina (NFD)",
    )


class QuizCreate(QuizBase):
    """
    Permite criar um Quiz inteiro de uma só vez (Deep Create),
    enviando as questões e opções aninhadas no JSON.
    """

    questions: List[QuestionCreate] = Field(default_factory=list)


class QuizResponse(QuizBase):
    id: int
    lesson_id: int
    questions: List[QuestionResponse] = []

    model_config = ConfigDict(from_attributes=True)
