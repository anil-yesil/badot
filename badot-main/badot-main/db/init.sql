-- init.sql

DROP TABLE IF EXISTS Follow;
DROP TABLE IF EXISTS Report;
DROP TABLE IF EXISTS Has;
DROP TABLE IF EXISTS Sponsorship;
DROP TABLE IF EXISTS Book;
DROP TABLE IF EXISTS Ticket;
DROP TABLE IF EXISTS Feedback;
DROP TABLE IF EXISTS Favorite;
DROP TABLE IF EXISTS Event;
DROP TABLE IF EXISTS Panel_Admin;
DROP TABLE IF EXISTS Event_Organiser;
DROP TABLE IF EXISTS Event_Attendee;
DROP TABLE IF EXISTS User_Phone;
DROP TABLE IF EXISTS Payment;
DROP TABLE IF EXISTS Venue;
DROP TABLE IF EXISTS User;

CREATE TABLE User (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(50),
  middle_name VARCHAR(50),
  last_name VARCHAR(50),
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  login_date DATE,
  nationality VARCHAR(50)
);

CREATE TABLE User_Phone (
  user_id INT, phone_number VARCHAR(20),
  PRIMARY KEY(user_id,phone_number),
  FOREIGN KEY(user_id) REFERENCES User(user_id)
);

CREATE TABLE Event_Attendee (
  user_id INT PRIMARY KEY,
  street_no INT, 
  street_name VARCHAR(100), 
  apartment VARCHAR(50),
  city VARCHAR(50), 
  state VARCHAR(50), 
  zip VARCHAR(10),
  date_of_birth DATE, 
  age INT, 
  budget DECIMAL(10,2),
  FOREIGN KEY(user_id) REFERENCES User(user_id)
);

CREATE TABLE Event_Organiser (
  user_id INT PRIMARY KEY, o_revenue DECIMAL(10,2), rating FLOAT,
  FOREIGN KEY(user_id) REFERENCES User(user_id)
);

CREATE TABLE Panel_Admin (
  user_id INT PRIMARY KEY, a_revenue DECIMAL(10,2),
  FOREIGN KEY(user_id) REFERENCES User(user_id)
);

CREATE TABLE Venue (
  venue_id INT AUTO_INCREMENT PRIMARY KEY,
  location VARCHAR(100), street_no INT, street_name VARCHAR(100),
  apartment VARCHAR(50), city VARCHAR(50), state VARCHAR(50), zip VARCHAR(10),
  name VARCHAR(100), num_of_columns INT, num_of_rows INT, capacity INT,
  type ENUM('Indoor','Outdoor','Hybrid')
);

-- image'ı da eventten kaldırıyorum 
CREATE TABLE Event (
  event_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128),
  type ENUM('Concert','Theatre','Sports','Conference','Other'),
  date DATETIME, description TEXT, active_status BOOLEAN, rating FLOAT,
  user_id INT, venue_id INT,
  rules TEXT,
  image_url TEXT,
  FOREIGN KEY(user_id) REFERENCES User(user_id),
  FOREIGN KEY(venue_id) REFERENCES Venue(venue_id),
  ticket_count INT
);


-- multiple image için ekledim ayrı bir table diğer türlü daha zor olacak gibiydi
CREATE TABLE Event_Image (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT,
  image_url TEXT,
  FOREIGN KEY(event_id) REFERENCES Event(event_id)
);

CREATE TABLE Favorite (
  user_id INT, event_id INT,
  PRIMARY KEY(user_id,event_id),
  FOREIGN KEY(user_id) REFERENCES Event_Attendee(user_id),
  FOREIGN KEY(event_id) REFERENCES Event(event_id)
);

CREATE TABLE Feedback (
  user_id INT, event_id INT,
  rate INT CHECK(rate>=1 AND rate<=5), comment TEXT,
  PRIMARY KEY(user_id,event_id),
  FOREIGN KEY(user_id) REFERENCES Event_Attendee(user_id),
  FOREIGN KEY(event_id) REFERENCES Event(event_id)
);

CREATE TABLE Payment (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  amount DECIMAL(10,2), 
  date DATETIME,
  method ENUM('CreditCard','PayPal','Crypto','BankTransfer'),
  user_id INT,
  FOREIGN KEY(user_id) REFERENCES User(user_id)
);
CREATE TABLE Ticket (
  ticket_id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT, 
  user_id INT, 
  column_num INT, 
  name VARCHAR(50),
  row_num INT, 
  seat_number INT,
  seating_category ENUM('VIP','Regular','Economy'),
  price DECIMAL(10,2), 
  status ENUM('Available','Booked','Cancelled'),
  QR_code TEXT, 
  payment_id INT,
  FOREIGN KEY(event_id) REFERENCES Event(event_id),
  FOREIGN KEY(payment_id) REFERENCES Payment(payment_id),
  FOREIGN KEY(user_id) REFERENCES User(user_id)
);

CREATE TABLE Book (
  user_id INT, ticket_id INT, event_id INT,
  PRIMARY KEY(user_id,ticket_id,event_id),
  FOREIGN KEY(user_id) REFERENCES Event_Attendee(user_id),
  FOREIGN KEY(ticket_id) REFERENCES Ticket(ticket_id),
  FOREIGN KEY(event_id) REFERENCES Event(event_id)
);

CREATE TABLE Sponsorship (
  sponsor_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100), sponsorship_price DECIMAL(10,2),
  description TEXT, url TEXT, image TEXT
);

CREATE TABLE Has (
  event_id INT, sponsor_id INT,
  PRIMARY KEY(event_id,sponsor_id),
  FOREIGN KEY(event_id) REFERENCES Event(event_id),
  FOREIGN KEY(sponsor_id) REFERENCES Sponsorship(sponsor_id)
);

CREATE TABLE Report (
  report_id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE,
  type ENUM('Financial','User','Technical','Other'),
  description TEXT,
  user_id INT,
  FOREIGN KEY(user_id) REFERENCES Panel_Admin(user_id)
);

CREATE TABLE Follow (
  event_attendee_id INT, event_organizer_id INT,
  PRIMARY KEY(event_attendee_id,event_organizer_id),
  FOREIGN KEY(event_attendee_id) REFERENCES Event_Attendee(user_id),
  FOREIGN KEY(event_organizer_id) REFERENCES Event_Organiser(user_id)
);

-- EVENT + FEEDBACK VIEW
DROP VIEW IF EXISTS event_feedback_view;
CREATE VIEW event_feedback_view AS
SELECT
  f.event_id,
  f.user_id,
  f.rate      AS rating,
  f.comment,
  CONCAT(u.first_name, ' ', u.last_name) AS attendee_name,
  e.name      AS event_name,
  e.venue_id
FROM Feedback AS f
JOIN Event_Attendee AS ea ON ea.user_id = f.user_id
JOIN User AS u           ON u.user_id = ea.user_id
JOIN Event AS e            ON e.event_id = f.event_id;

-- TRIGGER TO AUTO-UPDATE Event.rating
DELIMITER $$
DROP TRIGGER IF EXISTS trg_update_event_rating$$
CREATE TRIGGER trg_update_event_rating
AFTER INSERT ON Feedback
FOR EACH ROW
BEGIN
  UPDATE Event
  SET rating = (
    SELECT AVG(rate)
    FROM Feedback
    WHERE event_id = NEW.event_id
  )
  WHERE event_id = NEW.event_id;
END$$
DELIMITER ;


-- seed users
INSERT INTO User (first_name,middle_name,last_name,email,password,login_date,nationality)
VALUES
  ('John',NULL,'Doe','john@example.com','x','2025-01-01','USA'),
  ('Jane','M','Smith','jane@example.com','x','2025-01-02','CAN'),
  ('omer',NULL,NULL,'omer@ex.com','x','2025-01-02','CAN');


-- seed venues + events
INSERT INTO Venue(location,street_no,street_name,apartment,city,state,zip,name,num_of_columns,num_of_rows,capacity,type)
VALUES
 ('Loc A',1,'1st St',NULL,'CityA','ST','11111','Venue A',10,10,100,'Indoor'),
 ('Loc B',2,'2nd St',NULL,'CityB','ST','22222','Venue B', 8, 8,  64,'Outdoor');

INSERT INTO Event(name,type,date,description,active_status,rating,user_id,venue_id,rules,image_url,ticket_count)
VALUES
 ('Show A','Concert','2025-05-20 20:00:00','Desc',TRUE,4.5,1,1,'No food.','/static/images/to-be-or-not-to-be-that-is-the-question.jpg',20),
 ('Play B','Theatre','2025-06-15 19:00:00','Desc',TRUE,4.0,2,2,'Be early.','/static/images/to-be-or-not-to-be-that-is-the-question.jpg',20);

-- seed attendees, organisers, admins
INSERT INTO Event_Attendee(user_id,street_no,street_name,apartment,city,state,zip,date_of_birth,age,budget)
VALUES
 (1,10,'Maple','A1','CityA','ST','11111','1990-01-01',35,200.00),
 (2,20,'Oak','B2','CityB','ST','22222','1988-05-15',36,150.00),
 (3,20,'Oak','B2','CityB','ST','22222','1988-05-15',36,150.00);


INSERT INTO Event_Organiser(user_id,o_revenue,rating) VALUES (1,1000,4.8),(2,800,4.5);
INSERT INTO Panel_Admin(user_id,a_revenue)       VALUES (1,5000),(2,3000);

-- seed an available ticket
INSERT INTO Ticket(event_id,column_num,row_num,seat_number,seating_category,price,status)
VALUES (1,1,1,101,'VIP',75.00,'Available');

-- now seed a pre‐booked ticket *with* valid QR and Book entry
INSERT INTO Payment(amount,date,method,user_id)
VALUES (60.00,'2025-05-01 12:00:00','CreditCard',1);
SET @pid = LAST_INSERT_ID();

-- here’s a small real QR (for "1-101")
INSERT INTO Ticket(event_id,column_num,row_num,seat_number,seating_category,price,status,QR_code,payment_id)
VALUES
  (2,1,1,102,'Economy',60.00,'Available',
   'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAA...',
   @pid);


-- now seed a pre‐booked ticket *with* valid QR and Book entry
INSERT INTO Payment(amount,date,method,user_id)
VALUES (60.00,'2025-05-01 12:00:00','CreditCard',1);
SET @pid = LAST_INSERT_ID();

-- here’s a small real QR (for "1-101")
INSERT INTO Ticket(event_id,column_num,row_num,seat_number,seating_category,price,status,QR_code,payment_id)
VALUES
  (2,1,3,102,'Economy',60.00,'Available',
   'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAA...',
   @pid);


-- now seed a pre‐booked ticket *with* valid QR and Book entry
INSERT INTO Payment(amount,date,method,user_id)
VALUES (60.00,'2025-05-01 12:00:00','CreditCard',1);
SET @pid = LAST_INSERT_ID();

-- here’s a small real QR (for "1-101")
INSERT INTO Ticket(event_id,column_num,row_num,seat_number,seating_category,price,status,QR_code,payment_id)
VALUES
  (2,1,4,102,'Economy',60.00,'Available',
   'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAA...',
   @pid);




INSERT INTO Ticket(event_id,column_num,row_num,seat_number,seating_category,price,status,QR_code,payment_id)
VALUES
  (2,1,2,103,'Economy',60.00,'Available',
   'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAA...',
   (SELECT MAX(payment_id) FROM Payment));


INSERT INTO Book(user_id,ticket_id,event_id)
  SELECT 1, ticket_id, event_id FROM Ticket WHERE payment_id=@pid;

INSERT INTO User (user_id, first_name, last_name, email, password, login_date, nationality)
VALUES (1001, 'Ali', 'Testci', 'ali@test.com',
  'scrypt:32768:8:1$rQ4wfAWxOqczGDwn$a8ac10a21b80a87cf7b737fdb311fe9d1b09eb33ee24c9112883c1a317e5c78ca21c8a8b33bb722326b378ab7b2746e95d9375a42c6060f9d6a3c29add35b521',
  CURDATE(), 'Turkish');

INSERT INTO Event_Attendee (user_id, street_no, street_name, apartment, city, state, zip, date_of_birth, age, budget)
VALUES (1001, 1, 'Test Street', 'A1', 'Ankara', 'TR', '06000', '1995-01-01', 29, 150.00);

-- 2. Organizer 1 (ID: 2001)
INSERT INTO User (user_id, first_name, last_name, email, password, login_date, nationality)
VALUES (2001, 'Organizer', 'One', 'org1@test.com', 'scrypt:32768:8:1$rQ4wfAWxOqczGDwn$a8ac10a21b80a87cf7b737fdb311fe9d1b09eb33ee24c9112883c1a317e5c78ca21c8a8b33bb722326b378ab7b2746e95d9375a42c6060f9d6a3c29add35b521', CURDATE(), 'Turkish');

INSERT INTO Event_Organiser (user_id, o_revenue, rating)
VALUES (2001, 1000.00, 4.5);

-- 3. Organizer 2 (ID: 2002)
INSERT INTO User (user_id, first_name, last_name, email, password, login_date, nationality)
VALUES (2002, 'Organizer', 'Two', 'org2@test.com', 'scrypt:32768:8:1$rQ4wfAWxOqczGDwn$a8ac10a21b80a87cf7b737fdb311fe9d1b09eb33ee24c9112883c1a317e5c78ca21c8a8b33bb722326b378ab7b2746e95d9375a42c6060f9d6a3c29add35b521', CURDATE(), 'Turkish');

INSERT INTO Event_Organiser (user_id, o_revenue, rating)
VALUES (2002, 500.00, 4.2);

-- 4. Follow relationships (Ali follows both organizers)
INSERT INTO Follow (event_attendee_id, event_organizer_id)
VALUES 
  (1001, 2001),
  (1001, 2002);
