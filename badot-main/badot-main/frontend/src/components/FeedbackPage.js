import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../styles/feedbackpage.css'; 
import { useAuth } from '../context/AuthContext'; 

const FeedbackPage = () => {
  const { event_id } = useParams();
  const { user } = useAuth();

  const currentUserId = user ? user.user_id : null;
  const userRole = user ? user.role : null;

  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventDetails, setEventDetails] = useState(null);

  const [form, setForm] = useState({ comment: '', rating: 5 }); 
  const [editForm, setEditForm] = useState({ comment: '', rating: 5 });
  const [editMode, setEditMode] = useState(false); 

  const [hasUserSubmittedFeedback, setHasUserSubmittedFeedback] = useState(false);
  const [currentUserFeedback, setCurrentUserFeedback] = useState(null);

  const fetchFeedbackAndEvent = async () => {
    if (currentUserId === null) {
        setLoading(false);
        setError("Please sign in to view and submit feedback.");
        return;
    }

    try {
      setLoading(true);
      setError(null);

      const eventResponse = await fetch(`http://localhost:5000/api/event_details/${event_id}`);
      if (!eventResponse.ok) {
        throw new Error(`Failed to fetch event details: ${eventResponse.status}`);
      }
      const eventJson = await eventResponse.json();
      setEventDetails(eventJson.event);

      const feedbackResponse = await fetch(`http://localhost:5000/api/feedback/${event_id}`);
      if (!feedbackResponse.ok) {
        throw new Error(`Failed to fetch feedback: ${feedbackResponse.status}`);
      }
      const feedbackJson = await feedbackResponse.json();
      setFeedback(feedbackJson);

      const userFeedback = feedbackJson.find(f => f.user_id === currentUserId);
      setHasUserSubmittedFeedback(!!userFeedback);
      setCurrentUserFeedback(userFeedback || null);

      if (userFeedback) {
        setEditForm({ comment: userFeedback.comment, rating: userFeedback.rating });
      } else {
        setForm({ comment: '', rating: 5 });
      }
      setEditMode(false);

    } catch (err) {
      console.error('Fetch error:', err);
      setError(`Failed to load feedback: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (event_id && currentUserId !== null) {
      fetchFeedbackAndEvent();
    } else if (event_id && currentUserId === null) {
        setLoading(false);
        setError("Please sign in to view and submit feedback.");
    } else {
      setError("Event ID is missing for feedback.");
      setLoading(false);
    }
  }, [event_id, currentUserId]); 

  const handleNewFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prevForm => ({
      ...prevForm,
      [name]: name === 'rating' ? +value : value
    }));
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prevEditForm => ({
      ...prevEditForm,
      [name]: name === 'rating' ? +value : value
    }));
  };

  const submitFeedback = async () => {
    if (userRole === 'Admin') {
        setError("Admins are not allowed to submit feedback.");
        return;
    }
    if (currentUserId === null) {
        setError("You must be logged in to submit feedback.");
        return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/feedback/${event_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId, ...form }), 
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to submit feedback: ${response.status}`);
      }
      setForm({ comment: '', rating: 5 });
      fetchFeedbackAndEvent(); 
    } catch (err) {
      console.error('Submit feedback error:', err);
      setError(`Failed to submit feedback: ${err.message}`);
    }
  };

  const startEdit = (f) => {
    setEditMode(true);
    setEditForm({ comment: f.comment, rating: f.rating });
  };

  const saveEdit = async () => {
    if (userRole === 'Admin') {
        setError("Admins are not allowed to edit feedback.");
        return;
    }
    if (currentUserId === null) {
        setError("You must be logged in to edit feedback.");
        return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/feedback/${event_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId, ...editForm }), 
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save feedback: ${response.status}`);
      }
      setEditMode(false);
      fetchFeedbackAndEvent();
    } catch (err) {
      console.error('Save feedback error:', err);
      setError(`Failed to save feedback: ${err.message}`);
    }
  };

  const cancelEdit = () => {
    setEditMode(false);
    if (currentUserFeedback) {
      setEditForm({ comment: currentUserFeedback.comment, rating: currentUserFeedback.rating });
    } else {
      setEditForm({ comment: '', rating: 5 });
    }
  };

  const deleteFeedback = async () => {
    // Client-side check for admin role
    if (userRole === 'Admin') {
        setError("Admins are not allowed to delete feedback.");
        return;
    }
    // Client-side check for not logged in
    if (currentUserId === null) {
        setError("You must be logged in to delete feedback.");
        return;
    }

    if (window.confirm("Are you sure you want to delete your feedback? This cannot be undone.")) {
      try {
        const response = await fetch(`http://localhost:5000/api/feedback/${event_id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ user_id: currentUserId }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to delete feedback: ${response.status}`);
        }
        fetchFeedbackAndEvent();
      } catch (err) {
        console.error('Delete feedback error:', err);
        setError(`Failed to delete feedback: ${err.message}`);
      }
    }
  };


  if (loading) return <div className="feedback-page-container loading">Loading feedback...</div>;
  if (error) return <div className="feedback-page-container error">Error: {error}</div>;
  if (!eventDetails && currentUserId !== null) return <div className="feedback-page-container not-found">Event details not available for feedback.</div>;


  const isLoggedIn = currentUserId !== null;
  const isUserAdmin = userRole === 'Admin';
  const showFeedbackForm = isLoggedIn && !isUserAdmin;


  return (
    <div className="feedback-page-container">
      <header className="feedback-page-header">
        <h1>Feedback for "{eventDetails ? eventDetails.name : 'Event'}"</h1> 
        <p>Event Type: {eventDetails ? eventDetails.type : 'N/A'}</p> 
        <Link to={`/events/${event_id}`} className="back-to-event-btn">Back to Event Details</Link>
      </header>

      <div className="feedback-section">
        <h2>All Feedback</h2>
        {feedback.length === 0 && <p className="no-feedback">No feedback yet. Be the first to leave one!</p>}

        <ul className="feedback-list">
          {feedback.map((f, idx) => (
            <li key={idx} className="feedback-item">
              <div>
                <span className="attendee-name">{f.attendee_name || `User ${f.user_id}`}:</span> {f.comment}
              </div>
              <div className="feedback-actions">
                <span className="star">⭐{f.rating}</span>
                {/* Only show edit/delete if it's the current authenticated user's feedback AND they are not an Admin */}
                {f.user_id === currentUserId && !isUserAdmin && (
                  <>
                    {!editMode && (
                      <button className="btn edit" onClick={() => startEdit(f)}>Edit</button>
                    )}
                    <button className="btn delete" onClick={deleteFeedback}>Delete</button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>

        {!isLoggedIn ? (
            <div className="feedback-form">
                <h3>Please Sign In</h3>
                <p className="already-submitted-message">Sign in to leave or manage your feedback for this event.</p>
            </div>
        ) : isUserAdmin ? (
          // If the user is an Admin, prevent them from seeing the feedback form
          <div className="feedback-form">
            <h3>Admins Cannot Submit Feedback</h3>
            <p className="already-submitted-message">Users with "Admin" roles are not allowed to submit or edit feedback for events.</p>
          </div>
        ) : editMode && currentUserFeedback ? (
          // If edit mode is active and user has feedback, show the edit form
          <div className="feedback-form edit-mode">
            <h3>Edit Your Feedback</h3>
            <textarea
              name="comment"
              value={editForm.comment}
              onChange={handleEditFormChange}
            />
            <label>
              Rating:
              <input
                type="number" min="1" max="5"
                name="rating"
                value={editForm.rating}
                onChange={handleEditFormChange}
              />
            </label>
            <div className="form-buttons">
              <button className="btn save" onClick={saveEdit}>Save Changes</button>
              <button className="btn cancel" onClick={cancelEdit}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="feedback-form">
            <h3>Leave Feedback</h3>
            <textarea
              name="comment"
              placeholder="Your comments…"
              value={form.comment}
              onChange={handleNewFormChange}
              disabled={hasUserSubmittedFeedback}
            />
            <label>
              Rating:
              <input
                type="number" min="1" max="5"
                name="rating"
                value={form.rating}
                onChange={handleNewFormChange}
                disabled={hasUserSubmittedFeedback}
              />
            </label>
            <button
              className="btn submit"
              onClick={submitFeedback}
              disabled={hasUserSubmittedFeedback}
            >
              {hasUserSubmittedFeedback ? 'Already Submitted' : 'Submit Feedback'}
            </button>
            {hasUserSubmittedFeedback && (
              <p className="already-submitted-message">You have already submitted feedback for this event. Click "Edit" to modify it.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage;