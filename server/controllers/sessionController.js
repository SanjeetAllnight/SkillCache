const mongoose = require("mongoose");

const Session = require("../models/Session");

const sessionPopulation = [
  { path: "mentor", select: "name email skillsOffered skillsWanted" },
  { path: "learner", select: "name email skillsOffered skillsWanted" },
];

async function getSessions(_req, res) {
  try {
    const sessions = await Session.find()
      .sort({ date: 1 })
      .populate(sessionPopulation);

    return res.status(200).json(sessions);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch sessions.",
      error: error.message,
    });
  }
}

async function createSession(req, res) {
  try {
    const { title, mentor, learner, date, status = "upcoming" } = req.body;

    if (!title || !mentor || !learner || !date) {
      return res.status(400).json({
        message: "Title, mentor, learner, and date are required.",
      });
    }

    const session = await Session.create({
      title: title.trim(),
      mentor,
      learner,
      date,
      status,
    });

    const populatedSession = await Session.findById(session._id).populate(
      sessionPopulation,
    );

    return res.status(201).json(populatedSession);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create session.",
      error: error.message,
    });
  }
}

async function getSessionById(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid session id.",
      });
    }

    const session = await Session.findById(id).populate(sessionPopulation);

    if (!session) {
      return res.status(404).json({
        message: "Session not found.",
      });
    }

    return res.status(200).json(session);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch session.",
      error: error.message,
    });
  }
}

module.exports = {
  getSessions,
  createSession,
  getSessionById,
};
