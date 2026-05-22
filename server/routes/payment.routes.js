const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { createOrder, captureOrder } = require('../services/paypalService');
const Client = require('../models/Client');

router.use(authenticate);

// POST /api/payment/create-order
router.post('/create-order', async (req, res) => {
  try {
    const { plan } = req.body; // 'monthly' or 'yearly'
    const amount = plan === 'yearly' ? '71.88' : '9.99'; // Pricing logic
    
    // Mock order creation for now since paypal client is not configured
    // const order = await createOrder(amount, `DocPlant Premium ${plan}`);
    
    res.json({
      success: true,
      orderID: 'MOCK_ORDER_ID_' + Date.now(),
      message: 'Orden creada en modo Sandbox'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/payment/capture-order
router.post('/capture-order', async (req, res) => {
  try {
    const { orderID } = req.body;
    
    // Simulate payment capture success
    Client.updateMembership(req.user.id, 'premium');
    
    res.json({
      success: true,
      message: 'Pago capturado con éxito. ¡Bienvenido a Premium!'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
