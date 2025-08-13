const { db } = require('../config/firebase');

// Collection root
const REQUIREMENTS_PATH = 'r1d3-py_requirements';

// ✅ Create a requirement
const createRequirement = async (req, res) => {
  try {
    const { category, name, inputType, organization, operatorUnit } = req.body;

    if (!category || !name || !inputType || !organization ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newReqRef = db.ref(REQUIREMENTS_PATH).push();

    const newData = {
      category,
      name,
      inputType,
      organization,
      operatorUnit,
    };

    await newReqRef.set(newData);

    res.status(201).json({ id: newReqRef.key, ...newData });
  } catch (error) {
    console.error('Error creating requirement:', error);
    res.status(500).json({ error: 'Failed to create requirement' });
  }
};

// ✅ Get requirements by category
const getRequirements = async (req, res) => {
  try {
    const { category } = req.params;

    const snapshot = await db
      .ref(REQUIREMENTS_PATH)
      .orderByChild('category')
      .equalTo(category)
      .once('value');

    if (!snapshot.exists()) {
      return res.status(200).json([]);
    }

    const data = snapshot.val();
    const list = Object.entries(data).map(([id, value]) => ({
      id,
      ...value
    }));

    res.json(list);
  } catch (error) {
    console.error('Error fetching requirements:', error);
    res.status(500).json({ error: 'Failed to fetch requirements' });
  }
};

// ✅ Update requirement by ID
const updateRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, name, inputType, organization, operatorUnit } = req.body;

    if (!category || !name || !inputType || !organization || !operatorUnit) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await db.ref(`${REQUIREMENTS_PATH}/${id}`).update({
      category,
      name,
      inputType,
      organization,
      operatorUnit,
    });

    res.json({ message: 'Requirement updated' });
  } catch (error) {
    console.error('Error updating requirement:', error);
    res.status(500).json({ error: 'Failed to update requirement' });
  }
};

// ✅ Delete requirement by ID
const deleteRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    await db.ref(`${REQUIREMENTS_PATH}/${id}`).remove();
    res.json({ message: 'Requirement deleted' });
  } catch (error) {
    console.error('Error deleting requirement:', error);
    res.status(500).json({ error: 'Failed to delete requirement' });
  }
};

module.exports = {
  createRequirement,
  getRequirements,
  updateRequirement,
  deleteRequirement,
};
