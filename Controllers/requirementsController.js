const db = require('../config/firebase');

// Collection root
const REQUIREMENTS_PATH = 'r1d3-py_requirements';

// ✅ Create a requirement
const createRequirement = async (req, res) => {
  try {
    const { category, name, inputType } = req.body;

    if (!category || !name || !inputType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const categoryRef = db.ref(`${REQUIREMENTS_PATH}/${category}`);
    const newReqRef = categoryRef.push();

    await newReqRef.set({
      id: newReqRef.key,
      name,
      inputType,
    });

    res.status(201).json({ message: 'Requirement created', id: newReqRef.key });
  } catch (error) {
    console.error('Error creating requirement:', error);
    res.status(500).json({ error: 'Failed to create requirement' });
  }
};

// ✅ Get all requirements for a category
const getRequirements = async (req, res) => {
  try {
    const { category } = req.params;
    const snapshot = await db.ref(`${REQUIREMENTS_PATH}/${category}`).once('value');

    if (!snapshot.exists()) {
      return res.status(200).json([]);
    }

    const data = snapshot.val();
    const list = Object.values(data);

    res.json(list);
  } catch (error) {
    console.error('Error fetching requirements:', error);
    res.status(500).json({ error: 'Failed to fetch requirements' });
  }
};

// ✅ Update a requirement
const updateRequirement = async (req, res) => {
  try {
    const { category, id } = req.params;
    const { name, inputType } = req.body;

    if (!name || !inputType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await db.ref(`${REQUIREMENTS_PATH}/${category}/${id}`).update({
      name,
      inputType,
    });

    res.json({ message: 'Requirement updated' });
  } catch (error) {
    console.error('Error updating requirement:', error);
    res.status(500).json({ error: 'Failed to update requirement' });
  }
};

// ✅ Delete a requirement
const deleteRequirement = async (req, res) => {
  try {
    const { category, id } = req.params;

    await db.ref(`${REQUIREMENTS_PATH}/${category}/${id}`).remove();

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
