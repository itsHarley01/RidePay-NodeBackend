// controllers/promosController.js
const { db, bucket } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");

// CREATE Promo
const createPromo = async (req, res) => {
  try {
    const {
      name,
      effectType,
      dateRange,
      startDate,
      endDate,
      weekDays,
      percentage,
      discount,
    } = req.body;

    if (!name || !effectType || discount === undefined || percentage === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Handle photo upload (if present)
    let photoUrl = "";
    if (req.file) {
      const file = req.file;
      const fileName = `promos/${uuidv4()}-${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      await fileUpload.save(file.buffer, {
        contentType: file.mimetype,
        metadata: { firebaseStorageDownloadTokens: uuidv4() },
      });

      photoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
        fileName
      )}?alt=media`;
    }

    // Build promo object
    const promoData = {
      name,
      effectType,
      photo: photoUrl || null,
      dateRange: dateRange === "true" || dateRange === true,
      percentage: percentage === "true" || percentage === true,
      discount: Number(discount),
      createdAt: new Date().toISOString(),
    };

    if (promoData.dateRange) {
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate required when dateRange is true" });
      }
      promoData.startDate = startDate;
      promoData.endDate = endDate;
    } else {
      if (!weekDays) {
        return res.status(400).json({ error: "weekDays must be provided when dateRange is false" });
      }
      promoData.weekDays = Array.isArray(weekDays) ? weekDays : [weekDays];
    }

    // Save to Realtime DB
    const promoRef = db.ref("promos-dat").push();
    await promoRef.set(promoData);

    res.status(201).json({ id: promoRef.key, ...promoData });
  } catch (error) {
    console.error("Error creating promo:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET all promos
const getPromos = async (req, res) => {
  try {
    const snapshot = await db.ref("promos-dat").once("value");
    if (!snapshot.exists()) {
      return res.status(200).json([]);
    }

    const promos = [];
    snapshot.forEach((child) => {
      promos.push({ id: child.key, ...child.val() });
    });

    res.status(200).json(promos);
  } catch (error) {
    console.error("Error fetching promos:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// UPDATE promo
const updatePromo = async (req, res) => {
  try {
    const { id } = req.params;
    const promoRef = db.ref(`promos-dat/${id}`);
    const snapshot = await promoRef.once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Promo not found" });
    }

    const existingData = snapshot.val();
    const {
      name,
      effectType,
      dateRange,
      startDate,
      endDate,
      weekDays,
      percentage,
      discount,
    } = req.body;

    let photoUrl = existingData.photo;

    // If new photo is uploaded
    if (req.file) {
      const file = req.file;
      const fileName = `promos/${uuidv4()}-${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      await fileUpload.save(file.buffer, {
        contentType: file.mimetype,
        metadata: { firebaseStorageDownloadTokens: uuidv4() },
      });

      photoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
        fileName
      )}?alt=media`;
    }

    // Prepare update object
    const updatedData = {
      ...existingData, // keep old values
      ...(name && { name }),
      ...(effectType && { effectType }),
      ...(discount !== undefined && { discount: Number(discount) }),
      ...(percentage !== undefined && { percentage: percentage === "true" || percentage === true }),
      ...(photoUrl && { photo: photoUrl }),
      updatedAt: new Date().toISOString(),
    };

    // Handle dateRange switch
    if (dateRange !== undefined) {
      updatedData.dateRange = dateRange === "true" || dateRange === true;

      if (updatedData.dateRange) {
        // switching to range → remove weekDays, add start+end
        delete updatedData.weekDays;
        if (!startDate || !endDate) {
          return res.status(400).json({ error: "startDate and endDate required when dateRange is true" });
        }
        updatedData.startDate = startDate;
        updatedData.endDate = endDate;
      } else {
        // switching to weekDays → remove start/end
        delete updatedData.startDate;
        delete updatedData.endDate;
        if (!weekDays) {
          return res.status(400).json({ error: "weekDays must be provided when dateRange is false" });
        }
        updatedData.weekDays = Array.isArray(weekDays) ? weekDays : [weekDays];
      }
    }

    await promoRef.update(updatedData);
    res.status(200).json({ id, ...updatedData });
  } catch (error) {
    console.error("Error updating promo:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE promo
const deletePromo = async (req, res) => {
  try {
    const { id } = req.params;
    const promoRef = db.ref(`promos-dat/${id}`);
    const snapshot = await promoRef.once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Promo not found" });
    }

    const promoData = snapshot.val();

    // If promo has photo, try deleting from storage
    if (promoData.photo) {
      try {
        const filePath = decodeURIComponent(promoData.photo.split("/o/")[1].split("?")[0]);
        await bucket.file(filePath).delete();
      } catch (err) {
        console.warn("Could not delete promo image:", err.message);
      }
    }

    await promoRef.remove();
    res.status(200).json({ message: "Promo deleted successfully" });
  } catch (error) {
    console.error("Error deleting promo:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createPromo,
  getPromos,
  updatePromo,
  deletePromo,
};
