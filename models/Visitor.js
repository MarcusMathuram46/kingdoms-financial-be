const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
    ipAddress: {
        type: String,
        required: true,
        unique: true,
    },
    city: String,
    region: String,
    country: String,
    visitTime: {
        type: Date,
        default: Date.now,
    },
});

const Visitor = mongoose.model('Visitor', visitorSchema);
module.exports = Visitor;
