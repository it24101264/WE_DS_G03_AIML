const express = require("express");
const authRequired = require("../../middlewares/auth");
const User = require("../../models/user");
const { resolveCurrentUser } = require("./_helpers");

const router = express.Router();

router.get("/profile", authRequired, async (req, res) => {
  try {
    const user = await resolveCurrentUser(req);
    if (!user) return res.status(401).json({ message: "User not found" });
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.put("/profile", authRequired, async (req, res) => {
  try {
    const user = await resolveCurrentUser(req);
    if (!user) return res.status(401).json({ message: "User not found" });

    const { name, phone, faculty, bio } = req.body || {};
    const updated = await User.findByIdAndUpdate(
      user._id,
      { name, phone, faculty, bio },
      { new: true, runValidators: true }
    );
    return res.json({ user: updated });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get("/saved", authRequired, async (req, res) => {
  try {
    const user = await resolveCurrentUser(req);
    if (!user) return res.status(401).json({ message: "User not found" });

    const found = await User.findById(user._id).populate({
      path: "savedItems",
      populate: { path: "seller", select: "name studentId" },
    });
    return res.json({ items: found?.savedItems || [] });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.delete("/account", authRequired, async (req, res) => {
  try {
    const user = await resolveCurrentUser(req);
    if (!user) return res.status(401).json({ message: "User not found" });

    await User.findByIdAndDelete(user._id);
    return res.json({ message: "Account deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
