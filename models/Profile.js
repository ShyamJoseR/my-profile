const mongoose = require('mongoose');

// Using strict: false because the profile data has many dynamic sections 
// (personal, experience, education, skills, gallery, etc.)
const ProfileSchema = new mongoose.Schema({
    // Optional static fields can go here, but strict: false allows dynamic additions
    singletonId: { type: String, default: 'main-profile' }
}, { strict: false, timestamps: true });

module.exports = mongoose.model('Profile', ProfileSchema);
