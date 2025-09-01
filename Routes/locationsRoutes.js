// routes/locationsRoutes.js
const express = require("express");
const {
  createLocation,
  getLocations,
  editLocation,
  deleteLocation,
} = require("../Controllers/locationsController");

const router = express.Router();

router.post("/add-station", createLocation);     // Create
router.get("/get-station", getLocations);       // Read all
router.put("/station/:id", editLocation);      // Update by ID
router.delete("/station/:id", deleteLocation); // Delete by ID

module.exports = router;
