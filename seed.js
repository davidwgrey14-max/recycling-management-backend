const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  phone: String,
  address: String,
  isActive: Boolean
});

const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  unit: String,
  pricePerUnit: Number,
  isActive: Boolean
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully');
    
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Product.deleteMany({});
    
    const adminPassword = await bcrypt.hash('admin123', 10);
    const cashierPassword = await bcrypt.hash('cashier123', 10);
    
    console.log('Creating admin user...');
    await User.create({
      name: 'Admin User',
      email: 'admin@recycling.com',
      password: adminPassword,
      phone: '1234567890',
      address: 'Admin Office',
      role: 'admin',
      isActive: true
    });
    console.log('Admin user created');
    
    console.log('Creating cashier user...');
    await User.create({
      name: 'Cashier User',
      email: 'cashier@recycling.com',
      password: cashierPassword,
      phone: '0987654321',
      address: 'Recycling Center',
      role: 'cashier',
      isActive: true
    });
    console.log('Cashier user created');
    
    console.log('Creating products...');
    await Product.insertMany([
      { name: 'Plastic Bottles', category: 'plastic', unit: 'kg', pricePerUnit: 50, isActive: true },
      { name: 'Glass Bottles', category: 'glass', unit: 'kg', pricePerUnit: 30, isActive: true },
      { name: 'Newspapers', category: 'paper', unit: 'kg', pricePerUnit: 20, isActive: true },
      { name: 'Aluminum Cans', category: 'metal', unit: 'kg', pricePerUnit: 80, isActive: true },
      { name: 'Cardboard', category: 'paper', unit: 'kg', pricePerUnit: 15, isActive: true }
    ]);
    console.log('Products created');
    
    console.log('');
    console.log('Database seeded successfully!');
    console.log('Admin: admin@recycling.com / admin123');
    console.log('Cashier: cashier@recycling.com / cashier123');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
