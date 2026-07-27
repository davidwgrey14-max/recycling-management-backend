const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const mainRoutes = require('./routes/main');

const app = express();

// CORS configuration - allow your frontend URL
app.use(cors({
  origin: [
    'https://recycling-management-frontend-ow9o-krs7ulr2c-pam16.vercel.app',
    'http://localhost:3000' // For local development
  ],
  credentials: true
}));

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', mainRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Export for Vercel (serverless)
module.exports = app;

// For local development (only when running directly)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log('Server running on http://localhost:' + PORT);
  });
}