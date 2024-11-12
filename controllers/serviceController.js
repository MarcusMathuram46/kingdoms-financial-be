const Service = require("../models/Service");
const mongoose = require("mongoose");
const path = require("path");

exports.createService = async (req, res, next) => {
  const { title, description } = req.body;
  const image = req.file ? req.file.path : null;

  if (!title || !description) {
    return res
      .status(400)
      .json({ message: "Title and description are required" });
  }

  try {
    const newService = new Service({ title, image, description });
    const savedService = await newService.save();

    // Correct the image URL to be publicly accessible
    savedService.image = savedService.image
      ? `http://localhost:5000/uploads/${savedService.image
          .split(path.sep)
          .join("/")}`
      : null;

    res.status(201).json(savedService);
  } catch (error) {
    console.error("Error saving service:", error);
    res.status(400).json({ message: error.message });
  }
};

//update a service by ID
exports.updateService = async (req, res, next) => {
  const { title, description } = req.body;
  const image = req.file ? req.file.path : undefined;

  if (!title || !description) {
    return res
      .status(400)
      .json({ message: "Title and description are required" });
  }

  try {
    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      { title, description, image },
      { new: true, runValidators: true }
    );

    if (!updatedService) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json(updatedService);
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(400).json({ message: error.message });
  }
};

// delete a service by ID

exports.deleteService = async (req, res, next) => {
  try {
    const deletedService = await Service.findByIdAndDelete(req.params.id);

    if (!deletedService) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteSelectedService = async (req, res, next) => {
  console.log("Received delete request with ids:", req.body.ids); // Log the received IDs
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No service IDs provided" });
    }

    // Ensure ObjectId is created using 'new' syntax
    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id)); // Ensure to use 'new'

    const result = await Service.deleteMany({ _id: { $in: objectIds } });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ message: "No services found with the provided IDs" });
    }

    res.status(200).json({ message: "Selected services deleted successfully" });
  } catch (error) {
    console.error("Error deleting services:", error);
    res
      .status(500)
      .json({ message: "Error deleting services", error: error.message });
  }
};

// get all services

exports.getAllServices = async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;

  try {
    const services = await Service.find()
      .skip((page - 1) * limit)
      .limit(limit);

    const totalCount = await Service.countDocuments();
    res.json({
      services,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    res
      .status(500)
      .json({ message: "Error fetching services", error: error.message });
  }
};
