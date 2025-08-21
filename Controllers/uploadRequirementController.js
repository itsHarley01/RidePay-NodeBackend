// controllers/uploadRequirementController.js
const { db, bucket } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

/**
 * Upload user requirement files
 * @param {string} uid - The user ID
 * @param {Array} files - Array of file objects (from multer or similar)
 */
const uploadRequirement = async (uid, files) => {
  try {
    if (!uid || !files || files.length === 0) {
      throw new Error("UID and files are required.");
    }

    const uploadPromises = files.map(async (file) => {
      // Generate unique file name
      const randomName = `${uuidv4()}${path.extname(file.originalname)}`;
      // Place file inside a folder for this UID
      const destination = `user-requirements/${uid}/${randomName}`;

      // Upload to Firebase Storage
      await bucket.file(destination).save(file.buffer, {
        contentType: file.mimetype,
        public: true, // <-- note: not enough alone, need to call makePublic()
        metadata: {
          firebaseStorageDownloadTokens: uuidv4(),
        },
      });

      // Make file public
      await bucket.file(destination).makePublic();

      // Public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;

      // Save to Firebase Realtime Database
      const ref = db.ref(`user_us3r_4cc5/${uid}/files/${randomName}`);
      await ref.set({
        url: publicUrl,
        name: file.originalname,
        type: file.mimetype,
        uploadedAt: Date.now(),
      });

      return { name: file.originalname, url: publicUrl };
    });

    // Resolve all uploads
    const uploadedFiles = await Promise.all(uploadPromises);
    return uploadedFiles;

  } catch (error) {
    console.error("Error uploading requirements:", error);
    throw error;
  }
};

module.exports = { uploadRequirement };
