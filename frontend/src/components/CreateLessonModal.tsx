import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import api from '../services/api';
import { lessonSchema, type LessonFormValues } from '../schemas/lesson';

interface CreateLessonModalProps {
  courseId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateLessonModal({ courseId, onClose, onSuccess }: CreateLessonModalProps) {
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting } 
  } = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      status: 'draft', // Define 'Rascunho' como padrão para segurança
      video_url: '',
    }
  });

  const onSubmit = async (data: LessonFormValues) => {
    try {
      // Formata os dados: se o video_url for uma string vazia, enviamos null para o backend
      const payload = {
        ...data,
        video_url: data.video_url === '' ? null : data.video_url,
      };

      await api.post(`/courses/${courseId}/lessons/`, payload);
      toast.success('Aula criada com sucesso!', { icon: '📝' });
      onSuccess(); // Recarrega a lista na página principal
      onClose();   // Fecha o modal
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.response?.data?.detail || 'Erro ao criar a aula.');
      } else {
        toast.error('Erro ao processar a requisição.');
      }
    }
  };

  return (
    // Overlay escuro (Fundo do modal)
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      {/* Caixa do Modal */}
      <div style={{
        background: 'var(--bg)',
        padding: '2rem',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '500px',
        border: '1px solid var(--border)',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text)' }}>
          Nova Aula
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {/* Título da Aula */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
              Título da Aula <span style={{ color: 'red' }}>*</span>
            </label>
            <input 
              {...register('title')} 
              placeholder="Ex: Introdução ao React" 
              className="counter" 
              style={{ width: '100%', margin: 0 }} 
            />
            {errors.title && <span style={{ color: '#ff4d4d', fontSize: '12px' }}>{errors.title.message}</span>}
          </div>

          {/* URL do Vídeo (Opcional) */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
              URL do Vídeo (Opcional)
            </label>
            <input 
              {...register('video_url')} 
              placeholder="Ex: https://youtube.com/watch?v=..." 
              className="counter" 
              style={{ width: '100%', margin: 0 }} 
            />
            {errors.video_url && <span style={{ color: '#ff4d4d', fontSize: '12px' }}>{errors.video_url.message}</span>}
          </div>

          {/* Status (Publicada vs Rascunho) */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
              Estado da Aula <span style={{ color: 'red' }}>*</span>
            </label>
            <select 
              {...register('status')} 
              className="counter" 
              style={{ width: '100%', margin: 0, padding: '0.6rem', cursor: 'pointer', background: 'var(--social-bg)', color: 'var(--text)' }}
            >
              <option value="draft">Rascunho (Visível apenas para professores)</option>
              <option value="published">Publicada (Visível para estudantes)</option>
            </select>
            {errors.status && <span style={{ color: '#ff4d4d', fontSize: '12px' }}>{errors.status.message}</span>}
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="counter" 
              style={{ margin: 0, background: 'transparent', border: '1px solid var(--border)' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="counter" 
              style={{ margin: 0, background: 'var(--accent)', color: 'white', border: 'none' }}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Aula'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}