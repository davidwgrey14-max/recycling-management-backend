const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Pickup = require('../models/Pickup');
const Shop = require('../models/Shop');

// ========== MIDDLEWARE ==========
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Auth header present:', !!authHeader);
  console.log('Token present:', !!token);

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key_here');
    console.log('Decoded token:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

const authorizeAdmin = (req, res, next) => {
  console.log('User from token:', req.user);
  console.log('User role from token:', req.user?.role);
  
  if (!req.user) {
    return res.status(403).json({ message: 'No user information found.' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only. Your role: ' + req.user.role });
  }
  
  next();
};
// ========== SHOPS MANAGEMENT ==========
router.get('/shops', authenticateToken, async (req, res) => {
  try {
    const shops = await Shop.find({ isActive: true }).sort('shopName');
    res.json(shops);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/shops', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { shopId, shopName, town, address, phone } = req.body;
    
    const existingShop = await Shop.findOne({ shopId });
    if (existingShop) {
      return res.status(400).json({ message: 'Shop ID already exists' });
    }
    
    const shop = await Shop.create({ shopId, shopName, town, address, phone });
    res.status(201).json(shop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/shops/:shopId', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const shop = await Shop.findOneAndUpdate(
      { shopId: req.params.shopId },
      req.body,
      { new: true }
    );
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/shops/:shopId', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const shop = await Shop.findOneAndUpdate(
      { shopId: req.params.shopId },
      { isActive: false },
      { new: true }
    );
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    res.json({ message: 'Shop deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== CASHIERS MANAGEMENT ==========
router.get('/cashiers', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const cashiers = await User.find({ role: 'cashier' }).select('-password').sort('name');
    res.json(cashiers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/cashiers', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { name, email, password, phone, shopId, floatAmount } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    let shopName = '';
    if (shopId) {
      const shop = await Shop.findOne({ shopId });
      shopName = shop ? shop.shopName : '';
    }
    
    const cashier = new User({
      name, email, password, phone,
      shopId: shopId || null,
      shopName: shopName,
      role: 'cashier',
      floatAmount: parseFloat(floatAmount) || 0,
      totalMoneyGiven: parseFloat(floatAmount) || 0
    });
    
    await cashier.save();
    
    if (floatAmount > 0) {
      cashier.floatHistory = [{
        amount: parseFloat(floatAmount),
        type: 'credit',
        description: 'Initial float on account creation',
        date: new Date()
      }];
      await cashier.save();
    }
    
    const cashierResponse = cashier.toObject();
    delete cashierResponse.password;
    
    res.status(201).json(cashierResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Give money to cashier
router.put('/cashiers/:id/float', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Please provide a valid amount' });
    }
    
    const cashier = await User.findById(req.params.id);
    if (!cashier) return res.status(404).json({ message: 'Cashier not found' });
    if (cashier.role !== 'cashier') return res.status(400).json({ message: 'User is not a cashier' });
    
    const oldFloat = cashier.floatAmount;
    cashier.floatAmount = (cashier.floatAmount || 0) + parseFloat(amount);
    cashier.totalMoneyGiven = (cashier.totalMoneyGiven || 0) + parseFloat(amount);
    
    if (!cashier.floatHistory) cashier.floatHistory = [];
    cashier.floatHistory.push({
      amount: parseFloat(amount),
      type: 'credit',
      description: `Admin added ${amount} KSH to float`,
      date: new Date()
    });
    
    await cashier.save();
    
    res.json({
      message: `Successfully added ${amount} KSH to ${cashier.name}'s float`,
      floatAmount: cashier.floatAmount,
      totalMoneyGiven: cashier.totalMoneyGiven,
      oldFloat: oldFloat
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current cashier's float
router.get('/cashiers/me/float', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'cashier') {
      return res.status(403).json({ message: 'Only cashiers can access float information' });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ floatAmount: user.floatAmount || 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get cashier's shop info
router.get('/cashiers/me/shop', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'cashier') {
      return res.status(403).json({ message: 'Only cashiers can access shop information' });
    }
    const user = await User.findById(req.user.id);
    if (!user || !user.shopId) return res.status(404).json({ message: 'Shop not found for this cashier' });
    const shop = await Shop.findOne({ shopId: user.shopId });
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== PRODUCTS MANAGEMENT ==========

// Get all products
router.get('/products', authenticateToken, async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort('itemName');
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add new product - FIXED
router.post('/products', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { category, itemName, pricePerKg } = req.body;
    
    console.log('Adding product:', { category, itemName, pricePerKg });
    
    // Validate required fields
    if (!category || !itemName || !pricePerKg) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check if product with same name and category already exists
    const existingProduct = await Product.findOne({ 
      itemName: { $regex: new RegExp(`^${itemName}$`, 'i') },
      category: { $regex: new RegExp(`^${category}$`, 'i') }
    });
    
    if (existingProduct) {
      return res.status(400).json({ message: 'Product already exists' });
    }
    
    const product = await Product.create({
      category: category.trim(),
      itemName: itemName.trim(),
      pricePerKg: parseFloat(pricePerKg),
      isActive: true
    });
    
    console.log('Product created:', product);
    res.status(201).json(product);
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update product
router.put('/products/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { pricePerKg } = req.body;
    
    if (!pricePerKg || pricePerKg <= 0) {
      return res.status(400).json({ message: 'Valid price per KG is required' });
    }
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { pricePerKg: parseFloat(pricePerKg) },
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete product (soft delete)
router.delete('/products/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ message: 'Product deactivated successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: error.message });
  }
});

// ========== TRANSACTIONS ==========
router.post('/transactions', authenticateToken, async (req, res) => {
  try {
    const { productId, productName, quantityKg, pricePerKg, totalPaid } = req.body;
    
    if (req.user.role !== 'cashier') {
      return res.status(403).json({ message: 'Only cashiers can create transactions' });
    }
    
    const cashier = await User.findById(req.user.id);
    if (!cashier) return res.status(404).json({ message: 'Cashier not found' });
    
    if (!cashier.shopId) {
      return res.status(400).json({ message: 'Cashier has no shop assigned. Please contact admin.' });
    }
    
    if ((cashier.floatAmount || 0) < totalPaid) {
      return res.status(400).json({ 
        message: `Insufficient float! Need ${totalPaid} KSH, have ${cashier.floatAmount} KSH` 
      });
    }
    
    let shopName = cashier.shopName;
    if (!shopName) {
      const shop = await Shop.findOne({ shopId: cashier.shopId });
      shopName = shop ? shop.shopName : cashier.shopId;
    }
    
    // Deduct from cashier's float
    const newFloat = (cashier.floatAmount || 0) - totalPaid;
    
    const transaction = new Transaction({
      shopId: cashier.shopId,
      shopName: shopName,
      cashierId: cashier._id,
      cashierName: cashier.name,
      productId,
      productName,
      quantityKg: parseFloat(quantityKg),
      pricePerKg: parseFloat(pricePerKg),
      totalPaid: parseFloat(totalPaid),
      timestamp: new Date()
    });
    
    cashier.floatAmount = newFloat;
    if (!cashier.floatHistory) cashier.floatHistory = [];
    cashier.floatHistory.push({
      amount: totalPaid,
      type: 'debit',
      description: `Purchase: ${quantityKg}kg of ${productName} for ${totalPaid} KSH`,
      date: new Date()
    });
    
    await transaction.save();
    await cashier.save();
    
    res.json({ transaction, newFloat: cashier.floatAmount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'cashier') query.cashierId = req.user.id;
    const transactions = await Transaction.find(query).sort('-timestamp').limit(100);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// ========== PICKUPS ==========

// Record a pickup (admin or cashier)
router.post('/pickups', authenticateToken, async (req, res) => {
  try {
    const { shopId, shopName, items } = req.body;
    
    console.log('Pickup request:', { shopId, shopName, itemsCount: items?.length });
    
    // Validate required fields
    if (!shopId) {
      return res.status(400).json({ message: 'Shop ID is required' });
    }
    if (!shopName) {
      return res.status(400).json({ message: 'Shop name is required' });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }
    
    let recordedBy = '';
    if (req.user.role === 'admin') {
      recordedBy = 'Admin';
    } else {
      const cashier = await User.findById(req.user.id);
      recordedBy = cashier ? cashier.name : 'Cashier';
    }
    
    // Process items
    const processedItems = items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      kgsTaken: parseFloat(item.kgsTaken),
      pricePerKg: item.pricePerKg || 0
    }));
    
    // Calculate total value
    const totalValue = processedItems.reduce((sum, item) => sum + (item.pricePerKg * item.kgsTaken), 0);
    
    // Create pickup - use new instead of create to avoid validation issues
    const pickup = new Pickup({
      shopId,
      shopName,
      recordedBy,
      recordedById: req.user.id,
      items: processedItems,
      totalValue,
      timestamp: new Date()
    });
    
    await pickup.save();
    
    res.status(201).json(pickup);
  } catch (error) {
    console.error('Error recording pickup:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all pickups
router.get('/pickups', authenticateToken, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'cashier') {
      query.recordedById = req.user.id;
    }
    
    const pickups = await Pickup.find(query).sort('-timestamp').limit(100);
    res.json(pickups);
  } catch (error) {
    console.error('Error fetching pickups:', error);
    res.status(500).json({ message: error.message });
  }
});
// ========== REMAINING STOCK ==========
router.get('/remaining-stock/:shopId', authenticateToken, async (req, res) => {
  try {
    const { shopId } = req.params;
    const transactions = await Transaction.find({ shopId });
    const pickups = await Pickup.find({ shopId });
    
    const boughtMap = {};
    transactions.forEach(t => {
      if (!boughtMap[t.productId]) boughtMap[t.productId] = { bought: 0 };
      boughtMap[t.productId].bought += t.quantityKg;
    });
    
    const pickedMap = {};
    pickups.forEach(p => {
      p.items.forEach(item => {
        if (!pickedMap[item.productId]) pickedMap[item.productId] = { pickedUp: 0 };
        pickedMap[item.productId].pickedUp += item.kgsTaken;
      });
    });
    
    const products = await Product.find({ isActive: true });
    const remainingStock = products.map(product => ({
      productId: product._id,
      productName: product.itemName,
      category: product.category,
      pricePerKg: product.pricePerKg,
      bought: boughtMap[product._id]?.bought || 0,
      pickedUp: pickedMap[product._id]?.pickedUp || 0,
      remaining: (boughtMap[product._id]?.bought || 0) - (pickedMap[product._id]?.pickedUp || 0)
    }));
    
    res.json(remainingStock);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== DASHBOARD ==========
router.get('/dashboard', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const transactions = await Transaction.find();
    const totalBoughtKg = transactions.reduce((sum, t) => sum + (t.quantityKg || 0), 0);
    const totalExpenses = transactions.reduce((sum, t) => sum + (t.totalPaid || 0), 0);
    const totalTransactions = transactions.length;
    
    const pickups = await Pickup.find();
    const totalPickupValue = pickups.reduce((sum, p) => sum + (p.totalValue || 0), 0);
    
    const cashiers = await User.find({ role: 'cashier' }).select('-password');
    const activeProducts = await Product.countDocuments({ isActive: true });
    
    res.json({
      totalBoughtKg, totalExpenses, totalTransactions, totalPickupValue,
      netRevenue: totalPickupValue - totalExpenses, activeProducts,
      cashiers: cashiers.map(c => ({
        _id: c._id, name: c.name, email: c.email, phone: c.phone,
        shopId: c.shopId, floatAmount: c.floatAmount || 0, totalMoneyGiven: c.totalMoneyGiven || 0
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== REPORTS ==========
router.get('/reports/daily', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = new Date(date || new Date());
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const query = {};
    if (req.user.role === 'cashier') query.cashierId = req.user.id;

    const transactions = await Transaction.find({
      ...query,
      timestamp: { $gte: targetDate, $lt: nextDate }
    });

    const pickups = await Pickup.find({
      timestamp: { $gte: targetDate, $lt: nextDate }
    });

    res.json({
      date: targetDate,
      totalRevenue: transactions.reduce((sum, t) => sum + t.totalPaid, 0),
      totalTransactions: transactions.length,
      totalPickups: pickups.length,
      transactions, pickups
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;