import React, { useEffect, useState } from 'react';
import '../styles/CreateEvent.css';
import { useAuth } from '../context/AuthContext'; 

const CreateEvent = () => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    date: '',
    description: '',
    rules: '',
    venue_id: '',
    image_url: '',
    price: '',
    ticket_count: '',
  });

  const [venues, setVenues] = useState([]);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [capacities, setCapacities] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/venue/venues');
        const data = await res.json();
        setVenues(data);
      } catch (err) {
        console.error('Failed to load venues:', err);
      }
    };

    fetchVenues();
    const fetchCapacities = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/venue/capacity');
        const data = await res.json();

        // convert list to a map for quick lookup
        const capacityMap = {};
        data.forEach(item => {
          capacityMap[item.venue_id] = item.capacity;
        });

        setCapacities(capacityMap);
      } catch (err) {
        console.error('Failed to load capacities:', err);
      }
    };
    fetchCapacities();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (file) => {
    const data = new FormData();
    data.append('image', file);

    try {
      const res = await fetch('http://localhost:5000/api/image/upload-image', {
        method: 'POST',
        body: data,
      });

      const result = await res.json();
      if (result.success) {
        setFormData(prev => ({ ...prev, image_url: result.path }));
        setUploadedImage(result.path);
      } else {
        alert('Image upload failed');
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedVenueId = formData.venue_id;
    const maxCapacity = capacities[selectedVenueId];

    if (parseInt(formData.ticket_count) > maxCapacity) {
      alert(`Ticket count exceeds venue capacity of ${maxCapacity}`);
      return;
    }

    if (!user) {
    alert("You must be logged in to create an event.");
    return;
    }

    const payload = {
      ...formData,
      active_status: 1,
      rating: 0,
      user_id: user?.user_id,
    };

    const token = localStorage.getItem("token");
    console.log("Token sent to backend:", token);

    try {
      const res = await fetch('http://localhost:5000/api/event/create', {
        method: 'POST',
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      const result = await res.json();
      alert('Event created successfully!');
    } catch (err) {
      console.error('Submit failed:', err);
      alert('Error creating event');
    }
  };

  return (
    <div className="create-event-container">
      <h2>Create New Event</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="name" placeholder="Event Name" required onChange={handleChange} />
        
        <select name="type" required onChange={handleChange}>
          <option value="">Select Event Type</option>
          <option value="Concert">Concert</option>
          <option value="Theatre">Theatre</option>
          <option value="Stand-up">Stand-up</option>
          <option value="Conference">Conference</option>
          <option value="Other">Other</option>
        </select>

        <input type="datetime-local" name="date" required onChange={handleChange} />

        <textarea name="description" placeholder="Description" required onChange={handleChange}></textarea>
        <textarea name="rules" placeholder="Rules" required onChange={handleChange}></textarea>
        <input type="number" name="price" placeholder="Price (e.g., 100)" required onChange={handleChange} />

        <select name="venue_id" required onChange={handleChange}>
          <option value="">Select Venue</option>
          {venues.map(v => (
            <option key={v.venue_id} value={v.venue_id}>
              {v.name} - {v.city}
            </option>
          ))}
        </select>

        <input
          type="number"
          name="ticket_count"
          placeholder="Number of Tickets"
          required
          onChange={handleChange}
        />

        <p>If your venue is not listed, please contact the admin to add a new venue.</p>

        <div
          className={`upload-area ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {uploadedImage ? (
            <img src={uploadedImage} alt="Uploaded" className="preview-image" />
          ) : (
            <p>Drag & Drop Image Here or Click Below</p>
          )}
          <input type="file" accept="image/*" onChange={handleFileInputChange} />
        </div>

        <button type="submit">Create Event</button>
      </form>
    </div>
  );
};

export default CreateEvent;
