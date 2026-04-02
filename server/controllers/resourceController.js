const Resource = require("../models/Resource");

async function getResources(_req, res) {
  try {
    const resources = await Resource.find()
      .sort({ createdAt: -1 })
      .populate("author", "name email skillsOffered skillsWanted");

    return res.status(200).json(resources);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch resources.",
      error: error.message,
    });
  }
}

async function createResource(req, res) {
  try {
    const { title, description, tags = [], author } = req.body;

    if (!title || !description || !author) {
      return res.status(400).json({
        message: "Title, description, and author are required.",
      });
    }

    const resource = await Resource.create({
      title: title.trim(),
      description: description.trim(),
      tags,
      author,
    });

    const populatedResource = await Resource.findById(resource._id).populate(
      "author",
      "name email skillsOffered skillsWanted",
    );

    return res.status(201).json(populatedResource);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create resource.",
      error: error.message,
    });
  }
}

module.exports = {
  getResources,
  createResource,
};
