/* ==========================================
   Admin Panel – Full CRUD Logic
   ========================================== */

let profileData = null;

// ---- Init ----
document.addEventListener('DOMContentLoaded', init);

async function init() {
    const authRes = await fetch('/api/auth-check');
    const auth = await authRes.json();

    if (auth.needsSetup) {
        showSetupMode();
    } else if (auth.authenticated) {
        showDashboard();
    } else {
        showLoginMode();
    }

    initTabs();
    initLogout();
    initFilePreview();
}

// ---- Auth Modes ----
// Dynamic MFA means no "setup" mode is ever needed.
function showSetupMode() {
    showLoginMode();
}

function showLoginMode() {
    document.getElementById('authScreen').style.display = '';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('authCardLogin').style.display = '';
    document.getElementById('authCardOtp').style.display = 'none';

    document.getElementById('authForm').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pw = document.getElementById('loginPassword').value;

        const btn = document.getElementById('authBtn');
        const origText = btn.textContent;
        btn.textContent = 'Sending...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, gmailAppPassword: pw })
            });
            const data = await res.json();

            btn.textContent = origText;
            btn.disabled = false;

            if (res.ok && data.mfaRequired) {
                showOtpMode();
            } else {
                showAuthError(data.error || 'Authentication error');
            }
        } catch {
            btn.textContent = origText;
            btn.disabled = false;
            showAuthError('Connection error');
        }
    };
}

function showOtpMode() {
    document.getElementById('authCardLogin').style.display = 'none';
    document.getElementById('authCardOtp').style.display = '';

    document.getElementById('otpForm').onsubmit = async (e) => {
        e.preventDefault();
        const otp = document.getElementById('otpInput').value;

        try {
            const res = await fetch('/api/mfa-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp })
            });
            const data = await res.json();

            if (res.ok) {
                showDashboard();
            } else {
                document.getElementById('otpError').textContent = data.error || 'Invalid OTP';
                setTimeout(() => { document.getElementById('otpError').textContent = ''; }, 4000);
            }
        } catch {
            document.getElementById('otpError').textContent = 'Connection error';
        }
    };
}

function showAuthError(msg) {
    document.getElementById('authError').textContent = msg;
    setTimeout(() => { document.getElementById('authError').textContent = ''; }, 4000);
}

async function showDashboard() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = '';
    await loadProfile();
    populateAllForms();
}

// ---- Load Profile Data ----
async function loadProfile() {
    const res = await fetch('/api/profile');
    profileData = await res.json();
}

// ---- Tabs ----
function initTabs() {
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            link.classList.add('active');
            const tab = link.getAttribute('data-tab');
            document.getElementById(`tab-${tab}`).classList.add('active');
        });
    });
}

// ---- Logout ----
function initLogout() {
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        location.reload();
    });
}

// ---- File Preview ----
function initFilePreview() {
    document.getElementById('profileImageInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = document.getElementById('profilePreview');
                img.src = ev.target.result;
                img.style.display = '';
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('galleryImageInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        document.getElementById('galleryFileName').textContent = file ? file.name : '';
    });
}

// ---- Populate All Forms ----
function populateAllForms() {
    if (!profileData) return;

    // Hero
    const h = profileData.hero || {};
    document.getElementById('heroName').value = h.name || '';
    document.getElementById('heroTitleInput').value = h.title || '';
    document.getElementById('heroTagline').value = h.tagline || '';
    document.getElementById('heroQuote').value = h.quote || '';
    if (h.profileImage) {
        const img = document.getElementById('profilePreview');
        img.src = h.profileImage;
        img.style.display = '';
    }

    // About
    renderAboutParagraphs();

    // Experience
    renderExperienceList();

    // Education
    const ed = profileData.education || {};
    document.getElementById('eduDegree').value = ed.degree || '';
    document.getElementById('eduCollege').value = ed.college || '';
    document.getElementById('eduAggregate').value = ed.aggregate || '';
    document.getElementById('eduTimeline').value = ed.timeline || '';

    // Skills
    renderSkillsCategories();

    // Certifications
    renderCertificationsList();

    // Awards
    renderAwardsList();

    // Projects
    renderProjectsList();

    // Gallery
    renderGalleryAdmin();

    // Contact
    const c = profileData.contact || {};
    document.getElementById('contactEmail').value = c.email || '';
    document.getElementById('contactPhone').value = c.phone || '';
    document.getElementById('contactLocation').value = c.location || '';
    document.getElementById('contactLinkedin').value = c.linkedin || '';
    document.getElementById('contactGithub').value = c.github || '';

    // Theme
    const themeRadio = document.querySelector(`input[name="theme"][value="${profileData.theme || 'dark'}"]`);
    if (themeRadio) themeRadio.checked = true;
}

// ==========================================
// SECTION: ABOUT
// ==========================================
function renderAboutParagraphs() {
    const container = document.getElementById('aboutParagraphs');
    const paragraphs = (profileData.about && profileData.about.paragraphs) || [];
    container.innerHTML = paragraphs.map((p, i) => `
    <div class="list-item">
      <div class="list-item-header">
        <span class="list-item-title">Paragraph ${i + 1}</span>
        <button class="remove-btn" onclick="removeAboutParagraph(${i})">✕</button>
      </div>
      <div class="form-group">
        <textarea class="input about-para" rows="3">${escHtml(p)}</textarea>
      </div>
    </div>
  `).join('');
}

function addAboutParagraph() {
    if (!profileData.about) profileData.about = { paragraphs: [] };
    profileData.about.paragraphs.push('');
    renderAboutParagraphs();
}

function removeAboutParagraph(idx) {
    profileData.about.paragraphs.splice(idx, 1);
    renderAboutParagraphs();
}

// ==========================================
// SECTION: EXPERIENCE
// ==========================================
function renderExperienceList() {
    const container = document.getElementById('experienceList');
    const items = profileData.experience || [];
    container.innerHTML = items.map((exp, i) => `
    <div class="list-item">
      <div class="list-item-header">
        <span class="list-item-title">${escHtml(exp.company || 'New Entry')}</span>
        <button class="remove-btn" onclick="removeExperience(${i})">✕</button>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Company</label><input class="input exp-company" value="${escAttr(exp.company)}"></div>
        <div class="form-group"><label>Role</label><input class="input exp-role" value="${escAttr(exp.role)}"></div>
      </div>
      <div class="form-group"><label>Period</label><input class="input exp-period" value="${escAttr(exp.period)}"></div>
      <div class="form-group"><label>Description</label><textarea class="input exp-desc" rows="2">${escHtml(exp.description)}</textarea></div>
      <div class="form-group"><label>Highlights (one per line)</label><textarea class="input exp-highlights" rows="3">${escHtml((exp.highlights || []).join('\n'))}</textarea></div>
    </div>
  `).join('');
}

function addExperience() {
    if (!profileData.experience) profileData.experience = [];
    profileData.experience.push({ company: '', role: '', period: '', description: '', highlights: [] });
    renderExperienceList();
}

function removeExperience(idx) {
    profileData.experience.splice(idx, 1);
    renderExperienceList();
}

// ==========================================
// SECTION: SKILLS
// ==========================================
function renderSkillsCategories() {
    const container = document.getElementById('skillsCategories');
    const skills = profileData.skills || {};
    const entries = Object.entries(skills);
    container.innerHTML = entries.map(([cat, items], i) => `
    <div class="list-item">
      <div class="list-item-header">
        <span class="list-item-title">${escHtml(cat)}</span>
        <button class="remove-btn" onclick="removeSkillCategory(${i})">✕</button>
      </div>
      <div class="form-group"><label>Category Name</label><input class="input skill-cat-name" value="${escAttr(cat)}" data-idx="${i}"></div>
      <div class="form-group"><label>Skills (comma-separated)</label><input class="input skill-cat-items" value="${escAttr(items.join(', '))}" data-idx="${i}"></div>
    </div>
  `).join('');
}

function addSkillCategory() {
    if (!profileData.skills) profileData.skills = {};
    profileData.skills['New Category'] = [];
    renderSkillsCategories();
}

function removeSkillCategory(idx) {
    const keys = Object.keys(profileData.skills);
    delete profileData.skills[keys[idx]];
    renderSkillsCategories();
}

// ==========================================
// SECTION: CERTIFICATIONS
// ==========================================
function renderCertificationsList() {
    const container = document.getElementById('certificationsList');
    const items = profileData.certifications || [];
    container.innerHTML = items.map((cert, i) => `
    <div class="list-item">
      <div class="list-item-header">
        <span class="list-item-title">${escHtml(cert.name || 'New Certification')}</span>
        <button class="remove-btn" onclick="removeCertification(${i})">✕</button>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Name</label><input class="input cert-name" value="${escAttr(cert.name)}"></div>
        <div class="form-group"><label>Issuer</label><input class="input cert-issuer" value="${escAttr(cert.issuer)}"></div>
      </div>
      <div class="form-group"><label>Certificate Link (optional)</label><input class="input cert-link" value="${escAttr(cert.link || '')}"></div>
    </div>
  `).join('');
}

function addCertification() {
    if (!profileData.certifications) profileData.certifications = [];
    profileData.certifications.push({ name: '', issuer: '', link: null, image: null });
    renderCertificationsList();
}

function removeCertification(idx) {
    profileData.certifications.splice(idx, 1);
    renderCertificationsList();
}

// ==========================================
// SECTION: AWARDS
// ==========================================
function renderAwardsList() {
    const container = document.getElementById('awardsList');
    const items = profileData.awards || [];
    container.innerHTML = items.map((award, i) => `
    <div class="list-item">
      <div class="list-item-header">
        <span class="list-item-title">${escHtml(award.name || 'New Award')}</span>
        <button class="remove-btn" onclick="removeAward(${i})">✕</button>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Name</label><input class="input award-name" value="${escAttr(award.name)}"></div>
        <div class="form-group"><label>Issuer</label><input class="input award-issuer" value="${escAttr(award.issuer)}"></div>
      </div>
    </div>
  `).join('');
}

function addAward() {
    if (!profileData.awards) profileData.awards = [];
    profileData.awards.push({ name: '', issuer: '', image: null });
    renderAwardsList();
}

function removeAward(idx) {
    profileData.awards.splice(idx, 1);
    renderAwardsList();
}

// ==========================================
// SECTION: PROJECTS
// ==========================================
function renderProjectsList() {
    const container = document.getElementById('projectsList');
    const items = profileData.projects || [];
    container.innerHTML = items.map((proj, i) => `
    <div class="list-item">
      <div class="list-item-header">
        <span class="list-item-title">${escHtml(proj.name || 'New Project')}</span>
        <button class="remove-btn" onclick="removeProject(${i})">✕</button>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Name</label><input class="input proj-name" value="${escAttr(proj.name)}"></div>
        <div class="form-group"><label>Period</label><input class="input proj-period" value="${escAttr(proj.period)}"></div>
      </div>
      <div class="form-group"><label>Description</label><textarea class="input proj-desc" rows="2">${escHtml(proj.description)}</textarea></div>
    </div>
  `).join('');
}

function addProject() {
    if (!profileData.projects) profileData.projects = [];
    profileData.projects.push({ name: '', period: '', description: '' });
    renderProjectsList();
}

function removeProject(idx) {
    profileData.projects.splice(idx, 1);
    renderProjectsList();
}

// ==========================================
// SECTION: GALLERY
// ==========================================
function renderGalleryAdmin() {
    const container = document.getElementById('galleryAdminGrid');
    const items = profileData.gallery || [];
    if (!items.length) {
        container.innerHTML = '<p class="empty-state">No images uploaded yet.</p>';
        return;
    }
    container.innerHTML = items.map(item => `
    <div class="gallery-admin-item">
      <img src="${item.filename.startsWith('http') ? item.filename : '/uploads/' + item.filename}" alt="${escAttr(item.caption || '')}">
      <div class="gallery-admin-item-info">
        <span class="gallery-admin-item-caption">${escHtml(item.caption || item.originalName || '')}</span>
        <button class="gallery-delete-btn" onclick="deleteGalleryImage('${item.id}')">✕</button>
      </div>
    </div>
  `).join('');
}

async function uploadGalleryImage() {
    const fileInput = document.getElementById('galleryImageInput');
    const file = fileInput.files[0];
    if (!file) return toast('Please select a file', 'error');

    const formData = new FormData();
    formData.append('image', file);
    formData.append('category', document.getElementById('galleryCategory').value);
    formData.append('caption', document.getElementById('galleryCaption').value);

    try {
        const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) {
            toast('Image uploaded successfully!', 'success');
            await loadProfile();
            renderGalleryAdmin();
            fileInput.value = '';
            document.getElementById('galleryCaption').value = '';
            document.getElementById('galleryFileName').textContent = '';
        } else {
            toast(data.error || 'Upload failed', 'error');
        }
    } catch {
        toast('Upload failed', 'error');
    }
}

async function deleteGalleryImage(id) {
    if (!confirm('Delete this image?')) return;
    try {
        const res = await fetch(`/api/admin/upload/${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast('Image deleted', 'success');
            await loadProfile();
            renderGalleryAdmin();
        }
    } catch {
        toast('Delete failed', 'error');
    }
}

// ==========================================
// SAVE SECTIONS
// ==========================================
async function saveSection(section) {
    let payload;

    switch (section) {
        case 'hero':
            payload = {
                hero: {
                    name: document.getElementById('heroName').value,
                    title: document.getElementById('heroTitleInput').value,
                    tagline: document.getElementById('heroTagline').value,
                    quote: document.getElementById('heroQuote').value,
                    profileImage: profileData.hero?.profileImage || '/images/profile.jpg'
                }
            };
            // Handle profile image upload
            const profileFile = document.getElementById('profileImageInput').files[0];
            if (profileFile) {
                const fd = new FormData();
                fd.append('image', profileFile);
                fd.append('category', 'profile');
                fd.append('caption', 'Profile Picture');
                const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: fd });
                const uploadData = await uploadRes.json();
                if (uploadRes.ok) {
                    payload.hero.profileImage = uploadData.image.filename.startsWith('http') ? uploadData.image.filename : `/uploads/${uploadData.image.filename}`;
                }
            }
            break;

        case 'about':
            const paras = Array.from(document.querySelectorAll('.about-para')).map(t => t.value);
            payload = { about: { paragraphs: paras } };
            break;

        case 'experience':
            const expItems = document.querySelectorAll('#experienceList .list-item');
            payload = {
                experience: Array.from(expItems).map(item => ({
                    company: item.querySelector('.exp-company').value,
                    role: item.querySelector('.exp-role').value,
                    period: item.querySelector('.exp-period').value,
                    description: item.querySelector('.exp-desc').value,
                    highlights: item.querySelector('.exp-highlights').value.split('\n').filter(h => h.trim())
                }))
            };
            break;

        case 'education':
            payload = {
                education: {
                    degree: document.getElementById('eduDegree').value,
                    college: document.getElementById('eduCollege').value,
                    aggregate: document.getElementById('eduAggregate').value,
                    timeline: document.getElementById('eduTimeline').value
                }
            };
            break;

        case 'skills':
            const skillItems = document.querySelectorAll('#skillsCategories .list-item');
            const skills = {};
            skillItems.forEach(item => {
                const name = item.querySelector('.skill-cat-name').value.trim();
                const items = item.querySelector('.skill-cat-items').value.split(',').map(s => s.trim()).filter(Boolean);
                if (name) skills[name] = items;
            });
            payload = { skills };
            break;

        case 'certifications':
            const certItems = document.querySelectorAll('#certificationsList .list-item');
            payload = {
                certifications: Array.from(certItems).map(item => ({
                    name: item.querySelector('.cert-name').value,
                    issuer: item.querySelector('.cert-issuer').value,
                    link: item.querySelector('.cert-link').value || null,
                    image: null
                }))
            };
            break;

        case 'awards':
            const awardItems = document.querySelectorAll('#awardsList .list-item');
            payload = {
                awards: Array.from(awardItems).map(item => ({
                    name: item.querySelector('.award-name').value,
                    issuer: item.querySelector('.award-issuer').value,
                    image: null
                }))
            };
            break;

        case 'projects':
            const projItems = document.querySelectorAll('#projectsList .list-item');
            payload = {
                projects: Array.from(projItems).map(item => ({
                    name: item.querySelector('.proj-name').value,
                    period: item.querySelector('.proj-period').value,
                    description: item.querySelector('.proj-desc').value
                }))
            };
            break;

        case 'contact':
            payload = {
                contact: {
                    email: document.getElementById('contactEmail').value,
                    phone: document.getElementById('contactPhone').value,
                    location: document.getElementById('contactLocation').value,
                    linkedin: document.getElementById('contactLinkedin').value,
                    github: document.getElementById('contactGithub').value
                }
            };
            break;

        default:
            return;
    }

    try {
        const res = await fetch('/api/admin/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            toast(`${section.charAt(0).toUpperCase() + section.slice(1)} saved! (Note: You may need to hard refresh the public page to see changes)`, 'success');
            await loadProfile();
        } else {
            const d = await res.json();
            toast(d.error || 'Save failed', 'error');
        }
    } catch {
        toast('Save failed', 'error');
    }
}

// ==========================================
// THEME
// ==========================================
async function saveTheme() {
    const selected = document.querySelector('input[name="theme"]:checked');
    if (!selected) return toast('Select a theme', 'error');
    try {
        const res = await fetch('/api/admin/theme', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme: selected.value })
        });
        if (res.ok) {
            toast(`Theme changed to "${selected.value}"!`, 'success');
        } else {
            toast('Failed to change theme', 'error');
        }
    } catch {
        toast('Failed to change theme', 'error');
    }
}

// ==========================================
// PASSWORD
// ==========================================
async function changePassword() {
    // No-op, managed by Gmail
    toast('Manage your password via Google Account Settings', 'info');
}

// ==========================================
// TOAST
// ==========================================
function toast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';
        el.style.transition = 'all 0.3s';
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

// ==========================================
// UTILITIES
// ==========================================
function escHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escAttr(str) {
    if (!str) return '';
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
