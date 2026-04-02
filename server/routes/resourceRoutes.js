const express = require("express");

const {
  createResource,
  getResources,
} = require("../controllers/resourceController");

const router = express.Router();

router.get("/", getResources);
router.post("/", createResource);

module.exports = router;
