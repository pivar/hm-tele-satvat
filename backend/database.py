from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

# user = os.getenv("DATABASE_USER")
# password = os.getenv("DATABASE_PASSWORD")
# host = os.getenv("DATABASE_HOST")
# port = os.getenv("DATABASE_PORT")
# db = os.getenv("DATABASE_NAME")

# DATABASE_URL = f"postgresql://{user}:{password}@{host}:{port}/{db}"

engine = create_engine(os.getenv("DATABASE_URL"))

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
