import React, { useEffect, useState } from "react";
import "../styles/profile.css";
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const [followCount, setFollowCount] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/follow-count", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setFollowCount(data.count))
      .catch(() => setFollowCount("N/A"));
  }, []);

  if (!user) return <div>Please log in to view your profile.</div>;

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h2>My Profile</h2>
        <div className="profile-row"><strong>First Name:</strong> {user.first_name}</div>
        <div className="profile-row"><strong>Last Name:</strong> {user.last_name}</div>
        <div className="profile-row"><strong>Email:</strong> {user.email}</div>
        <div className="profile-row"><strong>Nationality:</strong> {user.nationality || "Not provided"}</div>
        <div className="profile-row"><strong>Role:</strong> {user.role}</div>
        {user.role === "Attendee" && (
          <div className="profile-row"><strong>Following:</strong> {followCount}</div>
        )}
        {user.role === "Organizer" && (
          <div className="profile-row"><strong>Followers:</strong> {followCount}</div>
        )}
      </div>
    </div>
  );
}
