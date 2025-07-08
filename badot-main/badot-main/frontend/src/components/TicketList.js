// frontend/src/components/TicketList.jsx

import React, { useEffect, useState } from 'react';
import { Link }                    from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 

const API = 'http://localhost:5001';

export default function TicketList({ userId }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const { user } = useAuth();
  const currentUserID = user ? user.user_id : null;

  useEffect(() => {
    fetch(`http://localhost:5000/api/tickets/user_tickets/${currentUserID}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        //console.log("json",r.json())
        return r.json();
      })
      .then(data => {
        setTickets(data.tickets || []);
        console.log("tickets:", tickets);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [currentUserID]);

  if (loading) return <p>Loading your tickets…</p>;
  if (error)   return <p style={{color:'red'}}>Error: {error}</p>;
  if (!tickets.length) return <p>You have no booked tickets yet.</p>;

  return (
    <div style={{maxWidth:700,margin:'20px auto',fontFamily:'sans-serif'}}>
      <h1>Your Tickets</h1>
      {tickets.map(t => (
        <div key={t.ticket_id} style={{
          display:'flex',
          alignItems:'center',
          border:'1px solid #ddd',
          borderRadius:6,
          padding:12,
          marginBottom:12,
          background:'#fafafa'
        }}>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:'bold'}}>
              <Link to={`/events/${t.event_id}`}>
                {t.event_name}
              </Link>
            </div>
            <div style={{color:'#444'}}>
              {new Date(t.event_date).toLocaleString()}
            </div>
            <div>Seat #{t.seat_number}</div>
          </div>
          <div style={{
            width:100,
            height:100,
            marginLeft:20,
            border:'1px solid #ccc',
            borderRadius:4,
            overflow:'hidden',
            display:'flex',
            alignItems:'center',
            justifyContent:'center'
          }}>
            {t.QR_code
              ? <img src={t.QR_code}
                     alt="QR code"
                     style={{width:'100%',height:'100%',objectFit:'cover'}} />
              : <span style={{color:'#888'}}>No QR</span>
            }
          </div>
        </div>
      ))}
    </div>
  );
}
