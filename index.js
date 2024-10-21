const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { MONGODB_URL, PORT } = require('./config');

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:5173', // Replace with your frontend URL
    credentials: true // Allow credentials if needed
}));
app.use(express.json());

// User Schema
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false }  // Admin field
});

// Hash the password before saving it to the database
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('User', UserSchema);

// Login Route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    console.log("Login attempt for user:", username);  // Log username

    try {
        const user = await User.findOne({ username });
        console.log("User found:", user);  // Log found user

        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        console.log("Password match:", passwordMatch);  // Log password match

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

// Connect to MongoDB and Start the Server
mongoose.connect(MONGODB_URL)
    .then(() => {
        console.log('MongoDB Connected Successfully');
        // Start the server only after successful DB connection
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

        // Optionally create an admin user
        createAdminUser(); // Call the function to create admin user (uncomment if needed)
    })
    .catch(err => console.log('MongoDB connection error:', err));

// Admin User Creation Script
const createAdminUser = async () => {
    const adminUser = new User({
        username: 'admin',
        password: 'admin123', // Plain password, will be hashed by the pre('save') middleware
        isAdmin: true,
    });

    try {
        await adminUser.save();
        console.log('Admin user created successfully!');
    } catch (error) {
        if (error.code === 11000) {
            console.error('Admin user already exists:', error.message);
        } else {
            console.error('Error creating admin user:', error.message);
        }
    }
    // Remove mongoose.disconnect(); to keep the connection alive
};
