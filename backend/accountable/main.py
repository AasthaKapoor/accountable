from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import config, db, seed
from .routers import activities, contacts, dashboard, deals, organizations, pipeline
from .schemas import install_error_handlers


def open_database():
    """Open the database file, creating and seeding it when it's new."""
    path = config.db_path()
    is_new = not path.exists()
    engine = db.init_engine(path)
    if is_new:
        seed.seed(engine)
    else:
        db.create_tables(engine)
    return engine


@asynccontextmanager
async def lifespan(_app: FastAPI):
    open_database()
    yield


app = FastAPI(title="Accountable", lifespan=lifespan)
install_error_handlers(app)
for module in (organizations, contacts, deals, pipeline, activities, dashboard):
    app.include_router(module.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
