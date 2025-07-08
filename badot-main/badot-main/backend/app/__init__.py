from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object('app.config.Config')
    print("App created")
    CORS(app)
    db.init_app(app)

    # Register existing blueprints
    from app.routes import events # This is your /api/event/all endpoint
    app.register_blueprint(events.bp)

    from app.routes import auth_routes
    app.register_blueprint(auth_routes.auth_bp)

    from app.routes.image_upload import upload_bp
    app.register_blueprint(upload_bp)

    from app.routes.venues import bp
    app.register_blueprint(bp)

    from app.routes.transactions import bp as transactions_bp
    app.register_blueprint(transactions_bp)

    from app.routes.view_tickets import bp as view_tickets_bp
    app.register_blueprint(view_tickets_bp)

    from app.routes.reports import bp as rpt_bp
    app.register_blueprint(rpt_bp)


    # registering TICKET blueprint here
    from app.routes.tickets import bp as ticket_bp
    app.register_blueprint(ticket_bp)


    # --- Register the NEW event_details blueprint ---
    from app.routes.event_details import bp as event_details_bp
    app.register_blueprint(event_details_bp)

    # --- Register the RENAMED/REFACTORED feedback blueprint ---
    from app.routes.feedback import bp as feedback_bp
    app.register_blueprint(feedback_bp)
    
    from app.routes import follow
    app.register_blueprint(follow.bp)

    # Create tables (only affects SQLAlchemy-managed models)
    with app.app_context():
        db.create_all()

    return app
