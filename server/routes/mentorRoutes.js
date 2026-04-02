const express = require("express");

const { getMentors } = require("../controllers/mentorController");

const router = express.Router();

router.get("/", getMentors);

module.exports = router;
