import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventCard from "./EventCard";
import "../styles/homepage.css";
import { useAuth } from '../context/AuthContext';
import { Link } from "react-router-dom";

const categories = [
  { label: "All Types", icon: "✨",   value: ""          },
  { label: "Theatre",   icon: "🎭",   value: "Theatre"  },
  { label: "Concert",   icon: "🎤",   value: "Concert"  },
  { label: "Other",     icon: "🎉",   value: "Other"    },
];

export default function Homepage() {
  const { user, logout } = useAuth(); 
  const navigate = useNavigate();

  const [events, setEvents]           = useState([]);
  const [locationsList, setLocations] = useState([]);
  const [filters, setFilters]         = useState({
    q:        "",
    location: "",
    date:     "",
    type:     "",
  });
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);

  useEffect(() => {
    fetch("http://localhost:5000/api/event/locations")
      .then(r => r.json())
      .then(setLocations)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q)        params.append("q",        filters.q);
    if (filters.location) params.append("location", filters.location);
    if (filters.date)     params.append("date",     filters.date);
    if (filters.type)     params.append("type",     filters.type);
    params.append("page", page);

    fetch(`http://localhost:5000/api/event/all?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        setEvents(data.events);
        setTotalPages(Math.ceil(data.total / data.pageSize));
      })
      .catch(console.error);
  }, [filters, page]); 

  useEffect(() => {
    setPage(1);
  }, [filters.q, filters.location, filters.date, filters.type]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const handleLogout = () => {
    logout(); 
    localStorage.removeItem('token'); 
    localStorage.removeItem('currentUser'); 
    navigate('/'); 
  };

  return (
    <div className="homepage">

      {/* Search and filter bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search for an event…"
          value={filters.q}
          onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
        />
        <select
          value={filters.location}
          onChange={e => setFilters(f => ({ ...f, location: e.target.value }))}
        >
          <option value="">Choose a Location</option>
          {locationsList.map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.date}
          onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
        />
      </div>

      {/* Category selection pills */}
      <div className="category-bar">
        {categories.map(cat => (
          <button
            key={cat.label}
            className={`category-pill${filters.type === cat.value ? " active" : ""}`}
            onClick={() => setFilters(f => ({ ...f, type: cat.value }))}
          >
            <span className="cat-icon">{cat.icon}</span>
            <span className="cat-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Grid displaying event cards */}
      <div className="event-grid">
        {events.map(ev =>
          <EventCard key={ev.event_id} event={ev}/>
        )}
      </div>

      {/* Pagination controls */}
      <div className="pagination">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >Prev</button>

        <span>Page {page} of {totalPages}</span>

        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >Next</button>
      </div>
    </div>
  );
}
