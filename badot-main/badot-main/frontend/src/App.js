// App.js
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation
} from "react-router-dom";
import Homepage                from './components/Homepage';
import Header                  from './components/Header'; 
import Signup                  from './components/SignupPage';
import Login                   from './components/LoginPage';
import CreateEvent             from './components/CreateEvent';
import TransactionConfirmation from './components/TransactionConfirmation';
import TicketList              from './components/TicketList';
import ReportPage              from './components/ReportPage';
import EventInfo               from './components/EventInfo';
import FeedbackPage            from './components/FeedbackPage';
import TicketBooking from './components/TicketBooking';
import ProfilePage from "./components/ProfilePage";

function App() {
  const fakeUserId = 1; // Consider getting this from AuthContext later

  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/"            element={<Homepage />} />
        <Route path="/signup"      element={<Signup    />} />
        <Route path="/login"       element={<Login     />} />
        <Route path="/CreateEvent" element={<CreateEvent />} />
        <Route path="/events/:event_id" element={<EventInfo />} />
        <Route path="/events/:event_id/feedback" element={<FeedbackPage />} />
        <Route path="/buy_ticket/:event_id"  element={<TicketBooking/>} />
        <Route path="/transactions/:id" element={<TransactionConfirmation />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="/my-tickets"
          element={<TicketList userId={fakeUserId} />}
        />
        <Route path="/reports"     element={<ReportPage />} />
      </Routes>
    </Router>
  );
}

// This component lives inside the Router, so we can call useLocation()
function ConditionalHeader() {
  const { pathname } = useLocation();
  // Don't render Header on the home page, event detail pages, or feedback pages
  if (pathname === "/" || pathname.startsWith("/events/")) {
    return null;
  }
  return <Header />;
}

export default App;
