const express = require("express");

const {
  createSession,
  getSessionById,
  getSessions,
} = require("../controllers/sessionController");

const router = express.Router();

router.get("/", getSessions);
router.post("/", createSession);
router.get("/:id", getSessionById);

module.exports = router;
