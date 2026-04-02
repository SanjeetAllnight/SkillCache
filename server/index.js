const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const { PORT } = require("./config/env");
const authRoutes = require("./routes/authRoutes");
const mentorRoutes = require("./routes/mentorRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const testRoutes = require("./routes/testRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/sessions", sessionRoutes);

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
