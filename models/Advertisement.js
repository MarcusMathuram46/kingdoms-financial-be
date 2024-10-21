// models/Advertisement.js
const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    image: { type: String, required: true }, // URL of the image
    description: { type: String, required: true },
});

module.exports = mongoose.model('Advertisement', advertisementSchema);
