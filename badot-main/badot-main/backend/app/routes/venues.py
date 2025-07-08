from flask import Blueprint, jsonify, request
from app.database.db_utils import get_connection

bp = Blueprint('venue', __name__, url_prefix='/api/venue')

@bp.route('/venues', methods=['GET'])
def get_venues():
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT venue_id, name, city FROM Venue")
            venues = cursor.fetchall()
            return jsonify(venues), 200
    finally:
        connection.close()
@bp.route('/capacity', methods=['GET'])
def get_capacaity():
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT venue_id, capacity FROM Venue")
            venues = cursor.fetchall()
            return jsonify(venues), 200
    finally:
        connection.close()