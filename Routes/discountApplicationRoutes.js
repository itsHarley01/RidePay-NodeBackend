const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createDiscountApplication , getAllDiscountApplication, approveDiscountApplication, rejectDiscountApplication} = require('../Controllers/discountApplication');

// Multer setup: store files in memory (so we can upload directly to Firebase Storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// For student: optional schoolId, required proofOfEnrollment
// For senior/pwd: front and back required
// We'll accept any field names using `.any()`
router.post('/discount/apply', upload.any(), async (req, res) => {
    try {
        const { userId, category, data } = req.body;

        // Files from multer are in req.files
        const files = {};
        if (req.files) {
            req.files.forEach(file => {
                files[file.fieldname] = file;
            });
        }

        // Data is sent as JSON string in multipart/form-data, parse it
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

        await createDiscountApplication({ 
            body: { userId, category, data: parsedData, files } 
        }, res);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});

router.get('/discount/applications', getAllDiscountApplication); 
router.patch('/discount/applications/:applicationId', approveDiscountApplication);
router.patch('/discount/applications/reject/:applicationId', rejectDiscountApplication);

module.exports = router;