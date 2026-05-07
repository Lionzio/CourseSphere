from fastapi import FastAPI
from api.auth import router as auth_router
from api.courses import router as courses_router
from api.lessons import router as lessons_router

app = FastAPI(title="CourseSphere API", description="API de gestão de cursos e aulas.")

# Registro dos roteadores (agrupados por Tags para organizar o Swagger)
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(courses_router, prefix="/api/v1/courses", tags=["Courses"])
app.include_router(
    lessons_router, prefix="/api/v1", tags=["Lessons"]
)  # O prefixo exato está direto nos decorators


@app.get("/")
async def root():
    return {"message": "API CourseSphere operando com sucesso."}
