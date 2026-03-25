const User = require("../../models/user");

async function resolveCurrentUser(req) {
  if (!req.user?.id) return null;
  return User.findOne({ id: req.user.id });
}

module.exports = { resolveCurrentUser };
