const StudyArea = require("../models/studyArea");

const DEFAULT_STUDY_AREAS = [
  {
    name: "Main Library - Floor 2",
    latitude: 6.9147,
    longitude: 79.9729,
    radius: 120,
    specialNote: "Silent zone. Keep phone on silent mode.",
    currentCount: 12,
    status: "Free"
  },
  {
    name: "Engineering Block - Study Hall",
    latitude: 6.9141,
    longitude: 79.9721,
    radius: 140,
    specialNote: "Whiteboard and power sockets available.",
    currentCount: 46,
    status: "Moderate"
  },
  {
    name: "Business Faculty - Open Lounge",
    latitude: 6.9153,
    longitude: 79.9734,
    radius: 110,
    specialNote: "Group discussion area.",
    currentCount: 84,
    status: "Crowded"
  }
];

function getStatus(count) {
  if (count < 25) return "Free";
  if (count <= 75) return "Moderate";
  return "Crowded";
}

exports.getAllAreas = async (req, res) => {
  try {
    let areas = await StudyArea.find().sort({ createdAt: -1 });

    if (areas.length === 0) {
      await StudyArea.insertMany(DEFAULT_STUDY_AREAS);
      areas = await StudyArea.find().sort({ createdAt: -1 });
    }

    res.json(areas);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch study areas" });
  }
};

exports.getAreaById = async (req, res) => {
  try {
    const area = await StudyArea.findById(req.params.id);

    if (!area) {
      return res.status(404).json({ message: "Study area not found" });
    }

    res.json(area);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch study area" });
  }
};

exports.createArea = async (req, res) => {
  try {
    const { name, latitude, longitude, radius, specialNote } = req.body;

    if (!name || latitude === undefined || longitude === undefined || radius === undefined) {
      return res.status(400).json({
        message: "Name, latitude, longitude and radius are required"
      });
    }

    const area = await StudyArea.create({
      name,
      latitude: Number(latitude),
      longitude: Number(longitude),
      radius: Number(radius),
      specialNote: specialNote || "",
      currentCount: 0,
      status: "Free"
    });

    res.status(201).json(area);
  } catch (error) {
    res.status(500).json({ message: "Failed to create study area" });
  }
};

exports.updateArea = async (req, res) => {
  try {
    const { name, latitude, longitude, radius, specialNote } = req.body;

    const updated = await StudyArea.findByIdAndUpdate(
      req.params.id,
      {
        name,
        latitude: Number(latitude),
        longitude: Number(longitude),
        radius: Number(radius),
        specialNote: specialNote || ""
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Study area not found" });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update study area" });
  }
};

exports.deleteArea = async (req, res) => {
  try {
    const deleted = await StudyArea.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Study area not found" });
    }

    res.json({ message: "Study area deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete study area" });
  }
};

exports.updateCount = async (req, res) => {
  try {
    const { action } = req.body;
    const area = await StudyArea.findById(req.params.id);

    if (!area) {
      return res.status(404).json({ message: "Study area not found" });
    }

    if (action === "enter") {
      area.currentCount += 1;
    } else if (action === "exit" && area.currentCount > 0) {
      area.currentCount -= 1;
    }

    area.status = getStatus(area.currentCount);
    await area.save();

    res.json(area);
  } catch (error) {
    res.status(500).json({ message: "Failed to update count" });
  }
};