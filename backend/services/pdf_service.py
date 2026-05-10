# backend/services/pdf_service.py
import io
from datetime import datetime
from typing import List, Dict, Any
from fpdf import FPDF


class CourseSpherePDF(FPDF):
    """
    Classe base geradora de PDFs adaptada para o design da plataforma.
    Inclui cabeçalhos e rodapés automáticos para nível Enterprise.
    """

    def header(self):
        # Configuração da marca/logo simulada
        self.set_font("helvetica", "B", 16)
        self.set_text_color(46, 125, 50)  # Verde Escuro (Cor de Sucesso/Accent)
        self.cell(
            0, 10, "CourseSphere", border=False, align="L", new_x="RIGHT", new_y="TOP"
        )

        # Subtítulo de contexto
        self.set_font("helvetica", "I", 10)
        self.set_text_color(150, 150, 150)
        self.cell(
            0,
            10,
            "Ecossistema de Estudo Offline",
            border=False,
            align="R",
            new_x="LMARGIN",
            new_y="NEXT",
        )

        # Linha divisória
        self.set_draw_color(220, 220, 220)
        self.line(10, 20, 200, 20)
        self.ln(8)

    def footer(self):
        # Posição a 1.5 cm do fundo
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.set_text_color(150, 150, 150)

        # Data de geração e numeração automática de páginas
        current_time = datetime.now().strftime("%d/%m/%Y %H:%M")
        page_info = f"Gerado em {current_time} | Página {self.page_no()}/{{nb}}"
        self.cell(0, 10, page_info, align="C", new_x="LMARGIN", new_y="NEXT")


def generate_lesson_summary_pdf(lesson_title: str, summary_content: str) -> io.BytesIO:
    """
    Transforma o Resumo Inteligente (Markdown text) num PDF elegante para download.
    """
    pdf = CourseSpherePDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Título da Aula
    pdf.set_font("helvetica", "B", 18)
    pdf.set_text_color(30, 30, 30)
    pdf.multi_cell(
        0, 10, f"Resumo Inteligente: {lesson_title}", new_x="LMARGIN", new_y="NEXT"
    )
    pdf.ln(5)

    # Limpeza básica do Markdown para o PDF (remove asteriscos duplos p/ evitar lixo visual)
    clean_content = summary_content.replace("**", "").replace("##", "")

    # Corpo do Resumo
    pdf.set_font("helvetica", "", 12)
    pdf.set_text_color(60, 60, 60)

    # fpdf2 multi_cell lida automaticamente com quebras de linha longas
    pdf.multi_cell(0, 7, clean_content, new_x="LMARGIN", new_y="NEXT")

    # Guardar no buffer de memória (não grava no disco, otimizando performance I/O)
    pdf_bytes = io.BytesIO()
    pdf.output(pdf_bytes)
    pdf_bytes.seek(0)
    return pdf_bytes


def generate_quiz_report_pdf(
    quiz_title: str,
    score: float,
    student_id: int,
    answers_details: List[Dict[str, Any]],
) -> io.BytesIO:
    """
    Gera o Boletim de Notas do Estudante para estudo offline.
    """
    pdf = CourseSpherePDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Título do Relatório
    pdf.set_font("helvetica", "B", 18)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 10, "Boletim de Avaliação", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 8, f"Avaliação: {quiz_title}", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.cell(
        0, 8, f"ID do Aluno: #{student_id}", new_x="LMARGIN", new_y="NEXT", align="C"
    )
    pdf.ln(5)

    # Caixa da Nota Final
    (
        pdf.set_fill_color(240, 248, 240)
        if score >= 70
        else pdf.set_fill_color(255, 235, 238)
    )
    nota_color = (46, 125, 50) if score >= 70 else (211, 47, 47)
    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(*nota_color)
    pdf.cell(
        0,
        15,
        f"Nota Final: {score}%",
        border=1,
        align="C",
        fill=True,
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(10)

    # Detalhamento das Respostas
    pdf.set_font("helvetica", "B", 14)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 10, "Detalhamento das Respostas:", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    for i, ans in enumerate(answers_details, start=1):
        # Enunciado simulado ou ID (Como é offline, formatamos as métricas)
        pdf.set_font("helvetica", "B", 12)
        pdf.set_text_color(60, 60, 60)
        pdf.multi_cell(
            0,
            8,
            f"Questão {i} (ID: {ans['question_id']})",
            new_x="LMARGIN",
            new_y="NEXT",
        )

        pdf.set_font("helvetica", "", 11)
        if ans.get("manual_score") is not None:
            # Questão Aberta Corrigida
            pdf.set_text_color(46, 125, 50)
            pdf.multi_cell(
                0,
                6,
                f"Nota Atribuída: {ans['manual_score']}/100",
                new_x="LMARGIN",
                new_y="NEXT",
            )
            if ans.get("teacher_feedback"):
                pdf.set_text_color(100, 100, 100)
                pdf.multi_cell(
                    0,
                    6,
                    f"Feedback: {ans['teacher_feedback']}",
                    new_x="LMARGIN",
                    new_y="NEXT",
                )
        elif ans.get("is_correct") is not None:
            # Questão Múltipla Escolha
            if ans["is_correct"]:
                pdf.set_text_color(46, 125, 50)
                pdf.cell(0, 6, "Resultado: Correta", new_x="LMARGIN", new_y="NEXT")
            else:
                pdf.set_text_color(211, 47, 47)
                pdf.cell(0, 6, "Resultado: Incorreta", new_x="LMARGIN", new_y="NEXT")
        else:
            # Questão Aberta Pendente
            pdf.set_text_color(230, 115, 0)
            pdf.cell(
                0,
                6,
                "Status: Aguardando Correção do Professor",
                new_x="LMARGIN",
                new_y="NEXT",
            )

        pdf.ln(4)

    pdf_bytes = io.BytesIO()
    pdf.output(pdf_bytes)
    pdf_bytes.seek(0)
    return pdf_bytes
