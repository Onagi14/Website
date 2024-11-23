const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/eventDB', { useNewUrlParser: true, useUnifiedTopology: true });

// Define Event Schema and Model
const eventSchema = new mongoose.Schema({
    event_name: String,
    event_date: Date,
    event_description: String,
    location: String,
    capacity: Number,
    deadline: Date,
    privacy: String
});
const Event = mongoose.model('Event', eventSchema);

// Handle form submission
app.post('/create-event', (req, res) => {
    const newEvent = new Event({
        event_name: req.body.event_name,
        event_date: req.body.event_date,
        event_description: req.body.event_description,
        location: req.body.location,
        capacity: req.body.capacity,
        deadline: req.body.deadline,
        privacy: req.body.privacy
    });
    newEvent.save(err => {
        if (err) {
            res.send('Error saving event.');
        } else {
            res.redirect('/browse-events.html'); // Redirect to the browse-events page
        }
    });
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
