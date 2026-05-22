const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const Client = require('../models/Client');

router.use(authenticate);

// GET /api/user/profile
router.get('/profile', (req, res) => {
  try {
    const user = Client.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    
    // Remove password hash before sending
    delete user.password_hash;
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
