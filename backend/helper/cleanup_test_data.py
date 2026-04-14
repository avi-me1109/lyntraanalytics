from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://lyntraAdmin:lyntra-2026@localhost:5432/lyntra_analytics")
engine = create_engine(DATABASE_URL)

CLEANUP_SQL = """
-- This wipes all pilot metrics and weeks but KEEPS the login accounts
TRUNCATE 
    lyntra_analytics.student_engagement,
    lyntra_analytics.task_metrics,
    lyntra_analytics.satisfaction,
    lyntra_analytics.retention,
    lyntra_analytics.health,
    lyntra_analytics.pilot_weeks
CASCADE;
"""

def cleanup():
    with engine.connect() as conn:
        conn.execute(text(CLEANUP_SQL))
        conn.commit()
    print("Pilot metrics wiped. login accounts preserved.")

if __name__ == "__main__":
    cleanup()