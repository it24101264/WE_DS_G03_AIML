const KUPPI_TOPICS = [
  "WMT",
  "OSSA",
  "PS",
  "DCWM",
  "NMA",
  "ISP",
  "RE",
  "NP",
  "ICS",
  "CMF",
  "TEM",
  "VED",
];

const KUPPI_TOPIC_MAP = new Map(KUPPI_TOPICS.map((topic) => [topic.toLowerCase(), topic]));

function normalizeKuppiTopic(value) {
  return KUPPI_TOPIC_MAP.get(String(value || "").trim().toLowerCase()) || "";
}

module.exports = {
  KUPPI_TOPICS,
  normalizeKuppiTopic,
};
