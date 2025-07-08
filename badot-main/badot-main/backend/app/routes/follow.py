from flask import Blueprint, request, jsonify
from app.utils.jwt_utils import decode_token
from app.database.db_utils import get_connection

bp = Blueprint("follow", __name__, url_prefix="/api")

@bp.route("/follow-count", methods=["GET"])
def get_follow_count():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_info = decode_token(token)
    if not user_info:
        return jsonify({"error": "Unauthorized"}), 401

    user_id = user_info["user_id"]
    role = user_info["role"]

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            if role == "Attendee":
                cursor.execute("SELECT COUNT(*) AS count FROM Follow WHERE event_attendee_id = %s", (user_id,))
            elif role == "Organizer":
                cursor.execute("SELECT COUNT(*) AS count FROM Follow WHERE event_organizer_id = %s", (user_id,))
            else:
                return jsonify({"count": 0})
            result = cursor.fetchone()
            return jsonify({"count": result["count"]})
    finally:
        connection.close()
