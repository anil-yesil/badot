//mysql sees the inline comments as errors. --status ENUM('Pending','Completed','Failed'), who needs this anyway :) just one click will determine whether it is created or not.

import React, { useState, useEffect } from 'react';
import '../styles/TicketBooking.css';
import { useAuth } from '../context/AuthContext'; 
import { redirect, useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';


const TicketBooking = ( ) => {
  const [availableSeats, setAvailableSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [guestData, setGuestData] = useState([]);
  const [step, setStep] = useState(1);
  const [paymentSum, setPaymentSum] = useState(0);

  const { user } = useAuth();
  const currentUserID = user ? user.user_id : null;
  const navigate = useNavigate();

  const {event_id} = useParams();
  useEffect(() => {
    const fetchSeats = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/tickets/${event_id}`);
        const data = await res.json();
        setAvailableSeats(data.seats);
      } catch (err) {
        console.error("Error fetching seats:", err);
      }
    };
    fetchSeats();
  }, [event_id]);

const toggleSeat = (seat) => {
  const exists = selectedSeats.some(s => s.seat_number === seat.seat_number);
  setSelectedSeats(exists
    ? selectedSeats.filter(s => s.seat_number !== seat.seat_number)
    : [...selectedSeats, seat]
  );
};

  useEffect(() => {
    setGuestData(prev =>
      selectedSeats.map(seat => {
        const existing = prev.find(g => g.seatNumber === seat.seatNumber);
        return existing || { ticket_id: seat.seatNumber, name: '', email: '' };
      })
    );
  }, [selectedSeats]);

  // const handleGuestChange = (index, field, value) => {
  //   const updated = [...guestData];
  //   updated[index][field] = value;
  //   setGuestData(updated);
  // };
  const handleGuestChange = (index, field, value) => {
  setGuestData(prevGuests => {
    const newGuests = [...prevGuests];  // copy array to avoid mutation
    newGuests[index] = {
      ...newGuests[index],              // copy guest object
      [field]: value                   // update specific field
    };
    return newGuests;
  });
};

  const handleNext = async () => {
    if (step === 1) {
      if (selectedSeats.length === 0) {
        alert("Please select at least one seat.");
        return;
      }
      try {
        // add the price.
        for(let i = 0;i < selectedSeats.length; i++){
          setPaymentSum(paymentSum + selectedSeats[i].price)
        }
        // const res = await fetch('http://localhost:5000/api/tickets/select_seats', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     ticket_ids: selectedSeats.map(seat => seat.seatNumber)
        //   })
        // });
        // if (!res.ok) {
        //   console.log("res.ok:",res.ok)
        //   throw new Error("Seat selection failed");
        // }
        setStep(2);
      } catch (err) {
        alert("Error selecting seats. They may no longer be available.");
        console.error(err);
      }
    } else if (step === 2) {
      if (guestData.some(g => !g.name || !g.email)) {
        alert("Please fill in all guest information.");
        return;
      }

      try {
        const mainGuest = guestData[0];
        if(!user){
          alert("you are not logged in sir");
          setStep(1);
          return;
        }
        const res = await fetch('http://localhost:5000/api/tickets/fill_guest_info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUserID,
            street_no: mainGuest.street_no,
            street_name: mainGuest.street_name,
            apartment: mainGuest.apartment,
            city: mainGuest.city,
            state: mainGuest.state,
            zip: mainGuest.zip,
            date_of_birth: mainGuest.date_of_birth,
            age: mainGuest.age,
            budget: mainGuest.budget
          })
        });

        if (!res.ok) throw new Error("Guest info failed");
        setStep(3);
      } catch (err) {
        console.error("Failed to submit guest info:", err);
        alert("Guest info submission failed.");
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handlePayment = async () => {
    console.log("currentUserID:", currentUserID);

        // Then, prepare tickets
        const ticketPayload = guestData.map((guest, index) => ({
          event_id: event_id, // make sure this is available
          //olumn_num: guest.column_num,
          //row_num: guest.row_num,
          seat_number: guest.seat_number,
          seating_category: "Economy",
          price: 100,
          name: guest.name,
          status: "Booked",
          user_id: user.user_id
        }));

        const ticketRes = await fetch('http://localhost:5000/api/tickets/create_bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ticketPayload)
        });

    try {
        if (!ticketRes.ok) {
          // Handle error
          console.error('Failed to create tickets');
        } else {
          const data = await ticketRes.json();  // Parse JSON from response
          console.log(data.payment_id);          // Now you can access payment_id here
          alert("Payment successful! Booking complete. Payment ID: " + data.payment_id);

        }
        

      await fetch('http://localhost:5000/api/tickets/update_ticket_count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event_id,
          guest_count: guestData.length
        })
      });

      setStep(1);
      setSelectedSeats([]);
      setGuestData([]);
      navigate("/");

    } catch (err) {
      console.error("Payment failed:", err);
      alert("Payment failed. Please check your budget or try again.");
    }
  };

  return (
    <div className="container">
      <h1>Ticket Booking for Event ID {event_id}</h1>

      { user && step === 1 && (
        <>
          <h2>Select Your Seats</h2>
          <div className="seat-grid">
              <div>
                {[...Array(availableSeats)].map((_, index) => {
                  const seatNumber = index + 1;
                  // You won’t have ticket_id from backend, so just use seatNumber as key
                  return (
                    <button
                      key={seatNumber}
                      className={`seat ${selectedSeats.some(s => s.seat_number === seatNumber) ? 'selected' : ''}`}
                      onClick={() => toggleSeat({ seat_number: seatNumber })}
                    >
                      {seatNumber}
                    </button>
                  );
                })}
              </div>

          </div>
          <button onClick={handleNext} className="primary-button">Next</button>
        </>
      )}

      {step === 2 && (
        <>
          <h2>Enter Guest Information</h2>
          <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
            {

            <>            
{guestData.map((guest, index) => (
  <div key={index} className="guest-form-section">
    <h4>Seat {index+1}</h4>

    <label>
      Name:
      <input
        type="text"
        value={guest.name}
        required
        onChange={(e) => handleGuestChange(index, 'name', e.target.value)}
      />
    </label>

    <label>
      Email:
      <input
        type="email"
        value={guest.email}
        required
        onChange={(e) => handleGuestChange(index, 'email', e.target.value)}
      />
    </label>

    {index === 0 && (
      <>
        {/* <label>
          Street No:
          <input
            type="text"
            value={guest.street_no || ''}
            onChange={(e) => handleGuestChange(index, 'street_no', e.target.value)}
          />
        </label>

        <label>
          Street Name:
          <input
            type="text"
            value={guest.street_name || ''}
            onChange={(e) => handleGuestChange(index, 'street_name', e.target.value)}
          />
        </label>

        <label>
          Apartment:
          <input
            type="text"
            value={guest.apartment || ''}
            onChange={(e) => handleGuestChange(index, 'apartment', e.target.value)}
          />
        </label>

        <label>
          City:
          <input
            type="text"
            value={guest.city || ''}
            onChange={(e) => handleGuestChange(index, 'city', e.target.value)}
          />
        </label>

        <label>
          State:
          <input
            type="text"
            value={guest.state || ''}
            onChange={(e) => handleGuestChange(index, 'state', e.target.value)}
          />
        </label> */}
{/* 
        <label>
          Zip:
          <input
            type="text"
            value={guest.zip || ''}
            onChange={(e) => handleGuestChange(index, 'zip', e.target.value)}
          />
        </label>

        <label>
          Date of Birth:
          <input
            type="date"
            value={guest.date_of_birth || ''}
            onChange={(e) => handleGuestChange(index, 'date_of_birth', e.target.value)}
          />
        </label> */}

      </>
    )}
  </div>
))}</>}
            <div className="navigation-buttons">
              <button type="button" onClick={handleBack}>Back</button>
              <button type="submit">Proceed to Payment</button>
            </div>

           

          </form>
        </>

      )}

      {step === 3 && (
        <>
          <h2>Payment</h2>
          <p>Total Seats: {selectedSeats.length}</p>
          <p>Price per Seat: 100 TL</p>
          <p><strong>Total: {selectedSeats.length *100} TL</strong></p>
          <div className="navigation-buttons">
            <button onClick={handleBack}>Back</button>
            <button className="primary-button" onClick={handlePayment}>Pay Now</button>
          </div>
        </>
      )}
    </div>
  );
};

export default TicketBooking;
