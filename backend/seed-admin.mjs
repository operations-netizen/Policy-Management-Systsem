import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

config();
 
const UserSchema = new mongoose.Schema({
  openId: { type: String, required: true, unique: true },
  name: String,
  email: { type: String, required: true, unique: true },
  loginMethod: String,
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'hod', 'initiator', 'accounts_manager', 'user'],
    default: 'user',
    required: true 
  },
  employeeType: {
    type: String,
    enum: ['permanent', 'freelancer_india', 'freelancer_usa'],
  },
  hodId: String,
  lastSignedIn: { type: Date, default: Date.now },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function seedAdmin() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'suraj@wytlabs.com' });
    if (existingAdmin) {
      console.log('✅ Admin account already exists');
      console.log('Email:', existingAdmin.email);
      console.log('Name:', existingAdmin.name);
      console.log('Role:', existingAdmin.role);
      console.log('Has password:', !!existingAdmin.password);
      
      // Update password if missing or incorrect
      if (!existingAdmin.password) {
        console.log('⚠️  Password missing! Updating...');
        const hashedPassword = await bcrypt.hash('Suraj1@23', 10);
        existingAdmin.password = hashedPassword;
        await existingAdmin.save();
        console.log('✅ Password updated');
      }
      
      await mongoose.connection.close();
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('Suraj1@23', 10);

    // Create admin user
    const admin = new User({
      openId: 'admin-' + Date.now(),
      name: 'Suraj Kumar',
      email: 'suraj@wytlabs.com',
      loginMethod: 'email',
      password: hashedPassword,
      role: 'admin',
      employeeType: 'permanent',
      lastSignedIn: new Date(),
    });

    await admin.save();
    console.log('✅ Admin account created successfully!');
    console.log('Email: suraj@wytlabs.com');
    console.log('Password: Suraj1@23');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
