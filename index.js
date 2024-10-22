const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { MONGODB_URL, PORT } = require('./config');

const User = require('./models/User');
const Advertisement = require('./models/Advertisement');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// Create 'uploads' directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log('Uploads directory created');
}

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(uploadsDir));

// Set up Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir); // Save files to the 'uploads' directory
    },
    filename: (req, file, cb) => {
        // Use a timestamp to create unique filenames
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

// Initialize Multer for image upload
const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/; // Allowed file types
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        console.log(`File type: ${file.mimetype}, Extname: ${path.extname(file.originalname)}`); // Log file type info

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb('Error: File type not supported');
    },
});

// Handle image upload
app.post('/api/upload', (req, res) => {
    console.log('Received upload request');

    upload.single('image')(req, res, (err) => {
        console.log('Inside multer middleware');

        if (err) {
            console.error("Multer error:", err);
            return res.status(500).json({ message: 'File upload failed', error: err.message });
        }

        if (!req.file) {
            console.log('No file uploaded:', req.file);
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        console.log('File uploaded successfully:', imageUrl);
        res.json({ imageUrl });
    });
});

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
        image,  // Ensure image URL is passed here after upload
        description,
    });

    try {
        const savedAdvertisement = await newAdvertisement.save();
        res.status(201).json(savedAdvertisement);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something broke!' });
});

// Connect to MongoDB and Start the Server
mongoose.connect(MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('MongoDB Connected Successfully');
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => console.log('MongoDB connection error:', err));

// Admin User Creation Script
const createAdminUser = async () => {
    const adminUser = new User({
        username: 'admin',
        password: await bcrypt.hash('admin123', 10),
        isAdmin: true,
    });

    try {
        await adminUser.save();
        console.log('Admin user created successfully');
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
