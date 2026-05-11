import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreateQuizModal } from '../components/CreateQuizModal';

// Mock do Axios/API para não fazer requisições reais
vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('CreateQuizModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  it('deve renderizar o modal com os campos obrigatórios vazios por defeito', () => {
    render(
      <CreateQuizModal lessonId={1} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Verifica a presença do título e do banner de IA
    expect(screen.getByText('Construir Avaliação')).toBeInTheDocument();
    expect(screen.getByText('✨ AI Quiz Builder')).toBeInTheDocument();

    // Verifica se o campo de título do quiz existe
    const titleInput = screen.getByPlaceholderText('Ex: Prova Final de Algoritmos');
    expect(titleInput).toBeInTheDocument();
  });

  it('deve adicionar uma nova questão quando o botão for clicado', async () => {
    render(
      <CreateQuizModal lessonId={1} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    // Inicialmente, existe apenas a "Questão 1" (default)
    expect(screen.getByText('Questão 1')).toBeInTheDocument();
    expect(screen.queryByText('Questão 2')).not.toBeInTheDocument();

    // Clica no botão para adicionar nova questão
    const addQuestionBtn = screen.getByText('+ Nova Questão');
    fireEvent.click(addQuestionBtn);

    // Agora a "Questão 2" deve existir na tela
    expect(screen.getByText('Questão 2')).toBeInTheDocument();
  });
});