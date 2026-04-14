from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://lyntraAdmin:lyntra-2026@localhost:5432/lyntra_analytics")
engine = create_engine(DATABASE_URL)

SEED_SQL = """
-- 1. Pilot Weeks
INSERT INTO lyntra_analytics.pilot_weeks (week_id, week_label)
VALUES (1, 'Week 1 (Mar 9)'), (2, 'Week 2 (Mar 16)')
ON CONFLICT (week_id) DO NOTHING;

-- 2. Week 1 Data (Global - course_id is NULL)
INSERT INTO lyntra_analytics.student_engagement (week_id, course_id, students_enrolled, students_activated, weekly_active_users)
VALUES (1, NULL, 100, 25, 10) 
ON CONFLICT (week_id, course_id) DO UPDATE SET students_activated = EXCLUDED.students_activated;

INSERT INTO lyntra_analytics.task_metrics (week_id, course_id, canvas_assignments, AI_broken_tasks)
VALUES (1, NULL, 100, 45) 
ON CONFLICT (week_id, course_id) DO NOTHING;

INSERT INTO lyntra_analytics.health (week_id, course_id, p1_bugs, total_syncs, canvas_sync_errors)
VALUES (1, NULL, 1, 150, 5) 
ON CONFLICT (week_id, course_id) DO NOTHING;

-- 3. Week 2 Data (Global)
INSERT INTO lyntra_analytics.student_engagement (week_id, course_id, students_enrolled, students_activated, weekly_active_users)
VALUES (2, NULL, 700, 40, 15) 
ON CONFLICT (week_id, course_id) DO UPDATE SET students_activated = EXCLUDED.students_activated;

INSERT INTO lyntra_analytics.health (week_id, course_id, p1_bugs, total_syncs, canvas_sync_errors)
VALUES (2, NULL, 0, 400, 2) 
ON CONFLICT (week_id, course_id) DO NOTHING;
"""

def seed():
    with engine.connect() as conn:
        conn.execute(text(SEED_SQL))
        conn.commit()
    print("Seed data inserted successfully.")

if __name__ == "__main__":
    seed()