from datetime import date
from typing import Optional
from pydantic import BaseModel, Field, model_validator, ConfigDict


class CourseBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def check_dates(self) -> "CourseBase":
        if self.end_date < self.start_date:
            raise ValueError("end_date deve ser igual ou posterior a start_date")
        return self


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    @model_validator(mode="after")
    def check_dates(self) -> "CourseUpdate":
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date deve ser igual ou posterior a start_date")
        return self


class CourseResponse(CourseBase):
    id: int
    creator_id: int

    model_config = ConfigDict(from_attributes=True)
