// models/Visitor.js
const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
    ipAddress: { type: String, required: true },
    city: { type: String, required: true },
    region: { type: String, required: true },
    country: { type: String, required: true },
    visitTime: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Visitor', visitorSchema);
