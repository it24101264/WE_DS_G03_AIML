const express = require("express");
const authRequired = require("../../middlewares/auth");
const { resolveCurrentUser } = require("./_helpers");

const router = express.Router();

// Marketplace auth uses the project's main auth token.
router.get("/me", authRequired, async (req, res) => {
  try {
    const user = await resolveCurrentUser(req);
    if (!user) return res.status(401).json({ message: "User not found" });

    return res.json({
      user: {
        _id: user._id,
        id: user.id,
        name: user.name,
        email: user.email,
        studentId: user.studentId || "",
        faculty: user.faculty || "",
        phone: user.phone || "",
        bio: user.bio || "",
        role: user.role,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
