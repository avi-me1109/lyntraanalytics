from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, text
import os

app = Flask(__name__)
CORS(app)
engine = create_engine(os.getenv("DATABASE_URL", "postgresql://lyntraAdmin:lyntra-2026@localhost:5432/lyntra_analytics"))

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    q = text("SELECT role FROM lyntra_analytics.stakeholder_access WHERE email = :e AND password_hash = :p")
    with engine.connect() as conn:
        res = conn.execute(q, {"e": data['email'], "p": data['password']}).fetchone()
    return jsonify({"role": res[0]}) if res else (jsonify({"error": "Unauthorized"}), 401)

@app.route('/api/admin/summary', methods=['GET'])
def get_summary():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT * FROM lyntra_analytics.v_dashboard_summary ORDER BY week_id ASC"))
        return jsonify([dict(row._mapping) for row in res])

@app.route('/api/admin/update', methods=['POST'])
def update():
    data = request.json
    table_map = {'enrolled': 'student_engagement', 'activated': 'student_engagement', 'wau': 'student_engagement', 'p1_bugs': 'health'}
    target = table_map.get(data['metric'])
    q = text(f"INSERT INTO lyntra_analytics.{target} (week_id, course_id, {data['metric']}) VALUES (:w, :c, :v) ON CONFLICT (week_id, course_id) DO UPDATE SET {data['metric']} = EXCLUDED.{data['metric']}")
    with engine.connect() as conn:
        conn.execute(q, {"w": data['week_id'], "c": data['course_id'], "v": data['value']})
        conn.commit()
    return jsonify({"status": "success"})

@app.route('/api/admin/structure', methods=['POST', 'DELETE'])
def manage_structure():
    try:
        data = request.json if request.method == 'POST' else request.args
        is_week = data.get('type') == 'week'
        if request.method == 'POST':
            if is_week:
                q = text("INSERT INTO lyntra_analytics.pilot_weeks (week_label) VALUES (:label)")
                params = {"label": data.get('label')}
            else:
                q = text("INSERT INTO lyntra_analytics.courses (course_name, professor_name) VALUES (:name, :prof)")
                params = {"name": data.get('name'), "prof": data.get('prof', 'TBD')}
        else:
            table = "pilot_weeks" if is_week else "courses"
            col = "week_id" if is_week else "course_id"
            q = text(f"DELETE FROM lyntra_analytics.{table} WHERE {col} = :id")
            params = {"id": data.get('id')}
        
        with engine.connect() as conn:
            conn.execute(q, params)
            conn.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Structure Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)