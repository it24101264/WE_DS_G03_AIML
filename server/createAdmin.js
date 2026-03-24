// createAdmin.js
// Run this ONCE to create an admin account in the database
// Command: node createAdmin.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');
const connectDB = require('./config/db');
const createAdmin = async () => {
  await connectDB();

  try {
    // Check if admin already exists
    const existing = await User.findOne({ email: 'admin@smartuni.com' });
    if (existing) {
      console.log('⚠️  Admin already exists!');
      console.log('Email: admin@smartuni.com');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@smartuni.com',
      password: 'admin123',  // ← change this password if you want
      role: 'admin',
    });

    console.log('✅ Admin account created!');
    console.log('─────────────────────────');
    console.log('Email:    admin@smartuni.com');
    console.log('Password: admin123');
    console.log('─────────────────────────');
    console.log('Use these credentials to log in as admin in the app.');
  } catch (error) {
    console.error('Error creating admin:', error.message);
  }

  process.exit(0);
};

createAdmin();
