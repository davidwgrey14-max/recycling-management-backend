const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  shopId: {
    type: String,
    required: true
  },
  shopName: {
    type: String,
    required: true
  },
  cashierId: {
    type: String,
    required: true
  },
  cashierName: {
    type: String,
    required: true
  },
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantityKg: {
    type: Number,
    required: true,
    min: 0
  },
  pricePerKg: {
    type: Number,
    required: true,
    min: 0
  },
  totalPaid: {
    type: Number,
    required: true,
    min: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);