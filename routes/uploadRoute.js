
// routes/uploadRoute.js
const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const { uploadImage } = require("../controllers/uploadController");

// Route for handling file uploads
router.post("/", upload.single("image"), uploadImage);

module.exports = router;
