import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

// Definimos estritamente os tipos de papéis suportados pelo sistema
export type Role = 'student' | 'teacher' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

interface AuthState {
  token: string | null;
  user: User | null;
  // O setAuth recebe o usuário básico, o 'role' será extraído magicamente do token
  setAuth: (token: string, user: Omit<User, 'role'>) => void;
  logout: () => void;
}

interface JwtPayload {
  sub: string;
  role: Role;
  exp: number;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        try {
          // Decodifica o token JWT para extrair a carga útil (payload) injetada pelo backend
          const decoded = jwtDecode<JwtPayload>(token);
          
          set({
            token,
            user: {
              ...user,
              id: Number(decoded.sub), // Garante que o ID é o real vindo do banco
              role: decoded.role,      // Injeta o papel de acesso no estado global
            },
          });
        } catch (error) {
          console.error("Falha ao decodificar o token JWT", error);
        }
      },
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'coursesphere-auth', // Nome da chave no localStorage
    }
  )
);