const mongoose = require('mongoose');
const dns = require('dns');

// Force Node.js to use Google DNS to bypass local Windows SRV resolution issues
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
    try {
        // We'll require MONGODB_URI in the .env file. 
        // For local development before they add it, we can fallback to a local DB or just log a warning.
        if (!process.env.MONGODB_URI) {
            console.warn('⚠️ MONGODB_URI is not set in .env. MongoDB connection will fail.');
        }
        
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio');
        console.log('🍃 MongoDB Connected Successfully');
    } catch (err) {
        console.error('❌ Database connection error:', err.message);
        // We don't exit process strictly so the app doesn't crash repeatedly on render if env isn't set yet.
        // It gives the user a chance to set it.
    }
};

module.exports = connectDB;
