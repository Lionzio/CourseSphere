from fastapi import FastAPI

app = FastAPI(title="CourseSphere API")

@app.get("/")
async def root():
    return {"message": "API CourseSphere operando com sucesso."}