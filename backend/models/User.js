const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  role: {
    type: String,
    enum: ['admin', 'cashier'],
    default: 'cashier'
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  shopId: {
    type: String,
    default: null
  },
  shopName: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  floatAmount: {
    type: Number,
    default: 0
  },
  totalMoneyGiven: {
    type: Number,
    default: 0
  },
  floatHistory: {
    type: Array,
    default: []
  }
}, { 
  timestamps: true
});

// SIMPLE password hashing - NO next parameter issues
userSchema.pre('save', function() {
  if (this.isModified('password')) {
    this.password = bcrypt.hashSync(this.password, 10);
  }
});

// Compare password method
userSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compareSync(candidatePassword, this.password);
};

// Method to add float money
userSchema.methods.addFloat = function(amount, description) {
  this.floatAmount = (this.floatAmount || 0) + amount;
  this.totalMoneyGiven = (this.totalMoneyGiven || 0) + amount;
  
  if (!this.floatHistory) {
    this.floatHistory = [];
  }
  
  this.floatHistory.push({
    amount: amount,
    type: 'credit',
    description: description || `Added ${amount} KSH to float`,
    date: new Date()
  });
  
  return this.save();
};

// Method to deduct float money
userSchema.methods.deductFloat = function(amount, description) {
  if ((this.floatAmount || 0) < amount) {
    throw new Error('Insufficient float amount');
  }
  
  this.floatAmount = (this.floatAmount || 0) - amount;
  
  if (!this.floatHistory) {
    this.floatHistory = [];
  }
  
  this.floatHistory.push({
    amount: amount,
    type: 'debit',
    description: description || `Deducted ${amount} KSH from float`,
    date: new Date()
  });
  
  return this.save();
};

module.exports = mongoose.model('User', userSchema);