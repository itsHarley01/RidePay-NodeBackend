const { db } = require('../config/firebase'); // This should be the firebase-admin initialized app

// GET: Fetch card price
exports.getCardPrice = async (req, res) => {
  try {
    const snapshot = await db.ref('r1d3-py_card/price').once('value')

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
// PUT: Update card price
exports.updateCardPrice = async (req, res) => {
  let { price } = req.body

  if (price === undefined) {
    return res.status(400).json({ message: 'Price is required' })
  }

  // Convert to number
  price = parseFloat(price)
  if (isNaN(price)) {
    return res.status(400).json({ message: 'Price must be a valid number' })
  }

  // Format to 2 decimals
  price = parseFloat(price.toFixed(2))

  try {
    await db.ref('r1d3-py_card').update({ price: price })
    return res.status(200).json({
      message: 'Card price updated successfully',
      price
    })
  } catch (error) {
    console.error('Error updating card price:', error)
    return res.status(500).json({ message: 'Failed to update card price' })
  }
}


// GET: Fetch all issued cards
exports.getAllCards = async (req, res) => {
  try {
    const snapshot = await db.ref('k44d_r1g3s_74l').once('value')

    if (!snapshot.exists()) {
      return res.status(404).json({ message: 'No cards found' })
    }

    const cardsData = snapshot.val()
    const cardsArray = Object.entries(cardsData).map(([cardId, card]) => ({
      cardId,
      cardStatus: card.cardStatus || null,
      dateOfIssuance: card.dateOfIssuance || null,
      tagUid: card.tagUid || null,
      userUid: card.userUid || null,
    }))

    return res.status(200).json({ cards: cardsArray })
  } catch (error) {
    console.error('Error fetching cards:', error)
    return res.status(500).json({ message: 'Failed to fetch cards' })
  }
}
