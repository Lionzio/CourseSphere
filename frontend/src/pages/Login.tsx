import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';
import { useAuthStore, type Role } from '../stores/auth';
import { loginSchema, type LoginFormValues } from '../schemas/auth';

interface JwtPayload {
  sub: string;
  role: Role;
  exp: number;
}

export function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const formData = new FormData();
      formData.append('username', data.email); // OAuth2 espera 'username'
      formData.append('password', data.password);

      const response = await api.post('/auth/login', formData);
      const token = response.data.access_token;
      
      // Decodifica o token para feedback imediato na interface
      const decoded = jwtDecode<JwtPayload>(token);

      // Guarda no Zustand (que também injetará o role no estado global)
      setAuth(token, { id: 0, name: 'Usuário', email: data.email });

      // Dispara o Toast dinâmico baseado no RBAC
      if (decoded.role === 'admin' || decoded.role === 'teacher') {
        toast.success('Bem-vindo! Modo professor ativado.', { icon: '👨‍🏫', duration: 4000 });
      } else {
        toast.success('Bem-vindo! Modo estudante ativado.', { icon: '🎓', duration: 4000 });
      }

      navigate('/dashboard');
    } catch {
      toast.error('E-mail ou senha incorretos.');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Entrar</h1>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input {...register('email')} placeholder="E-mail" className="counter" style={{ width: '100%' }} />
        {errors.email && <span style={{ color: 'red' }}>{errors.email.message}</span>}

        <input type="password" {...register('password')} placeholder="Senha" className="counter" style={{ width: '100%' }} />
        {errors.password && <span style={{ color: 'red' }}>{errors.password.message}</span>}

        <button type="submit" disabled={isSubmitting} className="counter" style={{ background: 'var(--accent)', color: 'white' }}>
          {isSubmitting ? 'Autenticando...' : 'Entrar'}
        </button>
      </form>
      <p style={{ marginTop: '1rem' }}>Não tem conta? <Link to="/register">Cadastre-se</Link></p>
    </div>
  );
}