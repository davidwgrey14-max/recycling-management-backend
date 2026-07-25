const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
    
    console.log('Login attempt for:', email);
    
    // Find user by email OR phone
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.findOne({ phone: email });
    }
    
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('User found:', { id: user._id, role: user.role, email: user.email });

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      console.log('Password mismatch for:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, user.role, user.shopId);
    console.log('Token generated for role:', user.role);

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
        shopId: user.shopId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// TEMPORARY: Create test admin if none exists
router.post('/setup-admin', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      return res.json({ 
        message: 'Admin already exists', 
        admin: { 
          email: existingAdmin.email, 
          role: existingAdmin.role,
          id: existingAdmin._id
        } 
      });
    }
    
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      phone: '1234567890',
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });
    
    console.log('Admin created:', { id: admin._id, email: admin.email, role: admin.role });
    
    res.json({ 
      message: 'Test admin created successfully', 
      admin: { 
        id: admin._id,
        email: admin.email, 
        password: 'admin123',
        role: admin.role 
      } 
    });
  } catch (error) {
    console.error('Setup admin error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;