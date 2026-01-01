import sys
import os
import logging
from alembic.config import Config
from alembic import command

# Add src to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.utils.config import settings

def run_migrations():
    print("Starting migrations...", flush=True)
    try:
        # Create Alembic config
        alembic_cfg = Config("alembic.ini")
        # Override URL
        alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url)
        
        # Run upgrade
        command.upgrade(alembic_cfg, "head")
        print("\n✅ Migrations applied successfully!", flush=True)
        return True
    except Exception as e:
        error_msg = f"\n❌ Migration Failed: {e}\n"
        print(error_msg, flush=True)
        import traceback
        with open("migration_error.txt", "w") as f:
            f.write(str(e))
            f.write("\n")
            traceback.print_exc(file=f)
        return False

if __name__ == "__main__":
    success = run_migrations()
    sys.exit(0 if success else 1)
