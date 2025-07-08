import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import "../styles/homepage.css";

export default function Header() {
const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    navigate("/");
  };

  return (
    <header className="site-header">
      <div className="header-logo">
        <Link to="/">BADOT</Link>
      </div>

      <nav className="navbar">
        <div className="nav-left">
          <Link to="/" className="nav-link">Home</Link>

          {user && (user.role === "Attendee" || user.role === "Organizer") && (
            <Link to="/profile" className="nav-link">Profile</Link>
          )}
          
          {user && user.role === "Attendee" && (
            <>
,              <Link to="/my-tickets" className="nav-link">My Tickets</Link>
            </>
          )}

          {user && user.role === "Organizer" && (
            <Link to="/CreateEvent" className="nav-link">Create Event</Link>
          )}

          {user && user.role === "Admin" && (
            <Link to="/reports" className="nav-link">Report</Link>
          )}
        </div>

        <div className="nav-right">
          {user ? (
            <>
              {user.email && <span className="user-email-display">{user.email}</span>}
              <button onClick={handleLogout} className="nav-link sign-in-btn">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link sign-in-btn">Sign In</Link>
              <Link to="/signup" className="nav-link sign-up-btn">Sign Up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
