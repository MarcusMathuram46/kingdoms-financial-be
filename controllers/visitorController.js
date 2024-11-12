const Visitor = require("../models/Visitor");

exports.getAllVisitors = async (req, res, next) => {
  try {
    const visitors = await Visitor.find();
    res.json(visitors);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching visitors", error: error.message });
  }
};

exports.createVisitor = async (req, res, next) => {
  const { ipAddress, city, region, country } = req.body;

  try {
    // Check if the visitor already exists
    let visitor = await Visitor.findOne({ ipAddress });

    if (visitor) {
      // Update the existing visitor's details
      visitor.city = city;
      visitor.region = region;
      visitor.country = country;
      visitor.visitTime = Date.now();
    } else {
      // Create a new visitor
      visitor = new Visitor({ ipAddress, city, region, country });
    }

    const savedVisitor = await visitor.save();
    res.status(201).json(savedVisitor);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error saving visitor", error: error.message });
  }
};

exports.deleteVisitors = async (req, res, next) => {
  try {
    const { ids } = req.query; // Get the list of IDs from the query string
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).send("Invalid or missing visitor IDs");
    }

    // Delete visitors by their IDs
    await Visitor.deleteMany({ _id: { $in: ids } });

    res.status(200).send({ message: "Visitors deleted successfully" });
  } catch (error) {
    console.error("Error deleting visitors:", error);
    res.status(500).send("Error deleting visitors. Please try again.");
  }
};
