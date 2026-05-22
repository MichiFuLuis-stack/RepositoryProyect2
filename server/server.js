const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import database configuration
const db = require('./config/database');

// Initialize database
db.initialize();

// Import routes
const authRoutes = require('./routes/auth.routes');
const uploadRoutes = require('./routes/upload.routes');
const documentRoutes = require('./routes/document.routes');
const adminRoutes = require('./routes/admin.routes');
const userRoutes = require('./routes/user.routes');
const paymentRoutes = require('./routes/payment.routes');

// Import services
const { scheduleCleanup } = require('./services/fileCleanup');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving
// Serve the client files on '/'
app.use(express.static(path.join(__dirname, '../client')));
// Serve the admin files on '/admin'
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/payment', paymentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Error interno del servidor'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n=============================================');
  console.log('   🌱 DocPlant Server Running');
  console.log('=============================================');
  console.log(`🚀 URL: http://localhost:${PORT}`);
  console.log(`🔧 Admin: http://localhost:${PORT}/admin`);
  console.log('=============================================\n');

  // Start background tasks
  const cleanupInterval = process.env.FILE_CLEANUP_INTERVAL_MS || 3600000; // Default 1 hour
  scheduleCleanup(cleanupInterval);
});
