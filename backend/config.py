from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent  # epl-stat root
BACKEND_DIR = Path(__file__).parent      # backend/


class Settings(BaseSettings):
    db_path: str = str(BACKEND_DIR / "epl_stat.db")
    data_dir: str = str(BASE_DIR)
    epl_tables_dir: str = str(BASE_DIR / "epl_tables_dataset")
    fpl_dataset_path: str = str(BASE_DIR / "fpl_dataset" / "players.csv")
    fpl_api_base: str = "https://fantasy.premierleague.com/api"
    model_dir: str = str(BACKEND_DIR / "ml" / "saved_models")
    raw_data_dir: str = str(BACKEND_DIR / "data" / "raw")

    # Optional Kaggle credentials (alternative to ~/.kaggle/kaggle.json)
    kaggle_username: str = ""
    kaggle_key: str = ""

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
