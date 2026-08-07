const mongoose = require('mongoose');

const pickupSchema = new mongoose.Schema({
  shopId: {
    type: String,
    required: true
  },
  shopName: {
    type: String,
    required: true
  },
  recordedBy: {
    type: String,
    required: true
  },
  recordedById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  items: [{
    productId: {
      type: String,
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    kgsTaken: {
      type: Number,
      required: true,
      min: 0
    },
    pricePerKg: {
      type: Number,
      default: 0
    }
  }],
  totalValue: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  }
});

// Calculate total value before saving - NO next parameter
pickupSchema.pre('save', function() {
  this.totalValue = this.items.reduce((sum, item) => sum + ((item.pricePerKg || 0) * (item.kgsTaken || 0)), 0);
});

module.exports = mongoose.model('Pickup', pickupSchema);