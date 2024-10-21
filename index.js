const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { MONGODB_URL, PORT } = require('./config');

const app = express();

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected Successfully'))
.catch(err => console.log('MongoDB connection error:', err));

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
    console.log("Login attempt for user:", username);

    try {
        const user = await User.findOne({ username });
        console.log("User found:", user);

        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        console.log("Password match:", passwordMatch);
        console.log("Is Admin:", user.isAdmin);

        if (passwordMatch && user.isAdmin) {
            return res.status(200).json({ message: 'Login successful', isAdmin: true });
        } else {
            return res.status(403).json({ message: 'Unauthorized: Only admins can login' });
        }
    } catch (error) {
        console.error("Server error:", error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Admin User Creation Script (run once to create an admin user)
const createAdminUser = async () => {
    const adminUser = new User({
        username: 'admin',  // Change this as needed
        password: await bcrypt.hash('admin123', 10),  // Change as needed
        isAdmin: true,
    });

    try {
        await adminUser.save();
        console.log('Admin user created successfully!');
    } catch (error) {
        console.error('Error creating admin user:', error.message);
    } finally {
        mongoose.disconnect();
    }
};

// Uncomment the line below to create an admin user once
// createAdminUser();
