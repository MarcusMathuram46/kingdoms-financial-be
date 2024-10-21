const express = require('express');
const mongoose = require('mongoose');
const { MONGODB_URL, PORT } = require('./config');
const cors = require('cors');
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
    username: String,
    password: String,
    isAdmin: { type: Boolean, default: false }  // New field for admin status
});

const User = mongoose.model('User', UserSchema);

// Login Route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt: username=${username}, password=${password}`);
    
    try {
        const user = await User.findOne({ username, password });
        if (user) {
            console.log("User found:", user);  // Log the user object
            if (user.isAdmin) {
                res.status(200).json({ message: 'Login successful', isAdmin: true });
            } else {
                console.log("Unauthorized: User is not an admin");
                res.status(403).json({ message: 'Unauthorized: Only admins can login' });
            }
        } else {
            console.log("Invalid credentials: User not found");
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ message: 'Server error', error });
    }
});


// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
