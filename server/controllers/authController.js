const jwt = require("jsonwebtoken");

const { JWT_EXPIRES_IN, JWT_SECRET } = require("../config/env");
const User = require("../models/User");

function createToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function signup(req, res) {
  try {
    const {
      name,
      email,
      password,
      skillsOffered = [],
      skillsWanted = [],
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "A user with that email already exists.",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      skillsOffered,
      skillsWanted,
    });

    return res.status(201).json({
      message: "User created successfully.",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create user.",
      error: error.message,
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = createToken(user._id.toString());

    return res.status(200).json({
      message: "Login successful.",
      token,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to log in.",
      error: error.message,
    });
  }
}

module.exports = {
  signup,
  login,
};
