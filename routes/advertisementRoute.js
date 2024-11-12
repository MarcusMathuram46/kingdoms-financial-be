const express = require("express");
const upload = require("../middleware/uploadMiddleware");
const { getAllAdvertisement, createAdvertisement, updateAdvertisement, deleteAdvertisement, deleteSelectedAdvertisements } = require("../controllers/advertisementController");

const router = express.Router();

router.get('/', getAllAdvertisement);
router.post('/', upload.single("image"), createAdvertisement);
router.put('/:id', upload.single("image"), updateAdvertisement)
router.delete('/:id', deleteAdvertisement);
router.delete('/', deleteSelectedAdvertisements)

module.exports = router;