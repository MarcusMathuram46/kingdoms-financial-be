const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const axios = require("axios");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { MONGODB_URL, PORT } = require("./config");
const User = require("./models/User");
const Advertisement = require("./models/Advertisement");
const Service = require('./models/Service');
const Visitor = require("./models/Visitor");
const Enquiry = require("./models/Enquiry");
const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Create 'uploads' directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log("Uploads directory created");
}

// Serve static files from the 'uploads' directory
app.use("/uploads", express.static(uploadsDir));

// Middleware to log visitors
app.post("/api/visitors", async (req, res) => {
  const { ipAddress, city, region, country } = req.body;

  try {
    // Find if the visitor already exists
    let visitor = await Visitor.findOne({ ipAddress });

    if (visitor) {
      // If found, update the existing record
      visitor.city = city;
      visitor.region = region;
      visitor.country = country;
      visitor.visitTime = Date.now(); // Update visit time
    } else {
      // If not found, create a new record
      visitor = new Visitor({
        ipAddress,
        city,
        region,
        country,
      });
    }

    // Save the visitor record
    await visitor.save();
    res.status(201).json(visitor);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error saving visitor", error: error.message });
  }
});

// Set up Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir); // Save files to the 'uploads' directory
  },
  filename: (req, file, cb) => {
    // Use a timestamp to create unique filenames
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Initialize Multer for image upload
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/; // Allowed file types
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    console.log(
      `File type: ${file.mimetype}, Extname: ${path.extname(file.originalname)}`
    ); // Log file type info

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb("Error: File type not supported");
  },
});

// Handle image upload
app.post("/api/upload", (req, res) => {
  console.log("Received upload request");

  upload.single("image")(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res
        .status(500)
        .json({ message: "File upload failed", error: err.message });
    }

    if (!req.file) {
      console.log("No file uploaded:", req.file);
      return res.status(400).json({ message: "No file uploaded" });
    }

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;
    console.log("File uploaded successfully:", imageUrl);
    res.json({ imageUrl });
  });
});

// Login Route
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (passwordMatch) {
      return res
        .status(200)
        .json({ message: "Login successful", isAdmin: user.isAdmin });
    } else {
      return res.status(401).json({ message: "Invalid username or password" });
    }
  } catch (error) {
    console.error("Server error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

// Route to get all advertisements
app.get("/api/advertisements", async (req, res) => {
  try {
    const advertisements = await Advertisement.find();
    res.json(advertisements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Route to create a new advertisement
app.post("/api/advertisements", upload.single("image"), async (req, res) => {
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
});

// Route to update an advertisement by ID
app.put("/api/advertisements/:id", upload.single("image"), async (req, res) => {
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
});

// Route to delete an advertisement by ID
// Route to delete a single advertisement by its ID
app.delete("/api/advertisements/:id", async (req, res) => {
  try {
    const deletedAdvertisement = await Advertisement.findByIdAndDelete(
      req.params.id
    );

    if (!deletedAdvertisement) {
      return res.status(404).json({ message: "Advertisement not found" });
    }

    res.json({ message: "Advertisement deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting advertisement", error: error.message });
  }
});

// Route to delete selected advertisements by their IDs
app.delete("/api/advertisements", async (req, res) => {
  try {
    const { ids } = req.body; // Expecting an array of IDs to delete
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No advertisement IDs provided" });
    }

    // Use deleteMany to delete multiple advertisements based on the provided IDs
    await Advertisement.deleteMany({ _id: { $in: ids } });

    res.status(200).json({ message: "Selected advertisements deleted successfully" });
  } catch (error) {
    console.error("Error deleting advertisements:", error);
    res.status(500).json({ message: "Error deleting advertisements", error: error.message });
  }
});

// POST Route for saving the service (and uploading the image)
app.post("/api/services", upload.single("image"), async (req, res) => {
  const { title, description } = req.body;
  const image = req.file ? req.file.path : null;

  if (!title || !description) {
    return res.status(400).json({ message: "Title and description are required" });
  }

  try {
    const newService = new Service({ title, image, description });
    const savedService = await newService.save();

    // Correct the image URL to be publicly accessible
    savedService.image = savedService.image ? `http://localhost:5000/uploads/${savedService.image.split(path.sep).join('/')}` : null;

    res.status(201).json(savedService);
  } catch (error) {
    console.error("Error saving service:", error);
    res.status(400).json({ message: error.message });
  }
});



// Route to update a service by ID
app.put("/api/services/:id", upload.single("image"), async (req, res) => {
  const { title, description } = req.body;
  const image = req.file ? req.file.path : undefined;

  if (!title || !description) {
    return res.status(400).json({ message: "Title and description are required" });
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
});

// Route to delete a service by ID
app.delete("/api/services/:id", async (req, res) => {
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
});

// Route to delete multiple services by IDs
app.delete("/api/services", async (req, res) => {
  console.log("Received delete request with ids:", req.body.ids); // Log the received IDs
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No service IDs provided" });
    }

    // Ensure ObjectId is created using 'new' syntax
    const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));  // Ensure to use 'new'

    const result = await Service.deleteMany({ _id: { $in: objectIds } });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "No services found with the provided IDs" });
    }

    res.status(200).json({ message: "Selected services deleted successfully" });
  } catch (error) {
    console.error("Error deleting services:", error);
    res.status(500).json({ message: "Error deleting services", error: error.message });
  }
});



// Route to get all services (with pagination)
app.get("/api/services", async (req, res) => {
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
    res.status(500).json({ message: "Error fetching services", error: error.message });
  }
});


// Add an enquiry
app.post("/api/enquiries", async (req, res) => {
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
});

// Fetch all enquiries
app.get("/api/enquiries", async (req, res) => {
  try {
    const enquiries = await Enquiry.find();
    res.status(200).json(enquiries);
  } catch (error) {
    console.error("Error fetching enquiries:", error);
    res
      .status(500)
      .json({ message: "Error fetching enquiries", error: error.message });
  }
});

// Delete selected enquiries
app.delete("/api/enquiries", async (req, res) => {
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
});

// Route to get all visitors
app.get("/api/visitors", async (req, res) => {
  try {
    const visitors = await Visitor.find();
    res.json(visitors);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching visitors", error: error.message });
  }
});

// Route to add or update a visitor
app.post("/api/visitors", async (req, res) => {
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
});

app.delete('/api/visitors', async (req, res) => {
    try {
      const { ids } = req.query; // Get the list of IDs from the query string
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).send('Invalid or missing visitor IDs');
      }
  
      // Delete visitors by their IDs
      await Visitor.deleteMany({ _id: { $in: ids } });
  
      res.status(200).send({ message: 'Visitors deleted successfully' });
    } catch (error) {
      console.error('Error deleting visitors:', error);
      res.status(500).send('Error deleting visitors. Please try again.');
    }
  });
  

// Connect to MongoDB
mongoose
  .connect(MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });
