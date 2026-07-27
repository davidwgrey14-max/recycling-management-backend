const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// 🔍 DEBUG: Check if server.js is loading
console.log('✅ Server.js loaded successfully!');
console.log('✅ Environment variables loaded:', {
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI ? 'Present' : 'Missing',
  JWT_SECRET: process.env.JWT_SECRET ? 'Present' : 'Missing'
});

const authRoutes = require('./routes/auth');
const mainRoutes = require('./routes/main');

console.log('✅ Routes imported successfully');

const app = express();

// CORS configuration - FIXED for production
app.use(cors({
  origin: [
    'https://recycling-management-frontend-ow9o.vercel.app',  // ← Add this
    'https://recycling-management-frontend-ow9o-m1zdjip0b-pam16.vercel.app',
    'https://recycling-management-frontend-ow9o-krs7ulr2c-pam16.vercel.app',
    'http://localhost:3000',
    'http://localhost:5000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Debug middleware - log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Origin:', req.headers.origin);
  next();
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// 🔍 DEBUG: Registering routes
console.log('📋 Registering routes...');

// Test routes
app.get('/api/test', (req, res) => {
  console.log('✅ /api/test route called');
  res.json({ message: 'Backend is working!' });
});

app.get('/api', (req, res) => {
  console.log('✅ /api route called');
  res.json({ message: 'Recycling Management API is running' });
});

// Routes
console.log('📋 Registering auth routes...');
app.use('/api/auth', authRoutes);
console.log('📋 Registering main routes...');
app.use('/api', mainRoutes);

console.log('✅ All routes registered successfully');

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ message: err.message });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log('Server running on http://localhost:' + PORT);
  });
}