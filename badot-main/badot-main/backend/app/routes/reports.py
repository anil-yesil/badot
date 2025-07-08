# backend/app/routes/reports.py
from flask import Blueprint, jsonify, request
from app.database.db_utils import get_connection

bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@bp.route('', methods=['GET'])
def list_reports():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
              SELECT r.report_id,
                     r.date,
                     r.type,
                     r.description,
                     r.user_id,
                     u.first_name,
                     u.last_name
                FROM Report r
                JOIN User u ON u.user_id = r.user_id
               ORDER BY r.report_id DESC
            """)
            rows = cur.fetchall()
        return jsonify(rows)
    finally:
        conn.close()

@bp.route('/<int:report_id>', methods=['GET'])
def get_report(report_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
              SELECT r.report_id,
                     r.date,
                     r.type,
                     r.description,
                     r.user_id,
                     u.first_name,
                     u.last_name
                FROM Report r
                JOIN User u ON u.user_id = r.user_id
               WHERE r.report_id = %s
            """, (report_id,))
            rpt = cur.fetchone()
            if not rpt:
                return jsonify({'error':'Report not found'}), 404
        return jsonify(rpt)
    finally:
        conn.close()

# in routes/reports.py
@bp.route('', methods=['POST'])
def create_report():
    data = request.get_json() or {}
    admin_id    = data.get('admin_id')        # match JSON key
    report_type = data.get('type')
    desc        = data.get('description')

    if not admin_id or not report_type or not desc:
        return jsonify({'error':'Missing admin_id/type/description'}), 400

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO Report (date, type, description, user_id) "
                "VALUES (CURDATE(), %s, %s, %s)",
                (report_type, desc, admin_id)     # note user_id = admin_id
            )
            report_id = cur.lastrowid
        conn.commit()
        return jsonify({'report_id': report_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error':str(e)}), 500
    finally:
        conn.close()
