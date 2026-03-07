require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const connectDB = require('./db');
const Profile = require('./models/Profile');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Cloudinary config
// Needs CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- Data paths (Keep for local downloads/migrations) ---
const DATA_DIR = path.join(__dirname, 'data');
const PROFILE_PATH = path.join(DATA_DIR, 'profile.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// --- Middleware ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // set true if using HTTPS
        maxAge: 1000 * 60 * 60 * 4
    }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR)); // backward compatibility
app.use('/downloads', express.static(path.join(__dirname, 'public', 'downloads')));

// --- Multer config for Cloudinary ---
// Note: If CLOUDINARY keys are missing, multer might fail on upload.
// For a production app this is fine, but make sure to set them!
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'portfolio',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
  }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// --- Helper: read/write profile data ---
async function readProfile() {
    try {
        let profile = await Profile.findOne({ singletonId: 'main-profile' });
        if (!profile) {
            // Seed from file if exists (Migration)
            if (fs.existsSync(PROFILE_PATH)) {
                try {
                    const localData = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8'));
                    profile = new Profile({
                        singletonId: 'main-profile',
                        ...localData
                    });
                } catch (e) {
                    profile = new Profile({ singletonId: 'main-profile' });
                }
            } else {
                profile = new Profile({ singletonId: 'main-profile' });
            }
            await profile.save();
        }
        
        // Return clean POJO
        const obj = profile.toObject();
        delete obj._id;
        delete obj.__v;
        delete obj.singletonId;
        return obj;
    } catch(err) {
        console.error('Error reading profile:', err);
        return null;
    }
}

async function writeProfile(data) {
    try {
        await Profile.findOneAndUpdate(
            { singletonId: 'main-profile' },
            { $set: data },
            { upsert: true, new: true, strict: false }
        );
    } catch(err) {
        console.error('Error writing profile:', err);
    }
}

function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
}

function updateEnvPasswordHash(newHash) {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf-8');
        envContent = envContent.replace(
            /ADMIN_PASSWORD_HASH=.*/,
            `ADMIN_PASSWORD_HASH=${newHash}`
        );
        fs.writeFileSync(envPath, envContent, 'utf-8');
    }
    process.env.ADMIN_PASSWORD_HASH = newHash;
}

// PUBLIC ROUTES
app.get('/api/profile', async (req, res) => {
    const profile = await readProfile();
    if (!profile) {
        return res.status(404).json({ error: 'Profile data not found' });
    }
    res.json(profile);
});

// AUTH ROUTES
app.post('/api/setup', async (req, res) => {
    const currentHash = process.env.ADMIN_PASSWORD_HASH;
    if (currentHash && !currentHash.includes('placeholder')) {
        return res.status(403).json({ error: 'Setup already completed. Use admin panel to change password.' });
    }
    const { password } = req.body;
    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const hash = await bcrypt.hash(password, 12);
    updateEnvPasswordHash(hash);
    req.session.authenticated = true;
    res.json({ success: true, message: 'Password set successfully. You are now logged in.' });
});

app.post('/api/login', async (req, res) => {
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash || hash.includes('placeholder')) {
        return res.status(403).json({ error: 'Admin password not set. Please visit /admin.html to set up.' });
    }
    try {
        const match = await bcrypt.compare(password, hash);
        if (match) {
            req.session.authenticated = true;
            return res.json({ success: true });
        }
        return res.status(401).json({ error: 'Invalid password' });
    } catch {
        return res.status(500).json({ error: 'Authentication error' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

app.get('/api/auth-check', (req, res) => {
    const hash = process.env.ADMIN_PASSWORD_HASH;
    const needsSetup = !hash || hash.includes('placeholder');
    res.json({
        authenticated: !!(req.session && req.session.authenticated),
        needsSetup
    });
});

// ADMIN ROUTES
app.put('/api/admin/profile', requireAuth, async (req, res) => {
    const profile = await readProfile();
    if (!profile) return res.status(404).json({ error: 'Profile data not found' });
    
    const updates = req.body;
    Object.assign(profile, updates);
    await writeProfile(profile);
    res.json({ success: true, profile });
});

app.put('/api/admin/profile/:section', requireAuth, async (req, res) => {
    const profile = await readProfile();
    if (!profile) return res.status(404).json({ error: 'Profile data not found' });
    
    const { section } = req.params;
    profile[section] = req.body;
    await writeProfile(profile);
    res.json({ success: true, section, data: profile[section] });
});

app.post('/api/admin/upload', requireAuth, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const { category, caption } = req.body;
    // Cloudinary returns the full URL in req.file.path
    const imageEntry = {
        id: uuidv4(),
        category: category || 'general',
        filename: req.file.path, 
        cloudinaryId: req.file.filename, // Keep public_id to delete later
        originalName: req.file.originalname,
        caption: caption || '',
        uploadedAt: new Date().toISOString()
    };

    const profile = await readProfile();
    if (profile) {
        if (!profile.gallery) profile.gallery = [];
        profile.gallery.push(imageEntry);
        await writeProfile(profile);
    }
    
    res.json({ success: true, image: imageEntry });
});

app.delete('/api/admin/upload/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const profile = await readProfile();
    if (!profile || !profile.gallery) return res.status(404).json({ error: 'Gallery not found' });

    const imageIndex = profile.gallery.findIndex(img => img.id === id);
    if (imageIndex === -1) return res.status(404).json({ error: 'Image not found' });

    const image = profile.gallery[imageIndex];
    
    // Delete from Cloudinary if it has a cloudinaryId
    if (image.cloudinaryId) {
        try {
            await cloudinary.uploader.destroy(image.cloudinaryId);
        } catch(err) {
            console.error('Failed to delete image from Cloudinary:', err);
        }
    } else {
        // Fallback for local files
        const filePath = path.join(UPLOADS_DIR, path.basename(image.filename));
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch(e) { }
        }
    }

    profile.gallery.splice(imageIndex, 1);
    await writeProfile(profile);
    res.json({ success: true });
});

app.put('/api/admin/theme', requireAuth, async (req, res) => {
    const { theme } = req.body;
    if (!['dark', 'light', 'modern'].includes(theme)) {
        return res.status(400).json({ error: 'Invalid theme. Choose: dark, light, or modern' });
    }
    const profile = await readProfile();
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    
    profile.theme = theme;
    await writeProfile(profile);
    res.json({ success: true, theme });
});

app.put('/api/admin/password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both current and new passwords required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
    
    const hash = process.env.ADMIN_PASSWORD_HASH;
    const match = await bcrypt.compare(currentPassword, hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
    
    const newHash = await bcrypt.hash(newPassword, 12);
    updateEnvPasswordHash(newHash);
    res.json({ success: true, message: 'Password updated successfully' });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Portfolio server running at http://localhost:${PORT}`);
    console.log(`📄 Public page:  http://localhost:${PORT}`);
    console.log(`🔧 Admin panel:  http://localhost:${PORT}/admin.html\n`);

    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash || hash.includes('placeholder')) {
        console.log('⚠️  Admin password not set yet. Visit the admin panel to set up.\n');
    }
});
