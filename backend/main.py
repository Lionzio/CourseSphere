from fastapi import FastAPI
from api.auth import router as auth_router
from api.courses import router as courses_router

app = FastAPI(title="CourseSphere API")

# Inclui as rotas de autenticação com a tag 'Auth'
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(courses_router, prefix="/api/v1/courses", tags=["Courses"])


@app.get("/")
async def root():
    return {"message": "API CourseSphere operando com sucesso."}
