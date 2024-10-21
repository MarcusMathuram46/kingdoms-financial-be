// server.js
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
}).then(() => console.log('Mongodb Connected Successfully'))
  .catch(err => console.log(err));

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
// Login Route

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);  // Compare hashed password
        if (passwordMatch && user.isAdmin) {
            res.status(200).json({ message: 'Login successful', isAdmin: true });
        } else {
            res.status(403).json({ message: 'Unauthorized: Only admins can login' });
        }
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ message: 'Server error', error });
    }
});



// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
