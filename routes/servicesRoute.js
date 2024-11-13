const express = require("express");

const upload = require("../middleware/uploadMiddleware");
const { createService, updateService, deleteService, deleteSelectedService, getAllServices, getServiceById } = require("../controllers/serviceController");

const router = express.Router();

router.post('/', upload.single("image"), createService)
router.put('/:id', upload.single("image"), updateService)
router.delete('/:id', deleteService)
router.delete('/', deleteSelectedService)
router.get('/', getAllServices)
router.get('/:id', getServiceById)

module.exports = router;