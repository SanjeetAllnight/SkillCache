const User = require("../models/User");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSkillFilters(queryValue) {
  if (!queryValue) {
    return [];
  }

  if (Array.isArray(queryValue)) {
    return queryValue
      .flatMap((value) => value.split(","))
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  return queryValue
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

async function getMentors(req, res) {
  try {
    const requestedSkills = normalizeSkillFilters(req.query.skills ?? req.query.skill);
    const filter = {
      skillsOffered: {
        $exists: true,
        $ne: [],
      },
    };

    if (requestedSkills.length > 0) {
      filter.skillsOffered = {
        $in: requestedSkills.map(
          (skill) => new RegExp(`^${escapeRegex(skill)}$`, "i"),
        ),
      };
    }

    const mentors = await User.find(filter)
      .select("-password")
      .sort({ name: 1 });

    return res.status(200).json(mentors);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch mentors.",
      error: error.message,
    });
  }
}

module.exports = {
  getMentors,
};
