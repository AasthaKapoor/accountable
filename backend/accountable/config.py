import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB = BACKEND_DIR / "data" / "accountable.db"


def db_path() -> Path:
    """The SQLite file to use. Tests point ACCOUNTABLE_DB at their own file."""
    return Path(os.environ.get("ACCOUNTABLE_DB", DEFAULT_DB))
