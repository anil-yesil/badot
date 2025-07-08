from flask import Blueprint, jsonify, request
from app.database.db_utils import get_connection
from flask_cors import CORS

from typing import List
from pymysql.cursors import DictCursor

bp = Blueprint('tickets', __name__, url_prefix='/api/tickets')
CORS(bp)  # this enables CORS for all routes by default

@bp.route('/all', methods=['GET'])
def get_tickets():
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM Ticket")
            tickets = cursor.fetchall()
        return jsonify(tickets)
    finally:
        connection.close()

@bp.route('/user_tickets/<int:user_id>', methods=['GET'])
def get_user_tickets(user_id):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM Ticket WHERE user_id = %s", (user_id,))
            tickets = cursor.fetchall()
            # If no tickets, return empty list (200 OK)
            if not tickets:
                return jsonify({"tickets": [], "message": "Okay, we don't have any tickets :)"}), 200

        return jsonify({"tickets": tickets}), 200
    finally:
        connection.close()


@bp.route('/<int:event_id>', methods=['GET'])
def get_available_seat_count(event_id):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT ticket_count
                FROM Event
                WHERE event_id = %s AND active_status = TRUE
            """, (event_id,))
            result = cursor.fetchone()

            if not result:
                return jsonify({"error": "Event not found or inactive"}), 404

            # Access based on type of result (tuple or dict)
            # Try dict key first, fallback to index 0
            seat_count = None
            if isinstance(result, dict):
                seat_count = result.get('ticket_count')
            elif isinstance(result, (list, tuple)):
                seat_count = result[0]
            else:
                # fallback or error
                seat_count = result  # maybe it's a scalar?

            if seat_count is None:
                return jsonify({"error": "ticket_count not found"}), 500

            return jsonify({"seats": seat_count})
    finally:
        conn.close()



@bp.route('/update_ticket_count', methods=['POST'])
def update_ticket_count():
    data = request.json
    event_id = data.get('event_id')
    guest_count = data.get('guest_count')

    if not event_id or not guest_count:
        return jsonify({'error': 'Missing event_id or guest_count'}), 400

    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE Event
                SET ticket_count = ticket_count - %s
                WHERE event_id = %s AND ticket_count >= %s
            """, (guest_count, event_id, guest_count))

            if cursor.rowcount == 0:
                return jsonify({'error': 'Not enough tickets or invalid event'}), 400

            conn.commit()
            return jsonify({'message': 'Ticket count updated successfully'})
    finally:
        conn.close()

# @bp.route("/select_seats", methods=["POST"])
# def select_seats():
#     data = request.get_json()
#     ticket_ids = data.get("ticket_ids", [])
    
#     # Validate input
#     if not isinstance(ticket_ids, list) or not all(isinstance(tid, int) for tid in ticket_ids):
#         return jsonify({"error": "ticket_ids must be a list of integers"}), 400
    
#     conn = None
#     try:
#         conn = get_connection()
#         with conn.cursor(DictCursor) as cur: # makes cur.fetchone return a dict
#             # Check all tickets are available first
#             for tid in ticket_ids:
#                 cur.execute("SELECT status FROM Ticket WHERE ticket_id = %s", (tid,))
#                 row = cur.fetchone()
#                 if not row:
#                     return jsonify({"error": f"Ticket {tid} not found"}), 404
#                 if row["status"] != "Available":
#                     return jsonify({"error": f"Ticket {tid} is not available"}), 400

#             # Update tickets to 'Booked'
#             for tid in ticket_ids:
#                 cur.execute("UPDATE Ticket SET status = 'Booked' WHERE ticket_id = %s", (tid,))

#         conn.commit()
#         return jsonify({"message": "Seats selected"}), 200

#     except Exception as e:
#         if conn:
#             conn.rollback()
#         print(f"Error in select_seats: {e}")  # Log the error
#         return jsonify({"error occurred in select seats": str(e)}), 500

#     finally:
#         if conn:
#             conn.close()
import sys
@bp.route('/fill_guest_info', methods=['POST'])
def fill_guest_info():
    print("helloooooooooooo123", file=sys.stdout, flush=True)
    print("=== REQUEST RECEIVED ===", file=sys.stdout, flush=True)
    print("request.data:", request.data, file=sys.stdout, flush=True)
    print("request.json:", request.json, file=sys.stdout, flush=True)

    data = request.json
    print("h1:", file=sys.stdout, flush=True)

    # user_id is required
    user_id = data.get('user_id')
    if not user_id:
        print("No user_id received, data:", data, file=sys.stdout, flush=True)
        return jsonify({'error': 'Missing field user_id'}), 400
    print("h2:", file=sys.stdout, flush=True)

    # Helper to safely convert to int or return error if required
    def safe_int(field_name, required=True):
        val = data.get(field_name)
        if val is None:
            if required:
                raise ValueError(f'Missing field {field_name}')
            else:
                return None
        try:
            return int(val)
        except (ValueError, TypeError):
            raise ValueError(f'Invalid integer for field {field_name}')

    try:
        street_no = safe_int('street_no', required=False)  # optional
        age = safe_int('age', required=False)  # optional
        budget = safe_int('budget', required=False)  # optional
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    street_name = data.get('street_name')  # optional, can be None
    apartment = data.get('apartment')      # optional, can be None
    city = data.get('city')                 # optional, can be None
    state = data.get('state')               # optional, can be None
    zip_code = data.get('zip')              # optional, can be None
    date_of_birth = data.get('date_of_birth')  # optional, can be None

    print("h3:", file=sys.stdout, flush=True)

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO Event_Attendee 
                (user_id, street_no, street_name, apartment, city, state, zip, date_of_birth, age, budget)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    street_no = VALUES(street_no),
                    street_name = VALUES(street_name),
                    apartment = VALUES(apartment),
                    city = VALUES(city),
                    state = VALUES(state),
                    zip = VALUES(zip),
                    date_of_birth = VALUES(date_of_birth),
                    age = VALUES(age),
                    budget = VALUES(budget)
            """, (user_id, street_no, street_name, apartment, city, state, zip_code, date_of_birth, age, budget))
        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

    return jsonify({"message": "Guest info saved"}), 200


import traceback

from datetime import datetime
import traceback
import sys

@bp.route('/create_bulk', methods=['POST'])
def create_bulk_tickets():
    print("h7:", file=sys.stdout, flush=True)

    data = request.get_json()
    conn = get_connection()
    if not isinstance(data, list):
        return jsonify({"error": "Request body must be a list of tickets"}), 400

    try:
        cursor = conn.cursor()

        payment_query = """
            INSERT INTO Payment (amount, date, method, user_id)
            VALUES (%s, %s, %s, %s)
        """
        ticket_query = """
            INSERT INTO Ticket (
                event_id, column_num, row_num, seat_number, seating_category,
                price, name, status, QR_code, payment_id, user_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        for ticket in data:
            column_num = ticket.get('column_num', 0)
            row_num = ticket.get('row_num', 0)
            seat_number = ticket.get('seat_number', 0)
            qr_code = ticket.get('QR_code')
            # Extract payment info from ticket or set defaults
            payment_amount = ticket['price']
            payment_date = datetime.now()
            payment_method = ticket.get('payment_method', 'CreditCard')  # default or from frontend
            payment_user_id = ticket.get('user_id')  # you need to pass user_id for payment
            
            print("payment_user_id: ",payment_user_id, file=sys.stdout, flush=True)            # Insert payment first
            
            cursor.execute(payment_query, (
                payment_amount,
                payment_date,
                payment_method,
                payment_user_id
            ))
            payment_id = cursor.lastrowid  # get inserted payment_id
           
            print("payment_id: ",payment_id, file=sys.stdout, flush=True)
            # Insert ticket with payment_id
            cursor.execute(ticket_query, (
                ticket['event_id'],
                column_num,
                row_num,
                seat_number,
                ticket['seating_category'],
                payment_amount,
                ticket.get('name'),
                ticket.get('status', 'Booked'),
                qr_code,
                payment_id,
                ticket.get('user_id')
            ))

        conn.commit()
        return jsonify({"payment_id": payment_id , "message": f"{len(data)} tickets and payments created successfully."}), 201

    except Exception as e:
        conn.rollback()
        print("Exception in create_bulk_tickets:", file=sys.stderr)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# @bp.route('/payment', methods=['POST'])
# def payment():
#     data = request.json
#     user_id = data.get('user_id')
#     ticket_ids = data.get('ticket_ids')
#     amount = data.get('amount')
#     method = data.get('method')

#     # Validate inputs here...

#     conn = get_connection()
#     try:
#         with conn.cursor() as cur:
#             # 1) Insert payment record (if you have a separate payment table)
#             cur.execute("""
#                 INSERT INTO Payment (user_id, amount, method)
#                 VALUES (%s, %s, %s)
#             """, (user_id, amount, method))
            
#             payment_id = cur.lastrowid  # get inserted payment id


#         conn.commit()
#         return jsonify({"message": "Payment successful"}), 200
#     except Exception as e:
#         conn.rollback()
#         return jsonify({"error": str(e)}), 500
#     finally:
#         conn.close()