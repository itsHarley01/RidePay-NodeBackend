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
                birthDate: data.birthDate,
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

        // Calculate new expiration date
        const approvalDate = new Date();
        const expirationDate = new Date(approvalDate);
        expirationDate.setFullYear(expirationDate.getFullYear() + validityYears);

        // Merge with existing status, but overwrite approval/expiration
        const updatedStatus = {
            ...applicationData.status,
            status: "approved",
            dateOfApproval: approvalDate.toISOString(),
            discountExpiration: expirationDate.toISOString()
        };

        // Save status back to DB
        await db.ref(`41scnnt_4p41ica80/${applicationId}/status`).set(updatedStatus);

        // Always update user account discount info
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


// expire funtion
const applicationExpiration = async (userId) => {
    try {
        if (!userId) throw new Error("Missing userId");

        // Get user data
        const userSnapshot = await db.ref(`p4zs3gr_usr_uu34/${userId}`).once("value");
        if (!userSnapshot.exists()) throw new Error("User not found");

        const userData = userSnapshot.val();
        if (!userData.discount || !userData.discountExpiration) {
            return { expired: false, message: "User has no active discount" };
        }

        const now = new Date();
        const expirationDate = new Date(userData.discountExpiration);

        if (now <= expirationDate) {
            return { expired: false, message: "Discount still valid" };
        }

        // Discount expired → Update user
        await db.ref(`p4zs3gr_usr_uu34/${userId}`).update({
            discount: false
        });

        // Find related application
        const appsSnapshot = await db.ref(`41scnnt_4p41ica80`).orderByChild("userId").equalTo(userId).once("value");
        if (!appsSnapshot.exists()) throw new Error("No discount application found for user");

        const applications = appsSnapshot.val();
        const [applicationId, applicationData] = Object.entries(applications)[0]; // assume latest

        // Update application status
        const updatedStatus = {
            ...applicationData.status,
            status: "expired",
            dateOfExpiration: now.toISOString()
        };

        await db.ref(`41scnnt_4p41ica80/${applicationId}/status`).set(updatedStatus);

        return {
            expired: true,
            message: "Discount expired and records updated",
            applicationId
        };

    } catch (error) {
        console.error("Error in applicationExpiration:", error);
        throw error;
    }
};

//renewal
const renewDiscountApplication = async (req, res) => {
    try {
        const { userId, discountId, category, data, files } = req.body;

        if (!userId || !discountId || !category) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Get existing application
        const appRef = db.ref(`41scnnt_4p41ica80/${discountId}`);
        const appSnapshot = await appRef.once("value");

        if (!appSnapshot.exists()) {
            return res.status(404).json({ error: "Application not found" });
        }

        const applicationData = appSnapshot.val();

        // Update student-specific fields if category = student
        if (category === "student") {
            if (!data || !data.schoolName || !data.schoolLocation || !data.schoolYear) {
                return res.status(400).json({ error: "Missing student renewal fields" });
            }
            await appRef.child("data").update({
                schoolName: data.schoolName,
                schoolLocation: data.schoolLocation,
                schoolYear: data.schoolYear,
                idNum: data.idNum || applicationData.data.idNum || ""
            });
        }

        // Handle file uploads (new proof images)
        if (files) {
            const uploadedFiles = {};

            for (const [key, file] of Object.entries(files)) {
                const destination = `discountproof/renewed-${uuidv4()}-${file.originalname}`;
                const blob = bucket.file(destination);

                await blob.save(file.buffer, {
                    metadata: { contentType: file.mimetype },
                    resumable: false
                });

                await blob.makePublic();

                const downloadURL = `https://storage.googleapis.com/${bucket.name}/${destination}`;
                uploadedFiles[key] = downloadURL;
            }

            // Append new files into file object
            await appRef.child("file").update(uploadedFiles);
        }

        // Update status → pending
        await appRef.child("status").update({
            status: "pending",
            dateOfRenewal: new Date().toISOString()
        });

        return res.status(200).json({
            message: "Application renewed successfully",
            applicationId: discountId,
            userId
        });

    } catch (error) {
        console.error("Error in renewDiscountApplication:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = { createDiscountApplication, getAllDiscountApplication, approveDiscountApplication, rejectDiscountApplication, renewDiscountApplication, applicationExpiration };
