const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const Session = require('../models/Session');
const { validateEmail, validatePassword, validateName } = require('../utils/validators');
const { authenticate, createAnonymousSession } = require('../middleware/auth.middleware');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validations
    if (!validateName(name)) return res.status(400).json({ success: false, message: 'Nombre inválido' });
    if (!validateEmail(email)) return res.status(400).json({ success: false, message: 'Email inválido' });
    if (!validatePassword(password)) return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });

    // Check if user exists
    const existingUser = Client.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'El email ya está registrado' });
    }

    // Create user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const userId = Client.create({
      name,
      email,
      password_hash: hashedPassword,
      membership: 'free'
    });

    // Create token
    const token = jwt.sign(
      { id: userId, email, role: 'client' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      token,
      user: { id: userId, name, email, membership: 'free' }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Error en el registro' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = Client.findByEmail(email);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Credenciales inválidas' });
    }

    // Create token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.membership === 'admin' ? 'admin' : 'client' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, membership: user.membership }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Error en el inicio de sesión' });
  }
});

// GET /api/auth/session
router.get('/session', authenticate, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// POST /api/auth/google (Placeholder)
router.post('/google', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Próximamente: Integración con Google Auth en desarrollo'
  });
});

module.exports = router;
