const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Define schemas directly
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  phone: String,
  address: String,
  isActive: { type: Boolean, default: true }
});

const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  unit: String,
  pricePerUnit: Number,
  isActive: { type: Boolean, default: true }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully');
    
    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Product.deleteMany({});
    
    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const cashierPassword = await bcrypt.hash('cashier123', 10);
    
    // Create admin user
    console.log('Creating admin user...');
    await User.create({
      name: 'Admin User',
      email: 'admin@recycling.com',
      password:  ,
      phone: '1234567890',
      address: 'Admin Office',
      role: 'admin',
      isActive: true
    });
    console.log('✓ Admin user created');
    
    // Create cashier user
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
    console.log('✓ Cashier user created');
    
    // Create products
    console.log('Creating products...');
    await Product.insertMany([
      { name: 'Plastic Bottles', category: 'plastic', unit: 'kg', pricePerUnit: 50, isActive: true },
      { name: 'Glass Bottles', category: 'glass', unit: 'kg', pricePerUnit: 30, isActive: true },
      { name: 'Newspapers', category: 'paper', unit: 'kg', pricePerUnit: 20, isActive: true },
      { name: 'Aluminum Cans', category: 'metal', unit: 'kg', pricePerUnit: 80, isActive: true },
      { name: 'Cardboard', category: 'paper', unit: 'kg', pricePerUnit: 15, isActive: true },
      { name: 'Copper Wire', category: 'metal', unit: 'kg', pricePerUnit: 500, isActive: true }
    ]);
    console.log('✓ Products created');
    
    // Verify users were created
    const users = await User.find();
    console.log('\n✅ Database seeded successfully!');
    console.log(Total users: );
    console.log('\n📋 Login Credentials:');
    console.log('Admin:   admin@recycling.com / admin123');
    console.log('Cashier: cashier@recycling.com / cashier123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
