require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Data paths ---
const DATA_DIR = path.join(__dirname, 'data');
const PROFILE_PATH = path.join(DATA_DIR, 'profile.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// --- Middleware ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session config
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // set true if using HTTPS
        maxAge: 1000 * 60 * 60 * 4 // 4 hours
    }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/downloads', express.static(path.join(__dirname, 'public', 'downloads')));

// --- Multer config for image uploads ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = `${uuidv4()}${ext}`;
        cb(null, name);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|webp|svg|pdf)$/i;
        if (allowed.test(path.extname(file.originalname))) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// --- Helper: read/write profile data ---
function readProfile() {
    try {
        return JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8'));
    } catch {
        return null;
    }
}

function writeProfile(data) {
    fs.writeFileSync(PROFILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// --- Auth middleware ---
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
}

// --- Helper: read/write .env for password hash ---
function updateEnvPasswordHash(newHash) {
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf-8');
    envContent = envContent.replace(
        /ADMIN_PASSWORD_HASH=.*/,
        `ADMIN_PASSWORD_HASH=${newHash}`
    );
    fs.writeFileSync(envPath, envContent, 'utf-8');
    process.env.ADMIN_PASSWORD_HASH = newHash;
}

// =====================
// PUBLIC ROUTES
// =====================

// Get profile data (public - read only)
app.get('/api/profile', (req, res) => {
    const profile = readProfile();
    if (!profile) {
        return res.status(404).json({ error: 'Profile data not found' });
    }
    res.json(profile);
});

// =====================
// AUTH ROUTES
// =====================

// First-time setup: set initial password
app.post('/api/setup', async (req, res) => {
    const currentHash = process.env.ADMIN_PASSWORD_HASH;
    // Only allow setup if password is still placeholder
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

// Login
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

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// Auth check
app.get('/api/auth-check', (req, res) => {
    const hash = process.env.ADMIN_PASSWORD_HASH;
    const needsSetup = !hash || hash.includes('placeholder');
    res.json({
        authenticated: !!(req.session && req.session.authenticated),
        needsSetup
    });
});

// =====================
// ADMIN ROUTES (protected)
// =====================

// Update full profile data
app.put('/api/admin/profile', requireAuth, (req, res) => {
    const profile = readProfile();
    if (!profile) {
        return res.status(404).json({ error: 'Profile data not found' });
    }
    const updates = req.body;
    // Merge updates into profile
    Object.assign(profile, updates);
    writeProfile(profile);
    res.json({ success: true, profile });
});

// Update a specific section
app.put('/api/admin/profile/:section', requireAuth, (req, res) => {
    const profile = readProfile();
    if (!profile) {
        return res.status(404).json({ error: 'Profile data not found' });
    }
    const { section } = req.params;
    profile[section] = req.body;
    writeProfile(profile);
    res.json({ success: true, section, data: profile[section] });
});

// Upload image
app.post('/api/admin/upload', requireAuth, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const { category, caption } = req.body;
    const imageEntry = {
        id: uuidv4(),
        category: category || 'general',
        filename: req.file.filename,
        originalName: req.file.originalname,
        caption: caption || '',
        uploadedAt: new Date().toISOString()
    };

    // Add to profile gallery
    const profile = readProfile();
    if (profile) {
        if (!profile.gallery) profile.gallery = [];
        profile.gallery.push(imageEntry);
        writeProfile(profile);
    }

    res.json({ success: true, image: imageEntry });
});

// Delete uploaded image
app.delete('/api/admin/upload/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const profile = readProfile();
    if (!profile || !profile.gallery) {
        return res.status(404).json({ error: 'Gallery not found' });
    }

    const imageIndex = profile.gallery.findIndex(img => img.id === id);
    if (imageIndex === -1) {
        return res.status(404).json({ error: 'Image not found' });
    }

    const image = profile.gallery[imageIndex];
    // Delete file from disk
    const filePath = path.join(UPLOADS_DIR, image.filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    profile.gallery.splice(imageIndex, 1);
    writeProfile(profile);
    res.json({ success: true });
});

// Change theme
app.put('/api/admin/theme', requireAuth, (req, res) => {
    const { theme } = req.body;
    if (!['dark', 'light', 'modern'].includes(theme)) {
        return res.status(400).json({ error: 'Invalid theme. Choose: dark, light, or modern' });
    }
    const profile = readProfile();
    if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
    }
    profile.theme = theme;
    writeProfile(profile);
    res.json({ success: true, theme });
});

// Change password
app.put('/api/admin/password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Both current and new passwords required' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    const hash = process.env.ADMIN_PASSWORD_HASH;
    const match = await bcrypt.compare(currentPassword, hash);
    if (!match) {
        return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const newHash = await bcrypt.hash(newPassword, 12);
    updateEnvPasswordHash(newHash);
    res.json({ success: true, message: 'Password updated successfully' });
});

// =====================
// START SERVER
// =====================
app.listen(PORT, () => {
    console.log(`\n🚀 Portfolio server running at http://localhost:${PORT}`);
    console.log(`📄 Public page:  http://localhost:${PORT}`);
    console.log(`🔧 Admin panel:  http://localhost:${PORT}/admin.html\n`);

    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash || hash.includes('placeholder')) {
        console.log('⚠️  Admin password not set yet. Visit the admin panel to set up.\n');
    }
});
