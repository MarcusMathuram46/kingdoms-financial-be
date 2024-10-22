const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { MONGODB_URL, PORT } = require('./config');

const User = require('./models/User');
// Import the Advertisement model
const Advertisement = require('./models/Advertisement'); // Ensure this path is correct

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());



// Login Route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (passwordMatch) {
            return res.status(200).json({ message: 'Login successful', isAdmin: user.isAdmin });
        } else {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error("Server error:", error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Route to get all advertisements
app.get('/api/advertisements', async (req, res) => {
    try {
        const advertisements = await Advertisement.find();
        res.json(advertisements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Route to create a new advertisement
app.post('/api/advertisements', async (req, res) => {
    const { title, image, description } = req.body;

    const newAdvertisement = new Advertisement({
        title,
        image,
        description,
    });

    try {
        const savedAdvertisement = await newAdvertisement.save();
        res.status(201).json(savedAdvertisement);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Connect to MongoDB and Start the Server
mongoose.connect(MONGODB_URL)
    .then(() => {
        console.log('MongoDB Connected Successfully');
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => console.log('MongoDB connection error:', err));

// Admin User Creation Script (Consider moving this to a separate script for initialization)
const createAdminUser = async () => {
    const adminUser = new User({
        username: 'admin',
        password: 'admin123', // Plain password; will be hashed
        isAdmin: true,
    });

    try {
        await adminUser.save();
    } catch (error) {
        if (error.code === 11000) {
            console.error('Admin user already exists:', error.message);
        } else {
            console.error('Error creating admin user:', error.message);
        }
    }
};

// Uncomment to run this function if needed
// createAdminUser();
