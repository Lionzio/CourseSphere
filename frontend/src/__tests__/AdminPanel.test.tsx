import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AdminPanel } from '../pages/AdminPanel';
import { useAuthStore } from '../stores/auth';
import toast from 'react-hot-toast';

// 1. Mock das dependências externas
vi.mock('../stores/auth', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockedUseAuthStore = vi.mocked(useAuthStore);

describe('AdminPanel - Route Protection (RBAC)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve redirecionar e exibir toast de erro se o utilizador for Aluno (Student)', () => {
    // Simula um aluno logado
    mockedUseAuthStore.mockReturnValue({
      id: 1,
      name: 'Aluno',
      email: 'aluno@teste.com',
      role: 'student',
    });

    const { container } = render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    // O componente deve retornar null (não renderizar nada) e disparar o toast
    expect(container).toBeEmptyDOMElement();
    expect(toast.error).toHaveBeenCalledWith('Acesso negado. Área restrita apenas a Administradores.');
  });

  it('deve renderizar o painel perfeitamente se o utilizador for Administrador (Admin)', () => {
    // Simula um Admin logado
    mockedUseAuthStore.mockReturnValue({
      id: 3,
      name: 'Admin',
      email: 'admin@teste.com',
      role: 'admin',
    });

    render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    // O título do painel deve estar na tela
    expect(screen.getByText('Painel de Administração')).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});