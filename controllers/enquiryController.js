const Enquiry = require("../models/Enquiry");

exports.createEnquiry = async (req, res, next) => {
  try {
    const enquiry = new Enquiry(req.body);
    await enquiry.save();
    res.status(201).json({ message: "Enquiry added successfully", enquiry });
  } catch (error) {
    console.error("Error adding enquiry:", error);
    res
      .status(500)
      .json({ message: "Error adding enquiry", error: error.message });
  }
};

exports.getAllEnquiries = async (req, res, next) => {
  try {
    const enquiries = await Enquiry.find();
    res.status(200).json(enquiries);
  } catch (error) {
    console.error("Error fetching enquiries:", error);
    res
      .status(500)
      .json({ message: "Error fetching enquiries", error: error.message });
  }
};

exports.deleteSelectedEnquiries = async (req, res, next) => {
  try {
    const { ids } = req.body; // IDs of enquiries to delete
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No enquiry IDs provided" });
    }

    await Enquiry.deleteMany({ _id: { $in: ids } });
    res
      .status(200)
      .json({ message: "Selected enquiries deleted successfully" });
  } catch (error) {
    console.error("Error deleting enquiries:", error);
    res
      .status(500)
      .json({ message: "Error deleting enquiries", error: error.message });
  }
};
