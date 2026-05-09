import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import api from '../services/api';
import { materialSchema, type MaterialFormValues } from '../schemas/material';

interface CreateMaterialModalProps {
  lessonId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateMaterialModal({ lessonId, onClose, onSuccess }: CreateMaterialModalProps) {
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting } 
  } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      type: 'link', // Padrão seguro
      url: '',
    }
  });

  const onSubmit = async (data: MaterialFormValues) => {
    try {
      await api.post(`/lessons/${lessonId}/materials`, data);
      toast.success('Material de apoio adicionado!', { icon: '📚' });
      onSuccess(); // Recarrega os dados na página principal
      onClose();   // Fecha o modal
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.response?.data?.detail || 'Erro ao adicionar o material.');
      } else {
        toast.error('Erro ao processar a requisição.');
      }
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
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
          Adicionar Material
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
              Título do Material <span style={{ color: 'red' }}>*</span>
            </label>
            <input 
              {...register('title')} 
              placeholder="Ex: Slides da Aula, Artigo da Nature..." 
              className="counter" 
              style={{ width: '100%', margin: 0 }} 
            />
            {errors.title && <span style={{ color: '#ff4d4d', fontSize: '12px' }}>{errors.title.message}</span>}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
              Tipo de Arquivo <span style={{ color: 'red' }}>*</span>
            </label>
            <select 
              {...register('type')} 
              className="counter" 
              style={{ width: '100%', margin: 0, padding: '0.6rem', cursor: 'pointer', background: 'var(--social-bg)', color: 'var(--text)' }}
            >
              <option value="link">🔗 Link Externo (Site/Repositório)</option>
              <option value="pdf">📄 Documento PDF</option>
              <option value="doc">📝 Documento de Texto (Word/Google Docs)</option>
              <option value="article">📰 Artigo / Leitura</option>
              <option value="video">🎞️ Vídeo Complementar</option>
            </select>
            {errors.type && <span style={{ color: '#ff4d4d', fontSize: '12px' }}>{errors.type.message}</span>}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
              URL de Destino <span style={{ color: 'red' }}>*</span>
            </label>
            <input 
              {...register('url')} 
              placeholder="https://..." 
              className="counter" 
              style={{ width: '100%', margin: 0 }} 
            />
            {errors.url && <span style={{ color: '#ff4d4d', fontSize: '12px' }}>{errors.url.message}</span>}
          </div>

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
              {isSubmitting ? 'Salvando...' : 'Adicionar Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}