const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const winston = require('winston');

// Load environment variables from .env file
dotenv.config();

const { MONGODB_URL, PORT = 5000, FRONTEND_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

const User = require('./models/User');
const Advertisement = require('./models/Advertisement');

const app = express();

// Configure logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ],
});

// Middleware
app.use(cors({
    origin: FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// Configure Cloudinary
cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
});

// Set up Multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware to validate advertisement data
const validateAdvertisement = (req, res, next) => {
    const { title, description } = req.body;
    if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required' });
    }
    next();
};

// Handle image upload and save to Cloudinary
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No image uploaded' });
    }

    cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
        if (error) {
            logger.error('Cloudinary upload error:', { error });
            return res.status(500).json({ message: 'Failed to upload image', error: error.message });
        }

        res.json({ imageUrl: result.secure_url });
    }).end(req.file.buffer);
});

// Route to get all advertisements
app.get('/api/advertisements', async (req, res) => {
    try {
        const advertisements = await Advertisement.find();
        res.json(advertisements);
    } catch (error) {
        logger.error('Error fetching advertisements:', { error });
        res.status(500).json({ message: error.message });
    }
});

// Route to create a new advertisement
app.post('/api/advertisements', upload.single('image'), validateAdvertisement, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No image uploaded' });
    }

    cloudinary.uploader.upload_stream({ resource_type: 'image' }, async (error, result) => {
        if (error) {
            logger.error('Failed to upload image to Cloudinary:', { error });
            return res.status(500).json({ message: 'Failed to upload image to Cloudinary', error: error.message });
        }

        const newAdvertisement = new Advertisement({
            title: req.body.title,
            image: result.secure_url,
            description: req.body.description,
        });

        try {
            const savedAdvertisement = await newAdvertisement.save();
            res.status(201).json(savedAdvertisement);
        } catch (error) {
            logger.error('Error saving advertisement:', { error });
            res.status(400).json({ message: error.message });
        }
    }).end(req.file.buffer);
});

// Route to delete an advertisement
app.delete('/api/advertisements/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const advertisement = await Advertisement.findById(id);
        if (!advertisement) {
            return res.status(404).json({ message: 'Advertisement not found' });
        }

        // Delete the image from Cloudinary
        const publicId = advertisement.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });

        await Advertisement.findByIdAndDelete(id);
        res.status(200).json({ message: 'Advertisement deleted successfully' });

    } catch (error) {
        logger.error('Error deleting advertisement:', { error });
        res.status(500).json({ message: error.message });
    }
});

// Route to update an advertisement
app.put('/api/advertisements/:id', upload.single('image'), validateAdvertisement, async (req, res) => {
    const { id } = req.params;

    try {
        const advertisement = await Advertisement.findById(id);
        if (!advertisement) {
            return res.status(404).json({ message: 'Advertisement not found' });
        }

        // Update title and description
        advertisement.title = req.body.title || advertisement.title;
        advertisement.description = req.body.description || advertisement.description;

        if (req.file) {
            const publicId = advertisement.image.split('/').pop().split('.')[0];

            await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });

            cloudinary.uploader.upload_stream({ resource_type: 'image' }, async (error, result) => {
                if (error) {
                    logger.error('Failed to upload new image:', { error });
                    return res.status(500).json({ message: 'Failed to upload new image', error: error.message });
                }

                advertisement.image = result.secure_url;
                const updatedAdvertisement = await advertisement.save();
                res.status(200).json(updatedAdvertisement);
            }).end(req.file.buffer);
        } else {
            const updatedAdvertisement = await advertisement.save();
            res.status(200).json(updatedAdvertisement);
        }

    } catch (error) {
        logger.error('Error updating advertisement:', { error });
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
        logger.error("Server error:", { error });
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({ message: 'Something broke!' });
});

// Connect to MongoDB and Start the Server
mongoose.connect(MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        logger.info('MongoDB Connected Successfully');
        app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        logger.error('MongoDB connection error:', { err });
        process.exit(1); // Exit process with failure
    });

// Admin User Creation Script (uncomment to run if needed)
const createAdminUser = async () => {
    const adminUser = new User({
        username: 'admin',
        password: await bcrypt.hash('admin123', 10),
        isAdmin: true,
    });

    try {
        await adminUser.save();
        logger.info('Admin user created successfully');
    } catch (error) {
        if (error.code === 11000) {
            logger.warn('Admin user already exists:', error.message);
        } else {
            logger.error('Error creating admin user:', { error });
        }
    }
};

// Uncomment to run this function if needed
// createAdminUser();

