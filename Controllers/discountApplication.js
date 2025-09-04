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
            applicationData.data.idNum = data.idNum;
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

const getAllDiscountApplication = async (req, res) => {
    try {
        const snapshot = await db.ref(`41scnnt_4p41ica80`).once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ message: "No discount applications found" });
        }

        const applications = snapshot.val();

        // Convert object to array for easier frontend table display
        const result = Object.entries(applications).map(([id, data]) => ({
            id,
            ...data
        }));

        return res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching discount applications:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const fetchDiscountValidity = async (category) => {
    const snapshot = await db.ref(`r1d3-py_discount/${category}/validity`).once("value");
    if (!snapshot.exists()) throw new Error("Discount validity not found");
    return snapshot.val(); // number of years
};

const approveDiscountApplication = async (req, res) => {
    try {
        const { applicationId } = req.params;

        if (!applicationId) {
            return res.status(400).json({ error: "Missing applicationId" });
        }

        // Get application data
        const appSnapshot = await db.ref(`41scnnt_4p41ica80/${applicationId}`).once("value");
        if (!appSnapshot.exists()) {
            return res.status(404).json({ error: "Application not found" });
        }

        const applicationData = appSnapshot.val();
        if (!applicationData || !applicationData.userId) {
            return res.status(400).json({ error: "Invalid application data" });
        }

        const { userId, category } = applicationData;

        // Get validity in years
        const validityYears = await fetchDiscountValidity(category);

        // Calculate expiration date
        const approvalDate = new Date();
        const expirationDate = new Date(approvalDate);
        expirationDate.setFullYear(expirationDate.getFullYear() + validityYears);

        // Update application status
        const updatedStatus = {
            status: "approved",
            dateOfApplication: applicationData.status.dateOfApplication || null,
            dateOfApproval: approvalDate.toISOString(),
            discountExpiration: expirationDate.toISOString()
        };

        await db.ref(`41scnnt_4p41ica80/${applicationId}/status`).set(updatedStatus);

        // Update user account
        await db.ref(`p4zs3gr_usr_uu34/${userId}`).update({
            discount: true,
            discountExpiration: expirationDate.toISOString(),
            discountType: category
        });

        return res.status(200).json({
            message: "Application approved successfully",
            applicationId,
            userId,
            discountExpiration: expirationDate.toISOString()
        });

    } catch (error) {
        console.error("Error approving discount application:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const rejectDiscountApplication = async (req, res) => {
    try {
        const { applicationId } = req.params;

        if (!applicationId) {
            return res.status(400).json({ error: "Missing applicationId" });
        }

        // Get application data
        const appSnapshot = await db.ref(`41scnnt_4p41ica80/${applicationId}`).once("value");
        if (!appSnapshot.exists()) {
            return res.status(404).json({ error: "Application not found" });
        }

        const applicationData = appSnapshot.val();

        // Update status
        const updatedStatus = {
            status: "rejected",
            dateOfApplication: applicationData.status?.dateOfApplication || null,
            dateOfRejection: new Date().toISOString()
        };

        await db.ref(`41scnnt_4p41ica80/${applicationId}/status`).set(updatedStatus);

        return res.status(200).json({
            message: "Application rejected successfully",
            applicationId,
            status: updatedStatus
        });

    } catch (error) {
        console.error("Error rejecting discount application:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};



module.exports = { createDiscountApplication, getAllDiscountApplication, approveDiscountApplication, rejectDiscountApplication};
