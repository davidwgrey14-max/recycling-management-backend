// server.js - Complete rewrite for Vercel
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// ✅ CRITICAL: CORS configuration - MUST come first
const allowedOrigins = [
  'https://recycling-management-frontend-ow9o.vercel.app',
  'https://recycling-management-frontend-ow9o.vercel.app/',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5173'
];

// Handle OPTIONS preflight requests - THIS MUST BE FIRST
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin) || origin?.includes('vercel.app')) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', 'https://recycling-management-frontend-ow9o.vercel.app');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled for:', req.url);
    return res.status(200).send();
  }
  next();
});

// CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin?.includes('vercel.app')) {
      callback(null, true);
    } else {
      console.log('❌ Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Origin:', req.headers.origin);
  console.log('Method:', req.method);
  next();
});

// ============ MONGODB CONNECTION WITH CACHING ============
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    console.log('✅ Using cached MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 1,
    };

    console.log('🔄 Connecting to MongoDB...');
    console.log('MongoDB URI:', process.env.MONGODB_URI ? '✅ Present' : '❌ Missing');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('✅ MongoDB connected successfully');
        return mongoose;
      })
      .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// ============ MIDDLEWARE: Connect to DB before routes ============
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    res.status(503).json({ 
      success: false,
      message: 'Database connection failed. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Service unavailable'
    });
  }
});

// ============ TEST ROUTES ============
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'Backend is working!', 
    timestamp: new Date().toISOString(),
    dbConnected: mongoose.connection.readyState === 1
  });
});

app.get('/api', (req, res) => {
  res.json({ 
    success: true,
    message: 'Recycling Management API is running',
    endpoints: {
      auth: '/api/auth/login',
      test: '/api/test',
      products: '/api/products',
      transactions: '/api/transactions',
      pickups: '/api/pickups'
    }
  });
});

// ============ CREATE DEFAULT USERS ON STARTUP ============
async function createDefaultUsers() {
  try {
    await connectDB();
    
    // Check if admin exists
    const adminExists = await mongoose.model('User').findOne({ role: 'admin' });
    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await mongoose.model('User').create({
        name: 'Admin User',
        email: 'admin@recycling.com',
        phone: '1234567890',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        floatAmount: 0
      });
      console.log('✅ Default admin created: admin@recycling.com / admin123');
    }

    // Check if cashier exists
    const cashierExists = await mongoose.model('User').findOne({ role: 'cashier' });
    if (!cashierExists) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('cashier123', 10);
      await mongoose.model('User').create({
        name: 'Cashier User',
        email: 'cashier@recycling.com',
        phone: '9876543210',
        password: hashedPassword,
        role: 'cashier',
        isActive: true,
        floatAmount: 5000
      });
      console.log('✅ Default cashier created: cashier@recycling.com / cashier123');
    }
  } catch (error) {
    console.error('❌ Failed to create default users:', error);
  }
}

// Import routes AFTER models are registered
const authRoutes = require('./routes/auth');
const mainRoutes = require('./routes/main');

app.use('/api/auth', authRoutes);
app.use('/api', mainRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    success: false,
    message: err.message || 'Internal server error' 
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 - ${req.method} ${req.url}`);
  res.status(404).json({ 
    success: false,
    message: 'Route not found' 
  });
});

// ============ STARTUP ============
// Create default users when server starts
createDefaultUsers();

// Export for Vercel
module.exports = app;

// Only listen if running directly (not on Vercel)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Test credentials:`);
    console.log(`   Admin: admin@recycling.com / admin123`);
    console.log(`   Cashier: cashier@recycling.com / cashier123`);
  });
}