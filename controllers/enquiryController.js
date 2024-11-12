const Enquiry = require("../models/Enquiry");

exports.createEnquiry = async (req, res, next) => {
  try {
    const { name, email, mobile, subject, address, message } = req.body;

    // Log incoming data for debugging
    console.log('Received enquiry data:', req.body);

    // Check if all required fields are present
    if (!name || !email || !mobile || !subject || !address || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if an enquiry with the same name and email already exists
    const existingEnquiry = await Enquiry.findOne({ name, email });

    if (existingEnquiry) {
      // Update the existing enquiry with new details
      existingEnquiry.subject = subject;
      existingEnquiry.message = message;
      existingEnquiry.address = address;
      existingEnquiry.mobile = mobile;

      await existingEnquiry.save();

      return res.status(200).json({
        message: "Enquiry updated successfully",
        enquiry: existingEnquiry
      });
    }

    // Create a new enquiry if no existing entry is found
    const newEnquiry = new Enquiry({ name, email, mobile, subject, address, message });
    await newEnquiry.save();

    res.status(201).json({ message: "Enquiry submitted successfully", enquiry: newEnquiry });
  } catch (error) {
    console.error("Error adding enquiry:", error);
    res.status(500).json({ message: "Error adding enquiry", error: error.message });
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
