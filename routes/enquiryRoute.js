const express = require("express");
const { createEnquiry, getAllEnquiries, deleteSelectedEnquiries } = require("../controllers/enquiryController");

const router = express.Router();

router.post('/', createEnquiry);
router.get('/', getAllEnquiries);
router.delete('/', deleteSelectedEnquiries)

module.exports = router;