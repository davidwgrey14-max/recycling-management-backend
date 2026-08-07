const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Generate JWT Token
const generateToken = (id, role, shopId) => {
  return jwt.sign(
    { id, role, shopId },
    process.env.JWT_SECRET || 'your_secret_key_here',
    { expiresIn: '7d' }
  );
};

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('📝 Login attempt for:', email);
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email/Phone and password are required' 
      });
    }

    // Find user by email OR phone with timeout
    const user = await User.findOne({
      $or: [
        { email: email },
        { phone: email }
      ]
    }).maxTimeMS(5000);

    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    console.log('✅ User found:', { 
      id: user._id, 
      role: user.role, 
      email: user.email 
    });

    if (!user.isActive) {
      console.log('⚠️ Account deactivated:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Account is deactivated. Please contact administrator.' 
      });
    }

    // Verify password using bcrypt directly (your model has comparePassword)
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      console.log('❌ Password mismatch for:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    const token = generateToken(user._id, user.role, user.shopId);
    console.log('✅ Token generated for role:', user.role);

    res.json({
      success: true,
      token,
      role: user.role,
      userId: user._id,
      shopId: user.shopId || '',
      name: user.name,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        shopId: user.shopId,
        floatAmount: user.floatAmount || 0
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    
    // Handle timeout error
    if (error.name === 'MongoTimeoutError' || error.message?.includes('buffering timed out')) {
      return res.status(503).json({ 
        success: false,
        message: 'Database connection timeout. Please try again.',
        error: 'Database timeout'
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/auth/setup-admin
router.post('/setup-admin', async (req, res) => {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      return res.json({ 
        success: true,
        message: 'Admin already exists', 
        admin: { 
          email: existingAdmin.email, 
          role: existingAdmin.role,
          id: existingAdmin._id
        } 
      });
    }
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@recycling.com',
      phone: '1234567890',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      floatAmount: 0
    });
    
    console.log('✅ Admin created:', { id: admin._id, email: admin.email, role: admin.role });
    
    res.json({ 
      success: true,
      message: 'Test admin created successfully', 
      admin: { 
        id: admin._id,
        email: admin.email, 
        password: 'admin123',
        role: admin.role 
      } 
    });
  } catch (error) {
    console.error('❌ Setup admin error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;