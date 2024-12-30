const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const moment = require('moment');

const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode'); // Import the qrcode package
const nodemailer = require('nodemailer');
require('dotenv').config(); // Load environment variables from .env file
const crypto = require('crypto'); // Make sure to require the crypto module at the top of your file
const app = express();
const multer = require('multer');
const port = 3001;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname)));   

app.use(express.static(path.join(__dirname, 'homepagr')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'homepagr', 'homepage.html'));
});


app.use(express.static(path.join(__dirname, 'folder')));  // Add more folders if needed
app.use(express.static(path.join(__dirname, 'profloginpage')));  // Add more folders if needed
app.use(express.static(path.join(__dirname, 'Studentspage')));  // Add more folders if needed
app.use(express.static(path.join(__dirname, 'uploads')));  // Add more folders if needed
app.use(express.static(path.join(__dirname, 'years')));  // Add more folders if needed



app.get('/adminlogin', (req, res) => {
res.sendFile(path.join(__dirname, 'homepagr', 'adminlogin.html'));
});
app.get('/adminsignup', (req, res) => {
res.sendFile(path.join(__dirname, 'adminsignup.html')); 
});
app.get('/dashboard', (req, res) => {
res.sendFile(path.join(__dirname, 'dashboard.html')); 
});
app.get('/Event_management', (req, res) => {
res.sendFile(path.join(__dirname, 'Event_management.html'));
});
app.get('/eventREgistration', (req, res) => {
res.sendFile(path.join(__dirname, 'eventREgistration.html'));
});

app.get('/forgotpassword', (req, res) => {
res.sendFile(path.join(__dirname, 'forgotpassword.html'));
});
app.get('/login', (req, res) => {
res.sendFile(path.join(__dirname, 'login.html'));
});
app.get('/prof-dashboard', (req, res) => {
res.sendFile(path.join(__dirname, 'prof-dashboard.html'));
});
app.get('/reset-password', (req, res) => {
res.sendFile(path.join(__dirname, 'reset-password.html'));
});
app.get('/signup', (req, res) => {
res.sendFile(path.join(__dirname, 'signup.html'));
});



mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
});

// User Schema and Model
const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    
    student_id: { type: String },
    organizer_department: { type: String },
    password: { type: String, required: true },
    year: String,
    section: String,
    events_registered: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }], // New field
    resetToken: String, // This should match what you're saving
    resetTokenExpiration: Date, // This should match what you're saving
   

});

const User = mongoose.model('User', userSchema); 







// Event Schema and Model

// Middleware to authenticate token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, 'YOUR_SECRET_KEY', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        req.user = user;
        next();
    });
}


function authenticateProfessorToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // No token found

    jwt.verify(token, 'yourSecretKey', (err, user) => {
        if (err) return res.sendStatus(403); // Invalid token
        req.user = user;
        next();
    });
}

function authenticateAdminToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, 'YOUR_SECRET_KEY', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        req.user = user;
        next();
    });
}

let transporter = nodemailer.createTransport({
    service: 'gmail', // Use 'gmail' service
    auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS,  // Your email password or app password
    },
    secure: true, // Use SSL
    tls: {
        rejectUnauthorized: false, // Accept self-signed certificates
    },
});
// Password reset route
// Password reset route
app.post('/forgot-password', async (req, res) => {
const { email } = req.body;

// Check if the email is provided
if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
}

try {
    // Check if the email exists in your database
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(20).toString('hex'); // Generate a token
    user.resetToken = resetToken; // Save it in the user's record
    user.resetTokenExpiration = Date.now() + 3600000; // Token expires in 1 hour
    await user.save(); // Save the user with the token and expiry

    // Construct the reset link with query parameters
    const resetLink = `http://localhost:3001/reset-password?token=${resetToken}&email=${email}`;

    // Send email with reset link
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Request',
        html: `Click here to reset your password: <a href="${resetLink}">Reset Password</a>`,
    });

    res.status(200).json({ message: 'Email sent successfully!' });

} catch (error) {
    console.error('Error in /forgot-password route:', error);
    res.status(500).json({ error: 'Error sending email: ' + error.message });
}
});


// Serve the reset password HTML page
app.get('/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'reset-password.html'), (err) => {
        if (err) {
            console.error('Error sending reset-password.html:', err);
            res.status(err.status).end();
        }
    });
});

app.post('/reset-password', async (req, res) => {
    const { token, email, newPassword } = req.body;

    // Check if the token, email, and new password are provided
    if (!token || !email || !newPassword) {
        return res.status(400).json({ error: 'Token, email, and new password are required.' });
    }

    try {
        // Find the user by email and token
        const user = await User.findOne({
            email,
            resetToken: token, // Use the correct field name
            resetTokenExpiration: { $gt: Date.now() } // Use the correct field name
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired token.' });
        }

        // Hash the new password
        user.password = await bcrypt.hash(newPassword, 10); // Hash the new password
        user.resetToken = undefined; // Clear the reset token
        user.resetTokenExpiration = undefined; // Clear the expiration time
        await user.save(); // Save the updated user

        res.status(200).json({ message: 'Password has been reset successfully!' });
    } catch (error) {
        console.error('Error in /reset-password route:', error);
        return res.status(500).json({ error: 'Error resetting password: ' + error.message });
    }
});

// Signup route
app.post('/submit_signup', async (req, res) => {
const { fullname, email, student_id, organizer_department, password , year,section} = req.body;

if (!fullname || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields.' });
}

if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
}



try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ error: 'Account already exists with this email.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
        fullname,
        email,
        student_id,
        organizer_department,
        password: hashedPassword,
        year,
        section
    });

    await newUser.save();
    res.status(200).json({ message: 'Signup successful!' });
} catch (error) {
    res.status(500).json({ error: 'Failed to save user to the database.' });
}
});

// Login route
app.post('/login', async (req, res) => {
const { email, password } = req.body;

if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
}

try {
    const user = await User.findOne({ email });

    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id }, 'YOUR_SECRET_KEY');

    res.status(200).json({
        message: 'Login successful',
        fullname: user.fullname,
        token: token
    });
} catch (error) {
    res.status(500).json({ error: 'Internal server error' });
}
});

// Get student details route
app.get('/api/get_student_details', authenticateToken, async (req, res) => {
try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ fullname: user.fullname, email: user.email, student_id: user.student_id, year: user.year, section: user.section });
} catch (error) {
    res.status(500).json({ error: 'Internal server error' });
}
});

// Change password route
app.post('/api/change_password', authenticateToken, async (req, res) => {
const { currentPassword, newPassword } = req.body;

if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new passwords are required.' });
}

if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
}

try {
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(currentPassword, user.password);

    if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedNewPassword;
    await user.save();

    // Notify the user
    const notificationMessage = 'Your password has been successfully changed.';
    
    // Here you can save the notification in the database if you have a notifications collection
    await Notification.create({
        userId: user._id,
        message: notificationMessage,
        createdAt: new Date()
    });

    res.status(200).json({ success: true, notification: notificationMessage });
} catch (error) {
    res.status(500).json({ error: 'Internal server error' });
}
});
const notificationSchema = new mongoose.Schema({
userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
},
message: {
    type: String,
    required: true,
},
createdAt: {
    type: Date,
    default: Date.now,
},

isRead: {
    type: Boolean,
    default: false, // New field to track if the notification is read
},
});

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
app.get('/api/notifications', authenticateToken, async (req, res) => {
console.log('User ID:', req.user.id); // Log the user ID
try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
} catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ error: 'Internal server error' });
}
});

app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
const notificationId = req.params.id;

try {
    const deletedNotification = await Notification.findByIdAndDelete(notificationId);
    if (!deletedNotification) {
        return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification deleted successfully' });
} catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Internal Server Error' });
}
});


app.post('/api/notifications/send', authenticateToken, async (req, res) => {
const { message } = req.body;

if (!message) {
    return res.status(400).json({ message: 'Notification message is required.' });
}

try {
    // Retrieve all users from the database (you might have a User model)
    const users = await User.find(); // Ensure you have a User model set up
    const notifications = users.map(user => ({
        userId: user._id,
        message: message,
        createdAt: new Date()
    }));

    // Save notifications to the database
    await Notification.insertMany(notifications);

    res.status(201).json({ message: 'Notifications sent successfully.' });
} catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
}
});



app.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
const notificationId = req.params.id;

try {
    const updatedNotification = await Notification.findByIdAndUpdate(
        notificationId,
        { isRead: true },
        { new: true }
    );

    if (!updatedNotification) {
        return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json(updatedNotification);
} catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Internal Server Error' });
}
});









app.post('/api/update_profile', authenticateToken, async (req, res) => {
const { year, section } = req.body;
const userId = req.user.id; // Use the ID from the token

try {
    // Update the user's profile in the database
    const result = await User.updateOne(
        { _id: userId }, // Find the user by ID
        { $set: { year: year, section: section } } // Update year and section
    );

    if (result.nModified === 0) {
        return res.status(404).json({ error: 'User not found or no changes made' });
    }

    res.json({ message: 'Profile updated successfully' });
} catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
}
});




// Admin Schema and Model
const adminSchema = new mongoose.Schema({
fullname: { type: String, required: true },
email: { type: String, required: true, unique: true },

password: { type: String, required: true }

});

const Admin = mongoose.model('Admin', adminSchema);

// Admin Signup route
app.post('/submit_adminsignup', async (req, res) => {
const { fullname, email,  password } = req.body;

if (!fullname || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields.' });
}

if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
}




try {
    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ error: 'Account already exists with this email.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
        fullname,
        email,
    
       
     
        password: hashedPassword
    });

    await newAdmin.save();
    res.status(200).json({ message: 'Signup successful!' });
} catch (error) {
    res.status(500).json({ error: 'Failed to save user to the database.' });
}
});



app.get('/verify-token', authenticateAdminToken, (req, res) => {
    res.status(200).json({ message: 'Token is valid' });
});

// Admin Login route
app.post('/adminlogin', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Find the admin in the database
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Compare the password
        const match = await bcrypt.compare(password, admin.password);

        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate a token
        const token = jwt.sign({ id: admin._id }, 'YOUR_SECRET_KEY');

        res.status(200).json({
            message: 'Login successful',
            fullname: admin.fullname,
            token: token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});




const fs = require('fs/promises');


const eventSchema = new mongoose.Schema({
event_name: { type: String, required: true },
event_date: { type: Date, required: true },
event_description: { type: String, required: true },
location: { type: String, required: true },

deadline: { type: Date, required: true },
privacy: { type: String, enum: ['public', 'invite-only'], required: true },
folder_name: { type: String, required: true } // Store the folder name in the database


});
const Event = mongoose.model('Event', eventSchema);


// Route to create an event and insert folder_name to database
app.post('/create_event', async (req, res) => {
    const { event_name, event_date, event_description, location, deadline, privacy } = req.body;
    
    // Check for required fields
    if (!event_name || !event_date || !event_description || !location || !deadline || !privacy) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }
    
    try {
        // Create a folder name based on event name (You can adjust this as needed)
        const folderName = event_name.replace(/\s+/g, '_').toLowerCase(); // Sanitize folder name
        
        // Create a new event instance with folder_name included
        const newEvent = new Event({
            event_name,
            event_date,
            event_description,
            location,
            deadline,
            privacy,
            folder_name: folderName // Save the folder name in the database
        });
    
        // Save the event to the database
        await newEvent.save();
    
        // Optional: Create a directory for the event (if you still want to keep it on the filesystem)
        const folderPath = path.join(__dirname, 'folder', folderName);
        await fs.mkdir(folderPath, { recursive: true });
    
        res.status(200).json({ message: 'Event created successfully with folder!' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to save event to the database.' });
    }
});

    // List folders API
    app.get('/list_folders', async (req, res) => {
    const folderPath = path.join(__dirname, 'folder'); // Adjust this path as needed
    
    try {
        // Read the contents of the directory
        const folders = await fs.readdir(folderPath, { withFileTypes: true });
        
        // Filter out directories only
        const folderNames = folders
            .filter(dirent => dirent.isDirectory()) // Keep only directories
            .map(dirent => dirent.name); // Get the names of directories
    
        res.status(200).json(folderNames); // Send folder names as a response
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to list folders.' });
    }
    });
    
    app.get('/get_folders', async (req, res) => {
        try {
            const events = await Event.find({}, 'folder_name'); // Fetch only folder names
            const folderNames = events.map(event => event.folder_name); // Extract folder names
            res.json(folderNames); // Send folder names as response
        } catch (error) {
            console.error('Error fetching folders:', error);
            res.status(500).json({ error: 'Failed to fetch folders' });
        }
    });



// API endpoint to get folder names
app.get('/get_folders', async (req, res) => {
try {
    const events = await Event.find({}, 'event_name'); // Fetch only event names
    const folderNames = events.map(event => event.event_name); // Extract event names
    res.json(folderNames); // Send folder names as response
} catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
}
});





// Event registration and QR code generation route
// Event Registration Route
app.post('/register_event/:eventId', authenticateToken, async (req, res) => {
const { eventId } = req.params;

try {
    const event = await Event.findById(eventId);
    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already registered for the event
    if (user.events_registered.includes(eventId)) {
        return res.status(400).json({ error: 'You are already registered for this event' });
    }

    // Register the event for the user
    user.events_registered.push(eventId);
    await user.save();

    // Generate QR Code with user and event-specific data
    const qrData = {
        fullname: user.fullname,
        email: user.email,
        student_id: user.student_id,
        event_name: event.event_name,
        event_date: event.event_date
    };

    const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData));

    res.status(200).json({
        message: 'Registration successful!',
        qrCodeUrl: qrCodeUrl,
        event_name: event.event_name
    });
} catch (error) {
    console.error('Event registration error:', error);
    res.status(500).json({ error: 'Failed to register for event.' });
}
});

// Get Events Route
app.get('/events', async (req, res) => {
try {
    const events = await Event.find();
    res.status(200).json(events);
} catch (error) {
    res.status(500).json({ error: 'Failed to fetch events.' });
}
});

// Update Event Route
app.put('/events/:eventId', async (req, res) => {
const eventId = req.params.eventId;
const { event_name, event_date, event_description, location, deadline, privacy } = req.body;

try {
    const event = await Event.findByIdAndUpdate(
        eventId,
        {
            event_name,
            event_date,
            event_description,
            location,
           
            deadline,
            privacy
        },
        { new: true }
    );

    if (!event) return res.status(404).json({ error: 'Event not found' });

    res.status(200).json({ message: 'Event updated successfully!', event });
} catch (error) {
    res.status(500).json({ error: 'Failed to update event.' });
}
});

// Delete Event Route
app.delete('/events/:eventId', async (req, res) => {
const eventId = req.params.eventId;

try {
    const event = await Event.findByIdAndDelete(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    res.status(200).json({ message: 'Event deleted successfully' });
} catch (error) {
    res.status(500).json({ error: 'Failed to delete event.' });
}
});

// Get Registered Events for the Logged-In User
app.get('/my-events', authenticateToken, async (req, res) => {
try {
    // Find the user based on the authenticated token
    const user = await User.findById(req.user.id).populate('events_registered');
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    // Send the registered events
    res.status(200).json(user.events_registered);
} catch (error) {
    console.error('Error fetching registered events:', error);
    res.status(500).json({ error: 'Failed to fetch registered events.' });
}
});

// Route to fetch registered events for a logged-in user
app.post('/register-event', authenticateToken, async (req, res) => {
const { eventId } = req.body;
try {
    // Assuming Event model is defined and eventId exists
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Add the event ID to the user's events_registered array
    await User.findByIdAndUpdate(req.user.id, {
        $addToSet: { events_registered: eventId } // Use $addToSet to avoid duplicates
    });

    res.status(200).json({ message: 'Event registered successfully' });
} catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ error: 'Failed to register for event.' });
}
});

// Attendance Schema

const attendanceSchema = new mongoose.Schema({
    event_name: String,
    name: String,
    Register_Date: {
        type: Date,
        default: function() {
            return new Date(); // Automatically stores the current date and time
        }
    },
    email: String,
    studentID: String,
    year: String,
    section: String,
});


const Attendance = mongoose.model('Attendance', attendanceSchema);

// Function to calculate the month range and fetch data
function getMonthRange(startMonth, endMonth) {
    const monthOrder = [
        'January', 'February', 'March', 'April', 'May', 
        'June', 'July', 'August', 'September', 
        'October', 'November', 'December'
    ];

    const startIndex = monthOrder.indexOf(startMonth);
    const endIndex = monthOrder.indexOf(endMonth);

    if (startIndex === -1 || endIndex === -1) {
        return { error: 'Invalid month name provided' };
    }

    const startDate = new Date();
    const endDate = new Date();

    // Set startDate to the first day of the start month, at midnight
    startDate.setFullYear(new Date().getFullYear());  // Set to the current year
    startDate.setMonth(startIndex);
    startDate.setDate(1); // First day of the start month
    startDate.setHours(0, 0, 0, 0); // Midnight

    // Set endDate to the last day of the end month, at 23:59:59.999
    endDate.setFullYear(new Date().getFullYear());
    endDate.setMonth(endIndex + 1);  // End month is exclusive, so add 1
    endDate.setDate(0); // Last day of the end month
    endDate.setHours(23, 59, 59, 999); // End of the day

    return { startDate, endDate };
}

// Endpoint to fetch attendees based on month range
app.get('/api/attendees-by-month', async (req, res) => {
    const { startMonth, endMonth } = req.query;

    if (!startMonth || !endMonth) {
        return res.status(400).json({ error: 'Both startMonth and endMonth parameters are required' });
    }

    try {
        const { startDate, endDate, error } = getMonthRange(startMonth, endMonth);

        if (error) {
            return res.status(400).json({ error: error });
        }

        // Log the start and end dates for debugging
        console.log(`Fetching data for range: ${startDate} to ${endDate}`);

        // Query the database to get the attendees within the date range
        const attendees = await Attendance.aggregate([
            {
                $match: {
                    Register_Date: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $group: {
                    _id: "$event_name", // Group by event name
                    registered: { $sum: 1 } // Count registrations
                }
            }
        ]);

        if (attendees.length === 0) {
            return res.status(404).json({ attendees: [] });
        }
        
        // Send the results back as JSON
        return res.json({ attendees });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Fetch attendees for a specific event by event name
app.get("/api/attendees/:eventName", async (req, res) => {
    const eventName = req.params.eventName.trim();  // Ensure no extra spaces
    console.log(`Fetching attendees for event: ${eventName}`);
    try {
        const attendees = await Attendance.find({ event_name: eventName });
        console.log('Attendees found:', attendees);
        res.status(200).json(attendees);  // Send attendees data as JSON response
    } catch (err) {
        console.error("Error fetching attendees:", err);
        res.status(500).json({ error: "An error occurred while fetching attendees" });
    }
});


app.delete('/delete_folder/:folderName', async (req, res) => {
const folderName = req.params.folderName; // The folder name is the event name
console.log("Received request to delete event and folder:", folderName);

try {
    // Find and delete the event from the 'events' collection
    const deletedEvent = await Event.findOneAndDelete({ event_name: folderName });

    if (!deletedEvent) {
        console.log("Event not found for deletion:", folderName);
        return res.status(404).json({ error: 'Event not found' });
    }

    // If event is deleted from the database, delete its folder
    const folderPath = path.join(__dirname, 'folder', folderName);
    try {
        await fs.rmdir(folderPath, { recursive: true }); // Delete the folder recursively
        console.log(`Folder "${folderName}" deleted successfully.`);
    } catch (folderError) {
        console.error(`Failed to delete folder "${folderName}":`, folderError);
        return res.status(500).json({ error: 'Failed to delete folder' });
    }

    // Respond with a success message
    res.status(200).json({ message: `Event and folder "${folderName}" deleted successfully` });
} catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete the event' });
}
});




const profSchema = new mongoose.Schema({
fullname: { type: String, required: true },
email: { type: String, required: true, unique: true },
password: { type: String, required: true }
});

// Pre-save hook to hash the password before saving
profSchema.pre('save', async function (next) {
try {
    if (!this.isModified('password')) {
        return next(); // Only hash the password if it has been modified or is new
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
} catch (error) {
    next(error);
}
});

// Create a model for the professor
const Prof = mongoose.model('Prof', profSchema);

module.exports = Prof;

app.post('/submit_profsignup', async (req, res) => {
const { fullname, email, password } = req.body;

try {
    // Check if professor/admin already exists
    let professor = await Prof.findOne({ email });
    if (professor) {
        return res.status(400).json({ error: 'Professor account already exists with this email' });
    }

    // Create a new professor/admin instance
    professor = new Prof({
        fullname,
        email,
        password // Password will be hashed automatically in the pre-save hook
    });

    // Save the new professor to the database
    await professor.save();

    // Optionally, create a JWT token
    const payload = { user: { id: professor.id } };
    const token = jwt.sign(payload, 'yourSecretKey', { expiresIn: '1h' });

    res.status(201).send('Signup successful');
} catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
}
});
app.post('/proflogin', async (req, res) => {
const { email, password } = req.body;

try {
    // Find the professor by email
    const professor = await Prof.findOne({ email });

    // If no professor is found, return error
    if (!professor) {
        console.log('Email not found:', email);  // Debugging log
        return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Compare the entered password with the hashed password stored in the database
    const isMatch = await bcrypt.compare(password, professor.password);
    if (!isMatch) {
        console.log('Password does not match. Entered:', password);  // Debugging log
        return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate and return a JWT token on successful login
    const payload = { user: { id: professor.id } };
    const token = jwt.sign(payload, 'yourSecretKey', { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful', token });
} catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Server error' });
}
});

app.get('/api/get_professor_details', (req, res) => {
const token = req.headers.authorization?.split(' ')[1];
if (!token) {
    return res.status(401).send({ error: 'Unauthorized' });
}

// Your logic to retrieve professor details
jwt.verify(token, 'yourSecretKey', (err, decoded) => {
    if (err) {
        return res.status(403).send({ error: 'Token is not valid' });
    }

    // Assuming you are storing professor ID in the token
    Prof.findById(decoded.user.id) // Change this line
        .then(professor => {
            if (!professor) {
                return res.status(404).send({ error: 'Professor not found' });
            }
            res.send(professor); // Sends back the entire professor object
        })
        .catch(dbError => {
            console.error('Database error:', dbError);
            res.status(500).send({ error: 'Database error' });
        });
});
});



// Password reset route for admin
app.post('/forgot-adminpassword', async (req, res) => {
const { email } = req.body;

// Check if the email is provided
if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
}

try {
    // Check if the email exists in your database
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(20).toString('hex'); // Generate a token
    user.resetToken = resetToken; // Save it in the user's record
    user.resetTokenExpiration = Date.now() + 3600000; // Token expires in 1 hour
    await user.save(); // Save the user with the token and expiry

    // Construct the reset link with query parameters
    const resetLink = `https://website-f9gk.onrender.com/reset-adminpassword?token=${resetToken}&email=${email}`;

    // Send email with reset link
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Request',
        html: `Click here to reset your password: <a href="${resetLink}">Reset Password</a>`,
    });

    res.status(200).json({ message: 'Email sent successfully!' });

} catch (error) {
    console.error('Error in /forgot-adminpassword route:', error);
    res.status(500).json({ error: 'Error sending email: ' + error.message });
}
});


// Serve the reset password HTML page
app.get('/reset-adminpassword', (req, res) => {
    res.sendFile(path.join(__dirname, 'reset-password.html'), (err) => {
        if (err) {
            console.error('Error sending reset-password.html:', err);
            res.status(err.status).end();
        }
    });
});

app.post('/reset-adminpassword', async (req, res) => {
    const { token, email, newPassword } = req.body;

    // Check if the token, email, and new password are provided
    if (!token || !email || !newPassword) {
        return res.status(400).json({ error: 'Token, email, and new password are required.' });
    }

    try {
        // Find the user by email and token
        const user = await User.findOne({
            email,
            resetToken: token, // Use the correct field name
            resetTokenExpiration: { $gt: Date.now() } // Use the correct field name
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired token.' });
        }

        // Hash the new password
        user.password = await bcrypt.hash(newPassword, 10); // Hash the new password
        user.resetToken = undefined; // Clear the reset token
        user.resetTokenExpiration = undefined; // Clear the expiration time
        await user.save(); // Save the updated user

        res.status(200).json({ message: 'Password has been reset successfully!' });
    } catch (error) {
        console.error('Error in /reset-password route:', error);
        return res.status(500).json({ error: 'Error resetting password: ' + error.message });
    }
});



// Password reset route for prof
app.post('/forgot-profpassword', async (req, res) => {
const { email } = req.body;

// Check if the email is provided
if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
}

try {
    // Check if the email exists in your database
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(20).toString('hex'); // Generate a token
    user.resetToken = resetToken; // Save it in the user's record
    user.resetTokenExpiration = Date.now() + 3600000; // Token expires in 1 hour
    await user.save(); // Save the user with the token and expiry

    // Construct the reset link with query parameters
    const resetLink = `https://website-f9gk.onrender.com/reset-profpassword?token=${resetToken}&email=${email}`;

    // Send email with reset link
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Request',
        html: `Click here to reset your password: <a href="${resetLink}">Reset Password</a>`,
    });

    res.status(200).json({ message: 'Email sent successfully!' });

} catch (error) {
    console.error('Error in /forgot-profpassword route:', error);
    res.status(500).json({ error: 'Error sending email: ' + error.message });
}
});


// Serve the reset password HTML page
app.get('/reset-profpassword', (req, res) => {
    res.sendFile(path.join(__dirname, 'reset-profpassword.html'), (err) => {
        if (err) {
            console.error('Error sending reset-profpassword.html:', err);
            res.status(err.status).end();
        }
    });
});

app.post('/reset-profpassword', async (req, res) => {
    const { token, email, newPassword } = req.body;

    // Check if the token, email, and new password are provided
    if (!token || !email || !newPassword) {
        return res.status(400).json({ error: 'Token, email, and new password are required.' });
    }

    try {
        // Find the user by email and token
        const user = await User.findOne({
            email,
            resetToken: token, // Use the correct field name
            resetTokenExpiration: { $gt: Date.now() } // Use the correct field name
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired token.' });
        }

        // Hash the new password
        user.password = await bcrypt.hash(newPassword, 10); // Hash the new password
        user.resetToken = undefined; // Clear the reset token
        user.resetTokenExpiration = undefined; // Clear the expiration time
        await user.save(); // Save the updated user

        res.status(200).json({ message: 'Password has been reset successfully!' });
    } catch (error) {
        console.error('Error in /reset-profpassword route:', error);
        return res.status(500).json({ error: 'Error resetting password: ' + error.message });
    }
});



const upcomingEventSchema = new mongoose.Schema({
    eventTitle: { type: String, required: true },
    eventDescription: { type: String, required: true },
    eventImage: { type: String, required: true },
    eventDate: { type: Date, required: true }, // Date of the upcoming event
    eventTime: { type: String, required: true }, // Time of the event
    eventLocation: { type: String, required: true } // Location of the event
});

// Upcoming Event Model
const UpcomingEvent = mongoose.model('UpcomingEvent', upcomingEventSchema);




const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Make sure you have a directory named 'uploads'
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // File name with a timestamp
    }
});
const upload = multer({ storage: storage });

// Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); 
app.post('/api/create-event', upload.single('eventImage'), async (req, res) => {
    const { eventTitle, eventDescription, eventDate, eventTime, eventLocation } = req.body;
    const eventImage = req.file ? `/uploads/${req.file.filename}` : null;

    console.log('Form Data:', req.body);
    console.log('Uploaded File:', req.file);

    // Validate all required fields
    if (!eventTitle || !eventDescription || !eventDate || !eventTime || !eventLocation || !eventImage) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const newEvent = new UpcomingEvent({
            eventTitle,
            eventDescription,
            eventImage,
            eventDate,
            eventTime,
            eventLocation
        });

        await newEvent.save();
        res.status(201).json({ message: 'Upcoming event created successfully', event: newEvent });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ message: 'Failed to create upcoming event' });
    }
});








// Start the server
app.listen(port, () => {
console.log(`Server running on http://localhost:${port}`);
});
