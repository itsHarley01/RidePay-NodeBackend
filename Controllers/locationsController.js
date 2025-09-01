// controllers/locationsController.js
const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid'); // for unique IDs

// =============================
// Create a new location
// =============================
const createLocation = async (req, res) => {
  try {
    const { name, address, long, lat } = req.body;

    if (!name || !address || !long || !lat) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const id = uuidv4(); // generate unique key

    await db.ref(`station-location/${id}`).set({
      name,
      address,
      long,
      lat,
    });

    return res.status(201).json({ message: "Location created successfully", id });
  } catch (error) {
    console.error("Error creating location:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// =============================
// Get all locations
// =============================
const getLocations = async (req, res) => {
  try {
    const snapshot = await db.ref("station-location").once("value");
    const data = snapshot.val();

    if (!data) {
      return res.status(404).json({ message: "No locations found" });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// =============================
// Edit location by ID
// =============================
const editLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, long, lat } = req.body;

    const locationRef = db.ref(`station-location/${id}`);

    const snapshot = await locationRef.once("value");
    if (!snapshot.exists()) {
      return res.status(404).json({ message: "Location not found" });
    }

    await locationRef.update({
      ...(name && { name }),
      ...(address && { address }),
      ...(long && { long }),
      ...(lat && { lat }),
    });

    return res.status(200).json({ message: "Location updated successfully" });
  } catch (error) {
    console.error("Error editing location:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// =============================
// Delete location by ID
// =============================
const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const locationRef = db.ref(`station-location/${id}`);

    const snapshot = await locationRef.once("value");
    if (!snapshot.exists()) {
      return res.status(404).json({ message: "Location not found" });
    }

    await locationRef.remove();

    return res.status(200).json({ message: "Location deleted successfully" });
  } catch (error) {
    console.error("Error deleting location:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createLocation,
  getLocations,
  editLocation,
  deleteLocation,
};
