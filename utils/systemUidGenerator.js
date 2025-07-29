const db = require('../config/firebase');

// Helper to format number as 6-digit with leading zeros
const padNumber = (num) => num.toString().padStart(6, '0');

// Main function to generate system UID
const generateSystemUID = async () => {
  try {
    // Fetch both tables in parallel
    const [unregisteredSnap, registeredSnap] = await Promise.all([
      db.ref('user_us3r_4cc5').once('value'),
      db.ref('r3g1s_user_us3r_4cc5').once('value')
    ]);

    const unregisteredUsers = unregisteredSnap.val() || {};
    const registeredUsers = registeredSnap.val() || {};

    const unregisteredCount = Object.keys(unregisteredUsers).length;
    const registeredCount = Object.keys(registeredUsers).length;

    const totalCount = unregisteredCount + registeredCount;
    const nextNumber = totalCount + 1;

    // Determine batch and counter
    const batch = Math.floor(totalCount / 1000000) + 1;
    const formattedBatch = batch.toString().padStart(2, '0');
    const formattedCounter = padNumber(nextNumber);

    // Last 2 digits of current year
    const year = new Date().getFullYear().toString().slice(-2);

    // Final system UID format
    return `RP-${formattedBatch}-${year}-${formattedCounter}`;
  } catch (error) {
    console.error('Error generating system UID:', error);
    throw error;
  }
};

module.exports = { generateSystemUID };
