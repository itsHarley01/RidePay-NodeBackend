const express = require("express");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const {
  createPromo,
  getPromos,
  updatePromo,
  deletePromo,
} = require("../Controllers/promosController");

const router = express.Router();

router.post("/promos", upload.single("photo"), createPromo);
router.get("/promos", getPromos);
router.put("/promos/:id", upload.single("photo"), updatePromo);
router.delete("/promos/:id", deletePromo);

module.exports = router;
