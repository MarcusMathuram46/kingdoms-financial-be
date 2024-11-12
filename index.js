const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { MONGODB_URL, PORT } = require("./config");

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/login", require("./routes/userRoute"))

app.use("/api/advertisements", require("./routes/advertisementRoute"))

app.use("/api/services", require("./routes/servicesRoute"))

app.use("/api/enquiries", require("./routes/enquiryRoute"))

app.use("/api/visitors", require("./routes/visitorRoute"))
app.use("/api/upload", require("./routes/uploadRoute"));
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
