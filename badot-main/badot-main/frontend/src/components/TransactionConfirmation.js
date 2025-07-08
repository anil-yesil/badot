import React, { useEffect, useState } from 'react';
import { useParams }                from 'react-router-dom';

const API = 'http://localhost:5001';

export default function TransactionConfirmation() {
  const { id } = useParams(); // this is payment_id
  const [txn,   setTxn]   = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/transactions/${id}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setTxn)
      .catch(e => setError(e.message));
  }, [id]);

  if (error) return (
    <div style={{
      maxWidth:600, margin:'40px auto', padding:20,
      background:'#fee', border:'1px solid #a00'
    }}>
      <h2 style={{ color:'#a00' }}>Error loading transaction</h2>
      <p>{error}</p>
    </div>
  );
  if (!txn) return <p style={{ textAlign:'center', marginTop:50 }}>Loading…</p>;

  return (
    <div style={{ maxWidth:600, margin:'20px auto', fontFamily:'sans-serif' }}>
      <h1 style={{ textAlign:'center' }}>
        🎉 Transaction #{txn.payment_id} Confirmed
      </h1>
      <p><strong>Date:</strong> {new Date(txn.date).toLocaleString()}</p>
      <p><strong>Total Paid:</strong> ${txn.amount}</p>

      <h2 style={{ marginTop:30 }}>Your Tickets</h2>
      {txn.tickets.map(t => (
        <div key={t.ticket_id} style={{
          display:'flex', alignItems:'center',
          border:'1px solid #ccc', borderRadius:4,
          padding:10, marginBottom:10
        }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:18, fontWeight:'bold' }}>
              {t.event_name}
            </div>
            <div>Seat #{t.seat_number}</div>
          </div>
          <div style={{ width:150, height:150 }}>
            {t.QR_code
              ? <img
                  src={t.QR_code}
                  alt="QR code"
                  style={{ width:'100%',height:'100%',objectFit:'cover' }}
                />
              : <div style={{
                  width:'100%',height:'100%',
                  background:'#f0f0f0',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  color:'#888'
                }}>
                  No QR
                </div>
            }
          </div>
        </div>
      ))}

      <div style={{ textAlign:'center', marginTop:30 }}>
        <a
          href={`${API}/api/transactions/${txn.payment_id}/download`}
          style={{
            padding:'10px 20px', background:'#0077cc',
            color:'#fff', textDecoration:'none',
            borderRadius:4
          }}
          target="_blank"
          rel="noopener noreferrer"
        >
          Download Tickets PDF
        </a>
      </div>
    </div>
  );
}
