from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://lyntraAdmin:lyntra-2026@localhost:5432/lyntra_analytics")
engine = create_engine(DATABASE_URL)

SCHEMA = """
CREATE SCHEMA IF NOT EXISTS lyntra_analytics;

DROP VIEW IF EXISTS lyntra_analytics.v_dashboard_summary;
DROP TABLE IF EXISTS lyntra_analytics.health, lyntra_analytics.satisfaction, 
           lyntra_analytics.task_metrics, lyntra_analytics.student_engagement, 
           lyntra_analytics.pilot_weeks, lyntra_analytics.courses CASCADE;

CREATE TABLE lyntra_analytics.courses (
    course_id SERIAL PRIMARY KEY,
    course_name TEXT NOT NULL,       
    professor_name TEXT NOT NULL
);

CREATE TABLE lyntra_analytics.pilot_weeks (
    week_id SERIAL PRIMARY KEY,
    week_label TEXT NOT NULL
);

CREATE TABLE lyntra_analytics.student_engagement (
    id SERIAL PRIMARY KEY,
    week_id INTEGER REFERENCES lyntra_analytics.pilot_weeks(week_id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES lyntra_analytics.courses(course_id) ON DELETE CASCADE,
    enrolled INTEGER DEFAULT 0, activated INTEGER DEFAULT 0, wau INTEGER DEFAULT 0, avg_sessions FLOAT DEFAULT 0.0,
    UNIQUE (week_id, course_id)
);

CREATE TABLE lyntra_analytics.task_metrics (
    id SERIAL PRIMARY KEY,
    week_id INTEGER REFERENCES lyntra_analytics.pilot_weeks(week_id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES lyntra_analytics.courses(course_id) ON DELETE CASCADE,
    total_assignments INTEGER DEFAULT 0, ai_broken_tasks INTEGER DEFAULT 0, breakdown_usage_rate FLOAT DEFAULT 0.0,
    UNIQUE (week_id, course_id)
);

CREATE TABLE lyntra_analytics.health (
    id SERIAL PRIMARY KEY,
    week_id INTEGER REFERENCES lyntra_analytics.pilot_weeks(week_id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES lyntra_analytics.courses(course_id) ON DELETE CASCADE,
    p1_bugs INTEGER DEFAULT 0, sync_errors INTEGER DEFAULT 0, total_syncs INTEGER DEFAULT 0,
    UNIQUE (week_id, course_id)
);

CREATE TABLE IF NOT EXISTS lyntra_analytics.stakeholder_access (
    email TEXT PRIMARY KEY, password_hash TEXT NOT NULL, role TEXT NOT NULL
);

INSERT INTO lyntra_analytics.stakeholder_access (email, password_hash, role)
VALUES ('shareholder@lyntra.com', 'lyntra-read-2026', 'read'), ('dev@lyntra.com', 'lyntra-write-2026', 'write')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE VIEW lyntra_analytics.v_dashboard_summary AS
SELECT 
    w.week_id, w.week_label, c.course_id, 
    COALESCE(c.course_name, 'Global Pilot') as course_name,
    COALESCE(c.professor_name, 'All Faculty') as professor_name,
    COALESCE(e.enrolled, 0) as enrolled, COALESCE(e.activated, 0) as activated,
    CASE WHEN COALESCE(e.enrolled, 0) > 0 THEN (e.activated::float / e.enrolled) * 100 ELSE 0 END as activation_rate,
    CASE WHEN COALESCE(e.enrolled, 0) > 0 THEN (COALESCE(e.wau, 0)::float / e.enrolled) * 100 ELSE 0 END as wau_rate,
    COALESCE(h.p1_bugs, 0) as critical_bugs,
    COALESCE(e.avg_sessions, 0) as avg_sessions
FROM lyntra_analytics.pilot_weeks w
CROSS JOIN (
    SELECT course_id, course_name, professor_name FROM lyntra_analytics.courses 
    UNION ALL 
    SELECT NULL as course_id, 'Global Pilot' as course_name, 'All Faculty' as professor_name
) c
LEFT JOIN lyntra_analytics.student_engagement e ON w.week_id = e.week_id AND (e.course_id IS NOT DISTINCT FROM c.course_id)
LEFT JOIN lyntra_analytics.health h ON w.week_id = h.week_id AND (h.course_id IS NOT DISTINCT FROM c.course_id);
"""

def setup():
    with engine.connect() as conn:
        conn.execute(text(SCHEMA))
        conn.commit()
    print("✅ Lyntra OS Infrastructure Online.")

if __name__ == "__main__":
    setup()