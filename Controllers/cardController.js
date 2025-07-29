const db = require('../config/firebase') // This should be the firebase-admin initialized app

// GET: Fetch card price
exports.getCardPrice = async (req, res) => {
  try {
    const snapshot = await db.ref('r1d3-py_d4tts/card/price').once('value')

    if (!snapshot.exists()) {
      return res.status(404).json({ message: 'Card price not found' })
    }

    const price = snapshot.val()
    return res.status(200).json({ price })
  } catch (error) {
    console.error('Error fetching card price:', error)
    return res.status(500).json({ message: 'Failed to fetch card price' })
  }
}

// PUT: Update card price
exports.updateCardPrice = async (req, res) => {
  const { price } = req.body

  if (typeof price === 'undefined') {
    return res.status(400).json({ message: 'Price is required' })
  }

  try {
    await db.ref('r1d3-py_d4tts/card').update({ price: price.toString() })
    return res.status(200).json({ message: 'Card price updated successfully' })
  } catch (error) {
    console.error('Error updating card price:', error)
    return res.status(500).json({ message: 'Failed to update card price' })
  }
}
