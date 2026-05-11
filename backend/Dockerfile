# backend/Dockerfile

# 1. Imagem Base: Leve, segura e com a versão exata do Python utilizada no projeto
FROM python:3.11-slim

# 2. Variáveis de Ambiente: Otimizam o Python e o comportamento de pacotes
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIPENV_VENV_IN_PROJECT=0

# 3. Dependências de Sistema: Necessárias para compilar drivers como asyncpg ou dependências C
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 4. Instalação do gerenciador de pacotes
RUN pip install --no-cache-dir pipenv

# 5. Segurança: Criação de um utilizador sem privilégios de root (Boas Práticas DevOps)
RUN useradd -m -d /app -s /bin/bash appuser

# 6. Definir o diretório de trabalho
WORKDIR /app

# 7. Caching de Camadas: Copiamos apenas os arquivos de dependência primeiro.
# Se o código mudar, mas as dependências não, o Docker reaproveita esta camada e poupa tempo.
COPY Pipfile Pipfile.lock ./

# 8. Instalação de Dependências: --system instala globalmente no container (não precisamos de venv isolada aqui)
# --deploy garante que o Pipfile.lock está sincronizado, falhando o build caso não esteja.
RUN pipenv install --system --deploy --clear

# 9. Copiar o restante do código-fonte, garantindo a propriedade para o novo utilizador
COPY --chown=appuser:appuser . .

# 10. Trocar para o utilizador não-root
USER appuser

# 11. Exposição da porta de comunicação da API
EXPOSE 8000

# 12. Comando de arranque da aplicação usando o servidor ASGI Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]