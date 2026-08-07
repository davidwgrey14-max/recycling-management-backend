// test-db.js - Test MongoDB Connection
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔍 Testing MongoDB Connection...');
console.log('📁 Current directory:', __dirname);
console.log('📝 MONGODB_URI exists:', !!process.env.MONGODB_URI);

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env file!');
  console.log('💡 Please create a .env file with: MONGODB_URI=your_connection_string');
  process.exit(1);
}

// Hide password in logs for security
const uri = process.env.MONGODB_URI;
const maskedUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//****:****@');
console.log('📝 Connection string (masked):', maskedUri);

async function testConnection() {
  try {
    console.log('\n🔄 Connecting to MongoDB...');
    console.log('⏱️  This may take a few seconds...');

    // Connect with options
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    console.log('✅ Connected successfully!');
    console.log('📊 Database name:', mongoose.connection.db.databaseName);
    console.log('📊 Host:', mongoose.connection.host);
    console.log('📊 Connection state:', mongoose.connection.readyState);

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📊 Collections found:', collections.length);
    if (collections.length > 0) {
      collections.forEach(c => console.log(`  - ${c.name}`));
    } else {
      console.log('  (No collections found - database is empty)');
    }

    // Try to find users if collection exists
    if (collections.some(c => c.name === 'users')) {
      console.log('\n📊 Checking users...');
      const users = await mongoose.connection.db.collection('users').find({}).limit(5).toArray();
      console.log(`  Found ${users.length} users:`);
      users.forEach(u => {
        console.log(`  - ${u.name || 'No name'} (${u.email}) - Role: ${u.role || 'No role'}`);
      });
    }

    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('  Error type:', error.name);
    console.error('  Error message:', error.message);
    console.error('  Error code:', error.code || 'N/A');

    // Provide helpful suggestions
    console.log('\n💡 Possible issues and solutions:');
    
    if (error.message.includes('bad auth') || error.message.includes('authentication failed')) {
      console.log('  🔑 Authentication failed:');
      console.log('    - Check your username and password in the connection string');
      console.log('    - Make sure the user has read/write permissions');
      console.log('    - Reset password in MongoDB Atlas if needed');
    }
    
    if (error.message.includes('not whitelisted') || error.message.includes('IP')) {
      console.log('  🌐 IP whitelist issue:');
      console.log('    - Go to MongoDB Atlas → Network Access');
      console.log('    - Add your current IP address');
      console.log('    - Or add 0.0.0.0/0 for testing');
    }
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.log('  🌍 DNS/Network issue:');
      console.log('    - Check your cluster name in the connection string');
      console.log('    - Make sure you have internet connectivity');
      console.log('    - Try pinging the cluster address');
    }
    
    if (error.message.includes('timed out') || error.message.includes('timeout')) {
      console.log('  ⏱️  Timeout issue:');
      console.log('    - Check if MongoDB Atlas cluster is running');
      console.log('    - Check your firewall settings');
      console.log('    - Try a different network connection');
    }

    if (error.message.includes('MongoServerSelectionError')) {
      console.log('  🔄 Server selection error:');
      console.log('    - Check if your cluster is active (not paused)');
      console.log('    - Verify the connection string is correct');
      console.log('    - Check MongoDB Atlas status page');
    }
  } finally {
    // Close connection if open
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

// Run the test
testConnection();
