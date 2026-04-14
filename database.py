from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# Update this if your Docker credentials change
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://lyntraAdmin:lyntra-2026@localhost:5432/lyntra_analytics")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)