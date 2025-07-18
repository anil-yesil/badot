import React from "react";
import { Link } from "react-router-dom";
import "../styles/homepage.css";
import "../styles/eventcard.css";

const EventCard = ({ event }) => {
  const formatEventDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString; 
    }
  };

  return (
    <div className="event-card">
      <img
        src={`http://localhost:5000${event.image_url.startsWith('/') ? event.image_url : '/' + event.image_url}`}
        alt={event.name}
        className="event-image"
      />
      <div className="event-content">
        <h3>{event.name}</h3>
        <p className="event-date">{formatEventDate(event.date)}, {event.venue_city}</p>
        <p className="event-venue">{event.venue_name}</p>
        <Link to={`/events/${event.event_id}`} className="event-link">View Details</Link>
      </div>
    </div>
  );
};

export default EventCard;