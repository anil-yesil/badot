// src/components/ReportPage.jsx
import React, { useEffect, useState } from 'react';

const API = 'http://localhost:5001';

export default function ReportPage() {
  const [reports, setReports]           = useState([]);
  const [type, setType]                 = useState('Financial');
  const [description, setDescription]   = useState('');
  const [error, setError]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const fakeAdminId = 1; // your logged-in admin

  // fetch existing reports
  useEffect(() => {
    fetch(`${API}/api/reports`)
      .then(r => r.json())
      .then(data => {
        setReports(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    fetch(`${API}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        admin_id:    fakeAdminId,
        type,
        description
      })
    })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(({ report_id }) => {
      // prepend new report to list
      setReports(prev => [{
        report_id,
        date: new Date().toISOString().split('T')[0],
        type,
        description,
        user_id:    fakeAdminId,
        first_name: 'Admin',   // adjust as needed
        last_name:  'User'
      }, ...prev]);
      // reset form
      setType('Financial');
      setDescription('');
    })
    .catch(err => setError(err.message));
  }

  if (loading) return <p>Loading reports…</p>;
  if (error)   return <p style={{color:'red'}}>Error: {error}</p>;

  return (
    <div style={{ maxWidth:600, margin:'20px auto', fontFamily:'sans-serif' }}>
      <h1>Generate New Report</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom:30 }}>
        <label>
          Type:{' '}
          <select
            value={type}
            onChange={e => setType(e.target.value)}
          >
            <option>Financial</option>
            <option>User</option>
            <option>Technical</option>
            <option>Other</option>
          </select>
        </label>
        <br/><br/>
        <label>
          Description:<br/>
          <textarea
            rows={3}
            style={{ width:'100%', padding:8, borderRadius:4, border:'1px solid #ccc' }}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </label>
        <br/>
        <button
          type="submit"
          style={{
            marginTop:10,
            padding:'8px 16px',
            background:'#28a745',
            color:'#fff',
            border:'none',
            borderRadius:4,
            cursor:'pointer'
          }}
        >
          Generate
        </button>
      </form>

      <h2>Existing Reports</h2>
      {reports.length === 0 && <p>No reports yet.</p>}
      <ul style={{ padding:0, listStyle:'none' }}>
        {reports.map(r => (
          <li key={r.report_id} style={{
            border:'1px solid #ccc',
            borderRadius:4,
            padding:10,
            marginBottom:10
          }}>
            <div>
              <strong>#{r.report_id}</strong>{' '}
              <em>{new Date(r.date).toLocaleString()}</em>{' '}
              <span style={{
                background:'#eef',
                padding:'2px 6px',
                borderRadius:4,
                fontSize:'0.9em'
              }}>
                {r.type}
              </span>
            </div>
            <div style={{ marginTop:6 }}>{r.description}</div>
            <div style={{ fontSize:'0.85em', color:'#555', marginTop:4 }}>
              by {r.first_name} {r.last_name}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
