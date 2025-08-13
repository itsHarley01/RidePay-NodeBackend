const { db, bucket } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid'); // for unique filenames

const createDiscountApplication = async (req, res) => {
    try {
        const { userId, category, data, files } = req.body;

        if (!userId || !category || !data) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const validCategories = ['student', 'senior', 'pwd'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: "Invalid discount category" });
        }

        const discountApplicationId = `DA-${Math.floor(100000 + Math.random() * 900000)}`;

        const status = {
            status: "pending",
            dateOfApplication: new Date().toISOString()
        };

        const applicationData = {
            userId,
            category,
            status,
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                middleName: data.middleName || "",
                age: data.age,
                gender: data.gender,
                contactNumber: data.contactNumber,
                email: data.email
                
            },
            file: {}
        };

        // Extra student fields
        if (category === 'student') {
            if (!data.schoolName || !data.schoolLocation || !data.schoolYear) {
                return res.status(400).json({ error: "Missing student-specific fields" });
            }
            applicationData.data.schoolName = data.schoolName;
            applicationData.data.schoolLocation = data.schoolLocation;
            applicationData.data.schoolYear = data.schoolYear;
        }
// Handle file uploads using Admin SDK bucket
        if (files) {
            const uploadedFiles = {};
        
            for (const [key, file] of Object.entries(files)) {
                const destination = `discountproof/${uuidv4()}-${file.originalname}`;
                const blob = bucket.file(destination);
            
                // Save file
                await blob.save(file.buffer, {
                    metadata: { contentType: file.mimetype },
                    resumable: false
                });
            
                // Make file public
                await blob.makePublic();
            
            // Public URL
            const downloadURL = `https://storage.googleapis.com/${bucket.name}/${destination}`;
            uploadedFiles[key] = downloadURL;
        }

    applicationData.file = uploadedFiles;
}


        // Save to Realtime Database
        await db.ref(`41scnnt_4p41ica80/${discountApplicationId}`).set(applicationData);

        return res.status(201).json({ message: "Discount application submitted", id: discountApplicationId });
    } catch (error) {
        console.error("Error creating discount application:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = { createDiscountApplication };
