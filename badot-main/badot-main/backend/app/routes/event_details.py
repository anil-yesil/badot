from flask import Blueprint, jsonify
from app.database.db_utils import get_connection

bp = Blueprint("event_details", __name__, url_prefix="/api/event_details")


@bp.route("/<int:event_id>", methods=["GET"])
def get_single_event_details(event_id):
    """
    GET /api/event_details/123
    → Return one event's detailed information including venue and calculated rating.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  e.event_id,
                  e.name,
                  e.type,
                  e.date,
                  e.description,
                  e.active_status,
                  e.rules,         -- Added rules
                  e.image_url,     -- Added image_url
                  COALESCE(AVG(f.rate), 0) AS rating, -- Calculated rating
                  v.name            AS venue_name,
                  v.city            AS venue_city,
                  v.state           AS venue_state,
                  v.location        AS venue_location,
                  CONCAT(v.street_no, ' ', v.street_name) AS venue_address,
                  v.zip             AS venue_zip,
                  v.capacity        AS venue_capacity,
                  (v.capacity - COALESCE((SELECT COUNT(t.ticket_id) FROM Ticket t WHERE t.event_id = e.event_id AND t.status = 'SOLD'), 0)) AS available_capacity,
                  COALESCE(MIN(tk.price), NULL) AS lowest_price -- Lowest available ticket price
                FROM Event e
                JOIN Venue v ON e.venue_id = v.venue_id
                LEFT JOIN Feedback f ON f.event_id = e.event_id
                LEFT JOIN Ticket tk ON tk.event_id = e.event_id AND tk.status = 'AVAILABLE' -- Only available tickets for lowest price
                WHERE e.event_id = %s
                GROUP BY e.event_id, v.venue_id
                """,
                (event_id,),
            )
            event_details = cur.fetchone()

            if not event_details:
                return jsonify({"error": "Event not found"}), 404

            if hasattr(event_details["date"], "strftime"):
                event_details["date"] = event_details["date"].strftime("%Y-%m-%d %H:%M:%S")
            response_data = {
                'event': event_details,
                'lowestPrice': event_details['lowest_price'], 
                'availableCapacity': event_details['available_capacity'],

            }

            return jsonify(response_data)
    finally:
        conn.close()