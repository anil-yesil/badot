from flask import Blueprint, jsonify, request
from app.database.db_utils import get_connection

bp = Blueprint("feedback", __name__, url_prefix="/api/feedback")


@bp.route("/<int:event_id>", methods=["GET"])
def list_feedback(event_id):
    """
    GET /api/feedback/123
    → Return all feedback entries for that event_id
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    f.user_id,
                    f.rate          AS rating,
                    f.comment,
                    CONCAT(u.first_name, ' ', u.last_name) AS attendee_name
                FROM Feedback AS f
                JOIN User AS u ON u.user_id = f.user_id
                WHERE f.event_id = %s
                ORDER BY f.user_id
                """,
                (event_id,),
            )
            feedback = cur.fetchall()
        return jsonify(feedback)
    finally:
        conn.close()


@bp.route("/<int:event_id>", methods=["POST"])
def post_feedback(event_id):
    """
    POST /api/feedback/123
    Body: { "user_id": 4, "rating": 4, "comment": "Nice event!" }
    → Insert a new feedback record
    """
    payload = request.get_json()
    required_fields = ("user_id", "rating", "comment")
    if not all(field in payload for field in required_fields):
        return jsonify({"error": f"Missing required fields. Needs: {', '.join(required_fields)}"}), 400

    user_id = payload["user_id"] 

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_id FROM Event_Attendee WHERE user_id = %s",
                (user_id,)
            )
            is_attendee_in_table = cur.fetchone()

            if not is_attendee_in_table:
                return jsonify({"error": "You must be registered as an event attendee to submit feedback."}), 403

            cur.execute(
                """
                INSERT INTO Feedback (user_id, event_id, rate, comment)
                VALUES (%s, %s, %s, %s)
                """,
                (user_id, event_id, payload["rating"], payload["comment"]),
            )
        conn.commit()
        return jsonify({"message": "Feedback added"}), 201
    except Exception as e:
        conn.rollback()
        if "1452" in str(e): 
             return jsonify({"error": "Failed to add feedback. Ensure you are registered as an attendee for events."}), 400
        return jsonify({"error": f"Failed to add feedback: {str(e)}"}), 500
    finally:
        conn.close()


@bp.route("/<int:event_id>", methods=["PUT"])
def update_feedback(event_id):
    payload = request.get_json()
    required_fields = ("user_id", "rating", "comment")
    if not all(field in payload for field in required_fields):
        return jsonify({"error": f"Missing required fields. Needs: {', '.join(required_fields)}"}), 400

    user_id = payload["user_id"]

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_id FROM Event_Attendee WHERE user_id = %s",
                (user_id,)
            )
            is_attendee_in_table = cur.fetchone()

            if not is_attendee_in_table:
                return jsonify({"error": "Only attendees can update feedback."}), 403

            cur.execute(
                """
                UPDATE Feedback
                SET rate = %s, comment = %s
                WHERE event_id = %s AND user_id = %s
                """,
                (payload["rating"], payload["comment"], event_id, user_id),
            )
        conn.commit()
        if cur.rowcount == 0:
            return jsonify({"message": "Your feedback not found or not updated for this event."}), 404
        return jsonify({"message": "Feedback updated"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Failed to update feedback: {str(e)}"}), 500
    finally:
        conn.close()


@bp.route("/<int:event_id>", methods=["DELETE"])
def delete_feedback(event_id):
    payload = request.get_json()
    required_fields = ("user_id",)
    if not all(field in payload for field in required_fields):
        return jsonify({"error": f"Missing required fields. Needs: {', '.join(required_fields)}"}), 400

    user_id = payload["user_id"]

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_id FROM Event_Attendee WHERE user_id = %s",
                (user_id,)
            )
            is_attendee_in_table = cur.fetchone()

            if not is_attendee_in_table:
                return jsonify({"error": "Only attendees can delete feedback."}), 403

            cur.execute(
                """
                DELETE FROM Feedback
                WHERE event_id = %s AND user_id = %s
                """,
                (event_id, user_id),
            )
        conn.commit()
        if cur.rowcount == 0:
            return jsonify({"message": "Your feedback not found or not deleted for this event."}), 404
        return jsonify({"message": "Feedback deleted"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Failed to delete feedback: {str(e)}"}), 500
    finally:
        conn.close()