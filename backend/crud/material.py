from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.material import Material
from schemas.material import MaterialCreate, MaterialUpdate


async def create_material(
    db: AsyncSession, material: MaterialCreate, lesson_id: int
) -> Material:
    """Anexa um novo material a uma aula específica."""
    db_material = Material(**material.model_dump(), lesson_id=lesson_id)
    db.add(db_material)
    await db.commit()
    await db.refresh(db_material)
    return db_material


async def get_materials_by_lesson(db: AsyncSession, lesson_id: int) -> list[Material]:
    """Busca todos os materiais anexados a uma determinada aula."""
    result = await db.execute(select(Material).where(Material.lesson_id == lesson_id))
    return list(result.scalars().all())


async def get_material_by_id(db: AsyncSession, material_id: int) -> Material | None:
    """Busca um material específico pelo seu ID único."""
    result = await db.execute(select(Material).where(Material.id == material_id))
    return result.scalars().first()


async def update_material(
    db: AsyncSession, db_material: Material, material_update: MaterialUpdate
) -> Material:
    """Atualiza os metadados ou a URL de um material existente."""
    update_data = material_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_material, key, value)
    await db.commit()
    await db.refresh(db_material)
    return db_material


async def delete_material(db: AsyncSession, db_material: Material):
    """Remove o material da base de dados."""
    await db.delete(db_material)
    await db.commit()
