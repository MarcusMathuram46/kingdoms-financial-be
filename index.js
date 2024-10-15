const express = require('express');
const mongoose = require('mongoose');
const { MONGODB_URL, PORT } = require('./config');
const cors = require('cors')
const app = express();
app.use(cors())
app.use(express.json())
mongoose.connect(MONGODB_URL,{
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(()=> console.log('Mongodb Connected Successfully'))
.catch(err => console.log(err))

const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
})
const User = mongoose.model('User',UserSchema);
app.post('http://localhost:5173/api/login', async(req, res)=>{
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if(user){
        res.status(200).json({message: 'Login successful'})
    }else{
        res.status(401).json({message: 'Invalid credentials'})
    }
})
app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`)
})