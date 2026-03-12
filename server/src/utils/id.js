function makeId(prefix = "") {
  return `${prefix}${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

module.exports = { makeId };
