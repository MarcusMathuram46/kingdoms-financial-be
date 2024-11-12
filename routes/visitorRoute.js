const express = require("express");
const { getAllVisitors, createVisitor, deleteVisitors } = require("../controllers/visitorController");

const router = express.Router();

router.get('/', getAllVisitors);
router.post('/', createVisitor);
router.delete('/', deleteVisitors);

module.exports = router;