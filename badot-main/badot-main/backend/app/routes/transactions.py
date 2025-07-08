# backend/app/routes/transactions.py

from flask import Blueprint, jsonify, request, send_file
from decimal import Decimal, InvalidOperation
import qrcode, io, base64
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from app.database.db_utils import get_connection

bp = Blueprint('transactions', __name__, url_prefix='/api/transactions')

def make_qr_data_url(data: str) -> str:
    img = qrcode.make(data)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"

@bp.route('', methods=['POST'])
def create_transaction():
    data       = request.get_json() or {}
    user_id    = data.get('user_id')
    ticket_ids = data.get('ticket_ids')
    total_raw  = data.get('total')

    if not user_id or not isinstance(ticket_ids, list) or total_raw is None:
        return jsonify({'error': 'Missing user_id, ticket_ids or total'}), 400

    try:
        total = Decimal(str(total_raw))
    except (InvalidOperation, ValueError):
        return jsonify({'error': 'Invalid total amount'}), 400

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # lock & check budget
            cur.execute("SELECT budget FROM Event_Attendee WHERE user_id=%s FOR UPDATE", (user_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({'error': 'Attendee not found'}), 404
            if Decimal(str(row['budget'])) < total:
                return jsonify({'error': 'Insufficient funds'}), 400

            # deduct budget
            cur.execute("UPDATE Event_Attendee SET budget = budget - %s WHERE user_id=%s", (total, user_id))

            # make payment
            cur.execute(
                "INSERT INTO Payment (amount, date, method, status, user_id) "
                "VALUES (%s, NOW(), %s, 'Completed', %s)",
                (total, 'CreditCard', user_id)
            )
            payment_id = cur.lastrowid

            # for each ticket: lock, QR, update + book
            for tid in ticket_ids:
                cur.execute("SELECT event_id FROM Ticket WHERE ticket_id=%s FOR UPDATE", (tid,))
                trow = cur.fetchone()
                if not trow:
                    conn.rollback()
                    return jsonify({'error': f'Ticket {tid} not found'}), 404

                qr_payload = f"{payment_id}-{tid}"
                qr_url     = make_qr_data_url(qr_payload)

                cur.execute(
                    "UPDATE Ticket SET status='Booked', payment_id=%s, QR_code=%s WHERE ticket_id=%s",
                    (payment_id, qr_url, tid)
                )
                cur.execute(
                    "INSERT INTO Book (user_id, ticket_id, event_id) VALUES (%s, %s, %s)",
                    (user_id, tid, trow['event_id'])
                )

        conn.commit()
        return jsonify({'payment_id': payment_id}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500

    finally:
        conn.close()

@bp.route('/<int:payment_id>', methods=['GET'])
def get_transaction(payment_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT p.payment_id,p.amount,p.date,u.first_name,u.last_name "
                "FROM Payment p JOIN User u ON u.user_id=p.user_id WHERE p.payment_id=%s",
                (payment_id,)
            )
            txn = cur.fetchone()
            if not txn:
                return jsonify({'error':'Not found'}), 404

            cur.execute(
                "SELECT t.ticket_id,e.name AS event_name,t.seat_number,t.QR_code "
                "FROM Ticket t JOIN Event e ON e.event_id=t.event_id WHERE t.payment_id=%s",
                (payment_id,)
            )
            tickets = cur.fetchall()

        if hasattr(txn['date'], 'strftime'):
            txn['date'] = txn['date'].strftime('%Y-%m-%d %H:%M:%S')
        txn['tickets'] = tickets
        return jsonify(txn)
    finally:
        conn.close()

@bp.route('/<int:payment_id>/download', methods=['GET'])
def download_pdf(payment_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # header
            cur.execute(
                "SELECT p.payment_id,p.amount,p.date,u.first_name,u.last_name "
                "FROM Payment p JOIN User u ON u.user_id=p.user_id WHERE p.payment_id=%s",
                (payment_id,)
            )
            txn = cur.fetchone()
            if not txn:
                return jsonify({'error':'Not found'}), 404

            # tickets
            cur.execute(
                "SELECT e.name AS event_name,t.seat_number,t.QR_code "
                "FROM Ticket t JOIN Event e ON e.event_id=t.event_id WHERE t.payment_id=%s",
                (payment_id,)
            )
            tickets = cur.fetchall()

        # build PDF
        buf = io.BytesIO()
        c   = canvas.Canvas(buf, pagesize=letter)
        w,h = letter
        y   = h - 50

        c.setFont("Helvetica-Bold",16)
        c.drawString(50, y, f"Transaction #{payment_id}")
        y -= 30

        c.setFont("Helvetica",12)
        c.drawString(50, y, f"Name: {txn['first_name']} {txn['last_name']}")
        y -= 20
        c.drawString(50, y, f"Total Paid: ${txn['amount']}")
        y -= 40

        for t in tickets:
            if y < 120:
                c.showPage()
                y = h - 50

            c.setFont("Helvetica-Bold",14)
            c.drawString(50, y, t['event_name'])
            y -= 18
            c.setFont("Helvetica",12)
            c.drawString(50, y, f"Seat #{t['seat_number']}")
            y -= 12

            if t['QR_code'] and t['QR_code'].startswith('data:image/png;base64,'):
                b64     = t['QR_code'].split(',',1)[1]
                img_buf = io.BytesIO(base64.b64decode(b64))
                img     = ImageReader(img_buf)
                c.drawImage(img, 400, y-10, width=100, height=100)

            y -= 120
            c.line(50, y, w-50, y)
            y -= 20

        c.save()
        buf.seek(0)

        return send_file(
            buf,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'tickets_{payment_id}.pdf'
        )
    finally:
        conn.close()
