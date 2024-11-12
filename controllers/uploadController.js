const path = require("path");

exports.uploadImage = (req, res, next) => {
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
};
