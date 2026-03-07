/* ==========================================
   Portfolio App – Dynamic Content Renderer
   ========================================== */

(function () {
    'use strict';

    // ---- State ----
    let profileData = null;

    // ---- DOM Ready ----
    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        try {
            const res = await fetch('/api/profile');
            if (!res.ok) throw new Error('Failed to load profile');
            profileData = await res.json();
            applyTheme(profileData.theme || 'dark');
            renderAll();
            initNavigation();
            initScrollAnimations();
            initLightbox();
            document.getElementById('currentYear').textContent = new Date().getFullYear();
        } catch (err) {
            console.error('Error loading profile:', err);
            document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#fff;font-size:1.2rem;">Unable to load profile data. Please try again later.</div>';
        }
    }

    // ---- Theme ----
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    // ---- Render All Sections ----
    function renderAll() {
        renderHero();
        renderAbout();
        renderExperience();
        renderEducation();
        renderSkills();
        renderCertifications();
        renderAwards();
        renderProjects();
        renderGallery();
        renderContact();
        renderFooter();
    }

    // ---- Hero ----
    function renderHero() {
        const { hero } = profileData;
        if (!hero) return;
        document.getElementById('heroName').textContent = hero.name || '';
        document.getElementById('heroTitle').textContent = hero.title || '';
        document.getElementById('heroTagline').textContent = hero.tagline || '';
        if (hero.profileImage) {
            document.getElementById('profileImage').src = hero.profileImage;
        }
    }

    // ---- About ----
    function renderAbout() {
        const { about } = profileData;
        if (!about || !about.paragraphs) return;
        const container = document.getElementById('aboutContent');
        container.innerHTML = about.paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
    }

    // ---- Experience ----
    function renderExperience() {
        const { experience } = profileData;
        if (!experience || !experience.length) return;
        const container = document.getElementById('experienceTimeline');
        container.innerHTML = experience.map(exp => `
      <div class="timeline-item reveal">
        <div class="timeline-header">
          <div class="timeline-company">${escapeHtml(exp.company)}</div>
          <div class="timeline-role">${escapeHtml(exp.role)}</div>
          <div class="timeline-period">${escapeHtml(exp.period)}</div>
        </div>
        <p class="timeline-description">${escapeHtml(exp.description)}</p>
        ${exp.highlights && exp.highlights.length ? `
          <ul class="timeline-highlights">
            ${exp.highlights.map(h => `<li>${escapeHtml(h)}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('');
    }

    // ---- Education ----
    function renderEducation() {
        const { education } = profileData;
        if (!education) return;
        const container = document.getElementById('educationCard');
        container.innerHTML = `
      <div class="education-degree">${escapeHtml(education.degree)}</div>
      <div class="education-college">${escapeHtml(education.college)}</div>
      <div class="education-meta">
        <span>📅 ${escapeHtml(education.timeline)}</span>
        <span>📊 ${escapeHtml(education.aggregate)}</span>
      </div>
    `;
    }

    // ---- Skills ----
    function renderSkills() {
        const { skills } = profileData;
        if (!skills) return;
        const container = document.getElementById('skillsGrid');
        container.innerHTML = Object.entries(skills).map(([category, items]) => `
      <div class="skill-category reveal">
        <div class="skill-category-title">${escapeHtml(category)}</div>
        <div class="skill-tags">
          ${items.map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join('')}
        </div>
      </div>
    `).join('');
    }

    // ---- Certifications ----
    function renderCertifications() {
        const { certifications } = profileData;
        if (!certifications || !certifications.length) return;
        const container = document.getElementById('certificationsGrid');
        container.innerHTML = certifications.map(cert => `
      <div class="card reveal">
        ${cert.image ? `<img src="${cert.image}" alt="${escapeHtml(cert.name)}" class="card-image" data-lightbox>` : ''}
        <div class="card-icon">🎓</div>
        <div class="card-title">${escapeHtml(cert.name)}</div>
        <div class="card-subtitle">${escapeHtml(cert.issuer)}</div>
        ${cert.link ? `<a href="${cert.link}" target="_blank" rel="noopener" class="card-link">View Certificate →</a>` : ''}
      </div>
    `).join('');
    }

    // ---- Awards ----
    function renderAwards() {
        const { awards } = profileData;
        if (!awards || !awards.length) return;
        const container = document.getElementById('awardsGrid');
        container.innerHTML = awards.map(award => `
      <div class="card reveal">
        ${award.image ? `<img src="${award.image}" alt="${escapeHtml(award.name)}" class="card-image" data-lightbox>` : ''}
        <div class="card-icon">🏆</div>
        <div class="card-title">${escapeHtml(award.name)}</div>
        <div class="card-subtitle">${escapeHtml(award.issuer)}</div>
      </div>
    `).join('');
    }

    // ---- Projects ----
    function renderProjects() {
        const { projects } = profileData;
        if (!projects || !projects.length) return;
        const container = document.getElementById('projectsGrid');
        container.innerHTML = projects.map(proj => `
      <div class="project-card reveal">
        <div class="project-name">${escapeHtml(proj.name)}</div>
        <div class="project-period">${escapeHtml(proj.period)}</div>
        <p class="project-description">${escapeHtml(proj.description)}</p>
      </div>
    `).join('');
    }

    // ---- Gallery ----
    function renderGallery() {
        const { gallery } = profileData;
        const section = document.getElementById('gallery');
        if (!gallery || !gallery.length) {
            section.style.display = 'none';
            return;
        }
        section.style.display = '';
        const container = document.getElementById('galleryGrid');
        container.innerHTML = gallery.map(item => `
      <div class="gallery-item" data-lightbox data-src="${item.filename.startsWith('http') ? item.filename : '/uploads/' + item.filename}" data-caption="${escapeHtml(item.caption || item.originalName || '')}">
        <img src="${item.filename.startsWith('http') ? item.filename : '/uploads/' + item.filename}" alt="${escapeHtml(item.caption || '')}">
        ${item.caption ? `<div class="gallery-caption">${escapeHtml(item.caption)}</div>` : ''}
      </div>
    `).join('');
    }

    // ---- Contact ----
    function renderContact() {
        const { contact } = profileData;
        if (!contact) return;
        const container = document.getElementById('contactContent');
        container.innerHTML = `
      <div class="contact-info">
        <div class="contact-item">
          <span class="contact-icon">📧</span>
          <span class="contact-label">Email</span>
          <span class="contact-value"><a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a></span>
        </div>
        ${contact.phone ? `
        <div class="contact-item">
          <span class="contact-icon">📱</span>
          <span class="contact-label">Phone</span>
          <span class="contact-value"><a href="tel:${escapeHtml(contact.phone)}">${escapeHtml(contact.phone)}</a></span>
        </div>
        ` : ''}
        <div class="contact-item">
          <span class="contact-icon">📍</span>
          <span class="contact-label">Location</span>
          <span class="contact-value">${escapeHtml(contact.location)}</span>
        </div>
      </div>
      <div class="social-links">
        ${contact.linkedin ? `
        <a href="${contact.linkedin}" target="_blank" rel="noopener" class="social-link" title="LinkedIn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.454C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>
        </a>
        ` : ''}
        ${contact.github ? `
        <a href="${contact.github}" target="_blank" rel="noopener" class="social-link" title="GitHub">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
        </a>
        ` : ''}
        <a href="mailto:${escapeHtml(contact.email)}" class="social-link" title="Email">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </a>
      </div>
    `;
    }

    // ---- Footer ----
    function renderFooter() {
        const { hero } = profileData;
        if (hero && hero.quote) {
            document.getElementById('footerQuote').textContent = `"${hero.quote}"`;
        }
    }

    // ---- Navigation ----
    function initNavigation() {
        const navbar = document.getElementById('navbar');
        const navToggle = document.getElementById('navToggle');
        const navLinks = document.getElementById('navLinks');
        const links = navLinks.querySelectorAll('.nav-link');

        // Hamburger toggle
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Close on link click
        links.forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });

        // Scroll events
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.scrollY;
            navbar.classList.toggle('scrolled', currentScroll > 50);
            lastScroll = currentScroll;
            updateActiveNav();
        });

        // Active nav link highlighting
        function updateActiveNav() {
            const sections = document.querySelectorAll('.section');
            const scrollPos = window.scrollY + 100;

            sections.forEach(section => {
                const top = section.offsetTop;
                const height = section.offsetHeight;
                const id = section.getAttribute('id');

                if (scrollPos >= top && scrollPos < top + height) {
                    links.forEach(link => {
                        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                    });
                }
            });
        }
    }

    // ---- Scroll Animations ----
    function initScrollAnimations() {
        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('active');
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
        );

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }

    // ---- Lightbox ----
    function initLightbox() {
        const lightbox = document.getElementById('lightbox');
        const lightboxImage = document.getElementById('lightboxImage');
        const lightboxCaption = document.getElementById('lightboxCaption');
        const lightboxClose = document.getElementById('lightboxClose');

        document.addEventListener('click', e => {
            const target = e.target.closest('[data-lightbox]');
            if (target) {
                const src = target.getAttribute('data-src') || target.src || target.querySelector('img')?.src;
                const caption = target.getAttribute('data-caption') || target.alt || '';
                if (src) {
                    lightboxImage.src = src;
                    lightboxCaption.textContent = caption;
                    lightbox.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            }
        });

        function closeLightbox() {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        }

        lightboxClose.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', e => {
            if (e.target === lightbox) closeLightbox();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeLightbox();
        });
    }

    // ---- Utilities ----
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
})();
