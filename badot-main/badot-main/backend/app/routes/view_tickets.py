# backend/app/routes/view_tickets.py

from flask import Blueprint, jsonify
from app.database.db_utils import get_connection

bp = Blueprint('viewTickets', __name__, url_prefix='/api/users')

@bp.route('/<int:user_id>/tickets', methods=['GET'])
def list_user_tickets(user_id):
    """
    Returns all BOOKED tickets for a given attendee (via the Book table),
    complete with event name, date, seat & QR.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                  t.ticket_id,
                  t.seat_number,
                  t.QR_code,
                  e.event_id,
                  e.name       AS event_name,
                  e.date       AS event_date
                FROM Book b
                JOIN Ticket t   ON t.ticket_id = b.ticket_id
                JOIN Event e    ON e.event_id   = t.event_id
                WHERE b.user_id = %s
                  AND t.status = 'Booked'
                ORDER BY e.date DESC
            """, (user_id,))

            tickets = cur.fetchall()

        # format dates for JSON
        for row in tickets:
            if hasattr(row['event_date'], 'strftime'):
                row['event_date'] = row['event_date'].strftime('%Y-%m-%d %H:%M:%S')
        return jsonify(tickets)
    finally:
        conn.close()
