const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

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

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set up Multer for handling file uploads (but won't save locally)
const storage = multer.memoryStorage(); // Store in memory since we'll upload directly to Cloudinary
const upload = multer({ storage });

// Handle image upload and save to Cloudinary
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No image uploaded' });
    }

    // Upload file to Cloudinary
    cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
        if (error) {
            console.error('Cloudinary upload error:', error);
            return res.status(500).json({ message: 'Failed to upload image', error });
        }

        res.json({ imageUrl: result.secure_url }); // Send back the Cloudinary URL
    }).end(req.file.buffer); // req.file.buffer holds the image data in memory
});

// Route to get all advertisements
app.get('/api/advertisements', async (req, res) => {
    try {
        const advertisements = await Advertisement.find();
        res.json(advertisements);
    } catch (error) {
        console.error('Error fetching advertisements:', error);
        res.status(500).json({ message: error.message });
    }
});

// Route to create a new advertisement with Cloudinary image upload
app.post('/api/advertisements', upload.single('image'), async (req, res) => {
    const { title, description } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: 'No image uploaded' });
    }

    // Upload image to Cloudinary
    cloudinary.uploader.upload_stream({ resource_type: 'image' }, async (error, result) => {
        if (error) {
            return res.status(500).json({ message: 'Failed to upload image to Cloudinary', error });
        }

        const newAdvertisement = new Advertisement({
            title,
            image: result.secure_url,  // Store Cloudinary image URL in the database
            description,
        });

        try {
            const savedAdvertisement = await newAdvertisement.save();
            res.status(201).json(savedAdvertisement);
        } catch (error) {
            console.error('Error saving advertisement:', error);
            res.status(400).json({ message: error.message });
        }
    }).end(req.file.buffer);
});

// Route to delete an advertisement
app.delete('/api/advertisements/:id', async (req, res) => {
    const { id } = req.params;

    console.log(`Attempting to delete advertisement with ID: ${id}`); // Log the ID being deleted

    try {
        const advertisement = await Advertisement.findById(id);

        if (!advertisement) {
            console.error(`Advertisement not found with ID: ${id}`); // Log if not found
            return res.status(404).json({ message: 'Advertisement not found' });
        }

        // Delete the image from Cloudinary
        const publicId = advertisement.image.split('/').pop().split('.')[0]; // Extract public ID from URL
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        console.log(`Image deleted from Cloudinary: ${publicId}`);

        // Delete the advertisement from the database
        await Advertisement.findByIdAndDelete(id);
        res.status(200).json({ message: 'Advertisement deleted successfully' });

    } catch (error) {
        console.error('Error deleting advertisement:', error);
        res.status(500).json({ message: error.message });
    }
});

// Route to update an advertisement and optionally change the image
app.put('/api/advertisements/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;

    try {
        const advertisement = await Advertisement.findById(id);

        if (!advertisement) {
            return res.status(404).json({ message: 'Advertisement not found' });
        }

        // Update title and description
        advertisement.title = title || advertisement.title;
        advertisement.description = description || advertisement.description;

        // If there's a new image, upload it to Cloudinary
        if (req.file) {
            const publicId = advertisement.image.split('/').pop().split('.')[0]; // Extract public ID from URL

            // Delete the old image from Cloudinary
            await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
            console.log(`Old image deleted from Cloudinary: ${publicId}`);

            // Upload the new image to Cloudinary
            cloudinary.uploader.upload_stream({ resource_type: 'image' }, async (error, result) => {
                if (error) {
                    return res.status(500).json({ message: 'Failed to upload new image', error });
                }

                // Update with the new Cloudinary URL
                advertisement.image = result.secure_url;
                const updatedAdvertisement = await advertisement.save();
                res.status(200).json(updatedAdvertisement);
            }).end(req.file.buffer);
        } else {
            const updatedAdvertisement = await advertisement.save();
            res.status(200).json(updatedAdvertisement);
        }

    } catch (error) {
        console.error('Error updating advertisement:', error);
        res.status(500).json({ message: error.message });
    }
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

// Admin User Creation Script (uncomment to run if needed)
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