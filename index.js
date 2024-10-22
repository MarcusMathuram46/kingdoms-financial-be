const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer'); // Import Multer for file uploads
const path = require('path');
const { MONGODB_URL, PORT } = require('./config');

const User = require('./models/User');
const Advertisement = require('./models/Advertisement'); // Ensure this path is correct

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// Set up Multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Save file with a unique name
    }
});
const upload = multer({ storage: storage });

// Serve static files in the 'uploads' directory
app.use('/uploads', express.static('uploads'));

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

// Route to create a new advertisement with image upload
app.post('/api/advertisements', upload.single('image'), async (req, res) => {
    const { title, description } = req.body;
    const imageUrl = `/uploads/${req.file.filename}`;  // Get the relative URL to the image

    const newAdvertisement = new Advertisement({
        title,
        image: imageUrl,  // Save the image URL in MongoDB
        description,
    });

    try {
        const savedAdvertisement = await newAdvertisement.save();
        res.status(201).json(savedAdvertisement);  // Send the created advertisement in response
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
