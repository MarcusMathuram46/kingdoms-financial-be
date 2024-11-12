require('dotenv').config();

const MONGODB_URL = process.env.MONGODB_URL;
const PORT = process.env.PORT;
const FRONTEND_URL = process.env.FRONTEND_URL
module.exports={
    MONGODB_URL,
    PORT,
    FRONTEND_URL,
}