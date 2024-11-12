const Advertisement = require("../models/Advertisement");

exports.createAdvertisement = async (req, res, next) => {
  const { title, description } = req.body;
  const image = req.file
    ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
    : null;

  const newAdvertisement = new Advertisement({
    title,
    image, // Ensure image URL is passed here after upload
    description,
  });

  try {
    const savedAdvertisement = await newAdvertisement.save();
    res.status(201).json(savedAdvertisement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
exports.getAllAdvertisement = async (req, res, next) => {
  try {
    const advertisements = await Advertisement.find();
    res.json(advertisements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Route to update an advertisement by ID
exports.updateAdvertisement = async (req, res, next) => {
  const { title, description } = req.body;
  const image = req.file
    ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
    : undefined;

  try {
    const updatedAdvertisement = await Advertisement.findByIdAndUpdate(
      req.params.id,
      { title, image, description },
      { new: true, runValidators: true }
    );

    if (!updatedAdvertisement) {
      return res.status(404).json({ message: "Advertisement not found" });
    }

    res.json(updatedAdvertisement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// Route to delete an advertisement by ID

exports.deleteAdvertisement = async(req, res, next) => {
    try {
        const deletedAdvertisement = await Advertisement.findByIdAndDelete(
          req.params.id
        );
    
        if (!deletedAdvertisement) {
          return res.status(404).json({ message: "Advertisement not found" });
        }
    
        res.json({ message: "Advertisement deleted successfully" });
      } catch (error) {
        res
          .status(500)
          .json({ message: "Error deleting advertisement", error: error.message });
      }
}


// Route to delete selected advertisements by their IDs

exports.deleteSelectedAdvertisements = async(req, res, next) => {
    try {
        const { ids } = req.body; // Expecting an array of IDs to delete
        if (!Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({ message: "No advertisement IDs provided" });
        }
    
        // Use deleteMany to delete multiple advertisements based on the provided IDs
        await Advertisement.deleteMany({ _id: { $in: ids } });
    
        res
          .status(200)
          .json({ message: "Selected advertisements deleted successfully" });
      } catch (error) {
        console.error("Error deleting advertisements:", error);
        res
          .status(500)
          .json({ message: "Error deleting advertisements", error: error.message });
      }
} 
