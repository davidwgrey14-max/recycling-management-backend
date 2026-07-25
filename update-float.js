const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Simple schema for update
const SimpleUserSchema = new mongoose.Schema({
  email: String,
  name: String,
  role: String,
  floatAmount: { type: Number, default: 0 },
  floatHistory: { type: Array, default: [] },
  password: String,
  phone: String,
  address: String,
  isActive: { type: Boolean, default: true }
});

const User = mongoose.model('User', SimpleUserSchema);

const updateUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find the cashier
    let cashier = await User.findOne({ email: 'cashier@recycling.com' });
    
    if (cashier) {
      console.log('Found cashier:', cashier.name);
      cashier.floatAmount = 50000;
      if (!cashier.floatHistory) cashier.floatHistory = [];
      cashier.floatHistory.push({
        amount: 50000,
        type: 'credit',
        description: 'Initial float setup',
        date: new Date()
      });
      await cashier.save();
      console.log('Cashier float updated to:', cashier.floatAmount);
    } else {
      // Create cashier if not exists
      const hashedPassword = await bcrypt.hash('cashier123', 10);
      cashier = new User({
        name: 'Cashier User',
        email: 'cashier@recycling.com',
        password: hashedPassword,
        role: 'cashier',
        phone: '0987654321',
        address: 'Recycling Center',
        isActive: true,
        floatAmount: 50000,
        floatHistory: [{
          amount: 50000,
          type: 'credit',
          description: 'Initial float setup',
          date: new Date()
        }]
      });
      await cashier.save();
      console.log('Cashier created with float: 50000 KSH');
    }
    
    // Update admin
    let admin = await User.findOne({ email: 'admin@recycling.com' });
    if (admin) {
      admin.floatAmount = 0;
      await admin.save();
      console.log('Admin updated');
    } else {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = new User({
        name: 'Admin User',
        email: 'admin@recycling.com',
        password: hashedPassword,
        role: 'admin',
        phone: '1234567890',
        address: 'Admin Office',
        isActive: true,
        floatAmount: 0
      });
      await admin.save();
      console.log('Admin created');
    }
    
    console.log('\n Setup complete!');
    console.log('Cashier Float: 50,000 KSH');
    console.log('Admin Login: admin@recycling.com / admin123');
    console.log('Cashier Login: cashier@recycling.com / cashier123');
    
    process.exit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

updateUsers();
