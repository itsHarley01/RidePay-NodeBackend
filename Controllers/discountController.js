const { db } = require('../config/firebase');

/**
 * Update discount settings (rate and/or validity) for a specific discount type
 */
async function updateDiscount(type, data) {
  try {
    if (!['student', 'senior', 'pwd'].includes(type)) {
      return { success: false, message: 'Invalid discount type' };
    }

    if (!data || (data.rate === undefined && data.validity === undefined)) {
      return { success: false, message: 'No data provided to update' };
    }

    const updates = {};
    if (data.rate !== undefined) {
      updates[`r1d3-py_discount/${type}/rate`] = data.rate;
    }
    if (data.validity !== undefined) {
      updates[`r1d3-py_discount/${type}/validity`] = data.validity;
    }

    await db.ref().update(updates);

    return { success: true, message: 'Discount updated successfully' };
  } catch (error) {
    console.error('Error updating discount:', error);
    return { success: false, message: 'Internal server error' };
  }
}

/**
 * Fetch all discount types (student, senior, pwd) with rate and validity
 */
async function getDiscounts() {
  try {
    const snapshot = await db.ref('r1d3-py_discount').once('value');
    const data = snapshot.val();

    if (!data) {
      return { success: false, message: 'No discount data found' };
    }

    return {
      success: true,
      data: {
        student: data.student || {},
        senior: data.senior || {},
        pwd: data.pwd || {}
      }
    };
  } catch (error) {
    console.error('Error fetching discounts:', error);
    return { success: false, message: 'Internal server error' };
  }
}

module.exports = {
  updateDiscount,
  getDiscounts,
};
