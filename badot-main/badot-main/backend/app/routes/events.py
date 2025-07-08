from flask import Blueprint, jsonify, request
from app.database.db_utils import get_connection
from app.utils.jwt_utils import token_required, role_required

bp = Blueprint('event', __name__, url_prefix='/api/event')

@bp.route('/all', methods=['GET'])
def get_events():
    """
    GET /api/event/all?
      q=rock&
      location=Istanbul&
      date=2025-05-24&
      type=Concert&
      page=2
    """
    q       = request.args.get('q')
    loc     = request.args.get('location')
    typ     = request.args.get('type')
    date    = request.args.get('date')
    page    = int(request.args.get('page', 1))
    page_size = 50
    offset  = (page - 1) * page_size

    where, params = [], []
    if q:
        where.append("e.name LIKE %s")
        params.append(f"%{q}%")
    if loc:
        where.append("v.location LIKE %s")
        params.append(f"%{loc}%")
    if typ:
        where.append("e.type = %s")
        params.append(typ)
    if date:
        where.append("DATE(e.date) = %s")
        params.append(date)

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""

    count_sql = f"""
      SELECT COUNT(*) AS total
      FROM Event e
      JOIN Venue v ON e.venue_id = v.venue_id
      {where_sql}
    """
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(count_sql, tuple(params))
            total = cursor.fetchone()['total']

            data_sql = f"""
              SELECT
                e.event_id, e.name, e.type, e.date, e.description,
                e.active_status, e.rating, e.user_id, e.venue_id,
                e.rules, e.image_url,
                v.name   AS venue_name,
                v.city   AS venue_city,
                v.state  AS venue_state,
                v.location AS venue_location
              FROM Event e
              JOIN Venue v ON e.venue_id = v.venue_id
              {where_sql}
              ORDER BY e.date DESC
              LIMIT %s OFFSET %s
            """
            cursor.execute(data_sql, tuple(params + [page_size, offset]))
            events = cursor.fetchall()

            for ev in events:
                if not isinstance(ev['date'], str):
                    ev['date'] = ev['date'].strftime('%Y-%m-%d %H:%M:%S')

        return jsonify({
            'total':     total,
            'page':      page,
            'pageSize':  page_size,
            'events':    events
        }), 200

    finally:
        conn.close()

@bp.route('/<int:event_id>', methods=['GET'])
def get_event(event_id):
    """
    GET /api/event/<event_id>
    """
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                  e.event_id,
                  e.name,
                  e.type,
                  e.date,
                  e.description,
                  e.active_status,
                  e.rating,
                  e.rules,
                  e.image_url,
                  v.name   AS venue_name,
                  v.location       AS venue_location,
                  CONCAT(v.street_no, ' ', v.street_name) AS venue_address,
                  v.city   AS venue_city,
                  v.state  AS venue_state,
                  v.zip    AS venue_zip,
                  v.capacity AS venue_capacity
                FROM Event e
                JOIN Venue v ON e.venue_id = v.venue_id
                WHERE e.event_id = %s
            """, (event_id,))
            event = cursor.fetchone()
            if not event:
                return jsonify({'error': 'Event not found'}), 404

            if not isinstance(event['date'], str):
                event['date'] = event['date'].strftime('%Y-%m-%d %H:%M:%S')

            cursor.execute("""
                SELECT MIN(price) AS lowest_price
                FROM Ticket
                WHERE event_id = %s
                  AND status = 'AVAILABLE'
            """, (event_id,))
            lowest = cursor.fetchone()['lowest_price']

            cursor.execute("""
                SELECT
                  v.capacity
                  - IFNULL((
                      SELECT COUNT(*)
                      FROM Book b
                      JOIN Ticket t ON b.ticket_id = t.ticket_id
                      WHERE t.event_id = %s
                  ), 0) AS available_capacity
                FROM Venue v
                JOIN Event e ON v.venue_id = e.venue_id
                WHERE e.event_id = %s
            """, (event_id, event_id))
            available = cursor.fetchone()['available_capacity']

            cursor.execute("""
                SELECT
                  f.user_id,
                  f.rate,
                  f.comment
                FROM Feedback f
                WHERE f.event_id = %s
                ORDER BY f.rate DESC
            """, (event_id,))
            feedback = cursor.fetchall()

        return jsonify({
            'event':            event,
            'lowestPrice':      lowest,
            'availableCapacity': available,
            'feedback':         feedback
        }), 200

    finally:
        conn.close()


@bp.route('/locations', methods=['GET'])
def get_locations():
    """
    GET /api/event/locations
    """
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT DISTINCT location FROM Venue ORDER BY location")
            rows = cursor.fetchall()
            locations = [r['location'] for r in rows]
        return jsonify(locations), 200
    finally:
        conn.close()




@bp.route('/create', methods=['POST'])
@token_required
@role_required("Organizer","Attendee","Admin")
def create_event():
    data = request.get_json()

    required_fields = [
        'name', 'type', 'date', 'description', 'active_status',
        'rating', 'user_id', 'venue_id', 'rules', 'image_url', 'ticket_count'
    ]
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    try:
        ticket_count = int(data['ticket_count'])
        if ticket_count <= 0:
            return jsonify({'error': 'Ticket count must be greater than 0'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid ticket count'}), 400

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            # 1. Insert the event
            cursor.execute("SELECT capacity FROM Venue WHERE venue_id = %s", (data['venue_id'],))
            result = cursor.fetchone()
            if not result:
                return jsonify({'error': 'Venue not found'}), 404
            
            venue_capacity = result['capacity']
            if ticket_count > venue_capacity:
                return jsonify({'error': f'Ticket count exceeds venue capacity ({venue_capacity})'}), 400

            insert_event_query = """
                INSERT INTO Event (
                    name, type, date, description, active_status, rating,
                    user_id, venue_id, rules, image_url, ticket_count
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(insert_event_query, (
                data['name'],
                data['type'],
                data['date'],
                data['description'],
                data['active_status'],
                data['rating'],
                data['user_id'],
                data['venue_id'],
                data['rules'],
                data['image_url'],
                data['ticket_count']
            ))
            event_id = cursor.lastrowid 

            connection.commit()
            return jsonify({'message': f'Event created successfully'}), 201
    finally:
        connection.close()

