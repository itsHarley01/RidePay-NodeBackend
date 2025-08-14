const { db } = require('../config/firebase');

// Helper to pad number to 6 digits
const padNumber = (num) => num.toString().padStart(6, '0');

const generatePassengerUID = async () => {
  try {
    const snapshot = await db.ref('p4zs3gr_usr_uu34').once('value');
    const passengers = snapshot.val() || {};

    const passengerCount = Object.keys(passengers).length;
    const nextNumber = passengerCount + 1;

    const batch = Math.floor(passengerCount / 1000000) + 1;
    const formattedBatch = batch.toString().padStart(2, '0');
    const formattedCounter = padNumber(nextNumber);
    const year = new Date().getFullYear().toString().slice(-2);

    return `PA-${formattedBatch}-${year}-${formattedCounter}`;
  } catch (error) {
    console.error('Error generating passenger UID:', error);
    throw error;
  }
};

module.exports = { generatePassengerUID };
