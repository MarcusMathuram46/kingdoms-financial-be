const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  image: { type: String, required: true }, // URL of the image
  description: { type: String, required: true },
}); 

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
