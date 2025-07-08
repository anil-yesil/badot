// EventInfo.js
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; 
import '../styles/eventinfo.css';
import '../styles/homepage.css'; 
import { useAuth } from '../context/AuthContext';

export default function EventInfo() {
  const { event_id } = useParams();
  const navigate = useNavigate(); 
  const { user, logout } = useAuth(); 

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Handle user logout (copied from Homepage)
  const handleLogout = () => {
    logout();
    localStorage.removeItem('token'); 
    localStorage.removeItem('currentUser'); 
    navigate('/'); 
  };

  useEffect(() => {
    if (!event_id) {
      setError("Event ID is missing.");
      setLoading(false);
      return;
    }

    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`http://localhost:5000/api/event_details/${event_id}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Event not found.');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setEventData(data);
      } catch (e) {
        console.error("Failed to fetch event details:", e);
        setError(`Failed to load event: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [event_id]);

if (loading) {
  return <div className="event-info-container loading">Loading event details...</div>;
}

if (error) {
  return <div className="event-info-container error">Error: {error}</div>;
}

if (!eventData || !eventData.event) {
  return <div className="event-info-container not-found">Event data not available.</div>;
}

  const { event, lowestPrice, availableCapacity } = eventData;

  const formatDateTime = (dateTimeString) => {
    try {
      const options = {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
      };
      return new Date(dateTimeString).toLocaleString('en-US', options);
    } catch (e) {
      return dateTimeString;
    }
  };

  const fullImageUrl = event.image_url
    ? `http://localhost:5000${event.image_url.startsWith('/') ? event.image_url : '/' + event.image_url}`
    : null;

  const displayRating = typeof event.rating === 'string'
    ? parseFloat(event.rating)
    : event.rating;

  return (
    <>
      <div className="event-info-container">
        <header className="event-info-header">
          <h1 className="event-title">{event.name}</h1>
          <p className="event-type">{event.type}</p>
          <p className="event-rating">
            Rating: {
              typeof displayRating === 'number' && !isNaN(displayRating)
                ? `${displayRating.toFixed(1)}/5`
                : 'N/A'
            }
          </p>
        </header>

        <div className="event-details-main">
          <div className="event-image-section">
            {fullImageUrl ? (
              <img src={fullImageUrl} alt={event.name} className="event-main-image" />
            ) : (
              <div className="event-no-image">No Image Available</div>
            )}
          </div>

          <div className="event-info-card">
            <h2>Event Information</h2>
            <p><strong>Date & Time:</strong> {formatDateTime(event.date)}</p>
            <p><strong>Description:</strong> {event.description}</p>
            <p><strong>Rules:</strong> {event.rules || 'N/A'}</p>
            <p><strong>Status:</strong> {event.active_status ? 'Active' : 'Inactive'}</p>
          </div>

          <div className="venue-info-card">
            <h2>Venue Details</h2>
            <p><strong>Venue:</strong> {event.venue_name}</p>
            <p><strong>Location:</strong> {event.venue_location} ({event.venue_city}, {event.venue_state}, {event.venue_zip})</p>
            <p><strong>Address:</strong> {event.venue_street_no} {event.venue_street_name}{event.venue_apartment ? `, Apt ${event.venue_apartment}` : ''}</p> 
            <p><strong>Capacity:</strong> {event.venue_capacity}</p>
            <p><strong>Available Seats:</strong> {availableCapacity}</p>
          </div>

          <div className="ticket-info-card">
            <h2>Ticket Information</h2>
            {typeof lowestPrice === 'number' ? (
              <p className="lowest-price">Tickets from: ${lowestPrice.toFixed(2)}</p>
            ) : (
              <p>No tickets available yet or price not specified.</p>
            )}
        <Link to={`/buy_ticket/${event_id}`} >
                      <button className="buy-tickets-btn">Buy Tickets</button>
        </Link>
            {/* <button className="buy-tickets-btn">Buy Tickets</button> */}


          </div>
        </div>

        <div className="feedback-button-section">
          <Link to={`/events/${event_id}/feedback`} className="btn feedback-btn">
            View / Add Feedback
          </Link>
        </div>

      </div>
    </>
  );
}