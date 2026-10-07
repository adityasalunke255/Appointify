/**
 * ═══════════════════════════════════════════════════════════
 * APPOINTIFY — Online Appointment Scheduling System
 * Single Page Application (Vanilla JS)
 * ═══════════════════════════════════════════════════════════
 */

// ─── API Helper ────────────────────────────────────────────
const API_BASE = '/api';

class Api {
  static token = localStorage.getItem('appointify_token');
  static user = JSON.parse(localStorage.getItem('appointify_user') || 'null');

  static headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  static async get(url) {
    const res = await fetch(`${API_BASE}${url}`, { headers: this.headers() });
    if (!res.ok) throw await res.json();
    return res.json();
  }

  static async post(url, data) {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST', headers: this.headers(), body: JSON.stringify(data)
    });
    if (!res.ok) throw await res.json();
    return res.json();
  }

  static async put(url, data) {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'PUT', headers: this.headers(), body: JSON.stringify(data)
    });
    if (!res.ok) throw await res.json();
    return res.json();
  }

  static async delete(url) {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'DELETE', headers: this.headers()
    });
    if (!res.ok) throw await res.json();
    return res.json();
  }

  static setAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('appointify_token', token);
    localStorage.setItem('appointify_user', JSON.stringify(user));
  }

  static logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('appointify_token');
    localStorage.removeItem('appointify_user');
  }

  static isLoggedIn() {
    return !!this.token;
  }
}

// ─── Toast Notifications ───────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('exiting');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── Router ────────────────────────────────────────────────
const routes = {};
let currentRoute = '';

function route(path, handler) {
  routes[path] = handler;
}

function navigate(path) {
  window.history.pushState({}, '', path);
  handleRoute();
}

function handleRoute() {
  const path = window.location.pathname;
  currentRoute = path;

  // Find matching route
  const handler = routes[path] || routes['/'];
  if (handler) {
    handler();
    updateNavLinks();
  }
}

function updateNavLinks() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-route') === currentRoute);
  });
}

// ─── Utility Functions ─────────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr) {
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function getDateParts(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    day: d.getDate(),
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' })
  };
}

function getCategoryBadgeClass(category) {
  return `badge-${(category || '').toLowerCase()}`;
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Render Navbar ─────────────────────────────────────────
function renderNavbar() {
  const isLoggedIn = Api.isLoggedIn();
  const user = Api.user;
  const isProvider = user?.role === 'provider';

  return `
    <nav class="navbar" id="navbar">
      <div class="navbar-inner">
        <a href="/" class="navbar-brand" onclick="event.preventDefault(); navigate('/');">
          <span class="brand-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>
          Appointify
        </a>

        <ul class="navbar-nav" id="nav-links">
          <li><a href="/" class="nav-link" data-route="/" onclick="event.preventDefault(); navigate('/');">Home</a></li>
          <li><a href="/providers" class="nav-link" data-route="/providers" onclick="event.preventDefault(); navigate('/providers');">Providers</a></li>
          ${isLoggedIn ? `
            <li><a href="/dashboard" class="nav-link" data-route="/dashboard" onclick="event.preventDefault(); navigate('/dashboard');">Dashboard</a></li>
            ${isProvider ? `<li><a href="/manage" class="nav-link" data-route="/manage" onclick="event.preventDefault(); navigate('/manage');">Manage</a></li>` : ''}
          ` : ''}
        </ul>

        <div class="navbar-actions">
          ${isLoggedIn ? `
            <div class="navbar-user" onclick="toggleUserMenu()">
              <div class="user-avatar">${getInitials(user.name)}</div>
              <span class="user-name">${user.name.split(' ')[0]}</span>
            </div>
            <div id="user-menu" class="hidden" style="position:absolute;top:64px;right:24px;background:var(--bg-card);border:1px solid var(--border-light);border-radius:var(--radius-lg);box-shadow:var(--shadow-xl);padding:8px;min-width:180px;z-index:1001;">
              <div style="padding:10px 12px;border-bottom:1px solid var(--border-light);margin-bottom:4px;">
                <div style="font-weight:600;font-size:0.85rem;">${user.name}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">${user.email}</div>
                <div style="margin-top:4px;"><span class="status-badge status-confirmed" style="font-size:0.65rem;">${user.role}</span></div>
              </div>
              <button class="btn btn-ghost w-full" style="justify-content:flex-start;padding:8px 12px;font-size:0.82rem;" onclick="navigate('/dashboard')">📊 Dashboard</button>
              <button class="btn btn-ghost w-full" style="justify-content:flex-start;padding:8px 12px;font-size:0.82rem;color:var(--danger-500);" onclick="logout()">🚪 Sign Out</button>
            </div>
          ` : `
            <button class="btn btn-secondary btn-sm" onclick="navigate('/login')">Sign In</button>
            <button class="btn btn-primary btn-sm" onclick="navigate('/register')">Get Started</button>
          `}
          <button class="menu-toggle" onclick="toggleMobileNav()">☰</button>
        </div>
      </div>
    </nav>
  `;
}

function toggleUserMenu() {
  const menu = document.getElementById('user-menu');
  if (menu) menu.classList.toggle('hidden');
}

function toggleMobileNav() {
  const nav = document.getElementById('nav-links');
  if (nav) nav.classList.toggle('mobile-open');
}

// Close user menu on outside click
document.addEventListener('click', (e) => {
  const menu = document.getElementById('user-menu');
  if (menu && !e.target.closest('.navbar-user') && !e.target.closest('#user-menu')) {
    menu.classList.add('hidden');
  }
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  }
});

// ─── Logout ────────────────────────────────────────────────
function logout() {
  Api.logout();
  navigate('/');
  showToast('Signed out successfully');
}

// ═══════════════════════════════════════════════════════════
// PAGE: HOME
// ═══════════════════════════════════════════════════════════
route('/', async () => {
  const app = document.getElementById('app');
  app.innerHTML = renderNavbar() + `
    <section class="hero">
      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          Smart Scheduling Platform
        </div>
        <h1>Book Appointments<br><span class="text-gradient">Effortlessly</span></h1>
        <p>Find and book appointments with top-rated doctors, tutors, consultants, and salons. Simple scheduling, zero hassle.</p>
        <div class="hero-actions">
          <button class="btn btn-primary btn-lg" onclick="navigate('/providers')">
            🔍 Browse Providers
          </button>
          ${!Api.isLoggedIn() ? `
            <button class="btn btn-secondary btn-lg" onclick="navigate('/register')">
              Create Account
            </button>
          ` : ''}
        </div>
        <div class="hero-stats">
          <div class="hero-stat">
            <div class="stat-value">500+</div>
            <div class="stat-label">Service Providers</div>
          </div>
          <div class="hero-stat">
            <div class="stat-value">10K+</div>
            <div class="stat-label">Appointments Booked</div>
          </div>
          <div class="hero-stat">
            <div class="stat-value">4.8★</div>
            <div class="stat-label">Average Rating</div>
          </div>
        </div>
      </div>
    </section>

    <section class="categories-section" id="categories-section">
      <div class="section-header">
        <div>
          <h2 class="section-title">Browse by Category</h2>
          <p class="section-subtitle">Find the right professional for your needs</p>
        </div>
      </div>
      <div class="category-grid">
        <div class="category-card active" onclick="filterByCategory('all')">
          <div class="category-icon all">🌐</div>
          <span class="category-name">All</span>
        </div>
        <div class="category-card" onclick="filterByCategory('Doctor')">
          <div class="category-icon doctor">🩺</div>
          <span class="category-name">Doctors</span>
        </div>
        <div class="category-card" onclick="filterByCategory('Tutor')">
          <div class="category-icon tutor">📚</div>
          <span class="category-name">Tutors</span>
        </div>
        <div class="category-card" onclick="filterByCategory('Consultant')">
          <div class="category-icon consultant">💼</div>
          <span class="category-name">Consultants</span>
        </div>
        <div class="category-card" onclick="filterByCategory('Salon')">
          <div class="category-icon salon">💇</div>
          <span class="category-name">Salons & Spa</span>
        </div>
      </div>
    </section>

    <section class="providers-section" id="providers-section">
      <div class="section-header">
        <div>
          <h2 class="section-title">Top Providers</h2>
          <p class="section-subtitle">Highly rated professionals ready to serve you</p>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="navigate('/providers')">View All →</button>
      </div>
      <div class="provider-grid" id="home-providers-grid">
        <div class="loading"><div class="spinner"></div></div>
      </div>
    </section>

    <footer class="footer">
      <p>© 2024 <span class="footer-brand">Appointify</span> — Smart Scheduling Made Simple</p>
    </footer>
  `;

  loadHomeProviders();
});

async function loadHomeProviders(category = 'all') {
  try {
    const url = category === 'all' ? '/providers?sort=rating' : `/providers?category=${category}&sort=rating`;
    const providers = await Api.get(url);
    renderProviderGrid('home-providers-grid', providers.slice(0, 6));
  } catch (err) {
    document.getElementById('home-providers-grid').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">😕</div>
        <h3>Unable to load providers</h3>
        <p>Please check your connection and try again</p>
      </div>
    `;
  }
}

function filterByCategory(category) {
  // Update active state
  document.querySelectorAll('.category-card').forEach(card => card.classList.remove('active'));
  event.currentTarget.classList.add('active');
  loadHomeProviders(category);
}

// ═══════════════════════════════════════════════════════════
// PAGE: PROVIDERS
// ═══════════════════════════════════════════════════════════
route('/providers', async () => {
  const app = document.getElementById('app');
  app.innerHTML = renderNavbar() + `
    <div class="dashboard" style="padding-top:100px;">
      <div class="dashboard-header">
        <h1 class="dashboard-greeting">Service Providers</h1>
        <p class="dashboard-subtitle">Find and book the perfect professional for your needs</p>
      </div>

      <div class="search-bar">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" id="search-input" placeholder="Search by name, specialty, or category..." oninput="searchProviders()">
        </div>
        <select class="form-select" id="category-filter" style="max-width:180px;" onchange="searchProviders()">
          <option value="all">All Categories</option>
          <option value="Doctor">🩺 Doctors</option>
          <option value="Tutor">📚 Tutors</option>
          <option value="Consultant">💼 Consultants</option>
          <option value="Salon">💇 Salons & Spa</option>
        </select>
        <select class="form-select" id="sort-filter" style="max-width:170px;" onchange="searchProviders()">
          <option value="rating">⭐ Top Rated</option>
          <option value="price-low">💰 Price: Low-High</option>
          <option value="price-high">💰 Price: High-Low</option>
        </select>
      </div>

      <div class="provider-grid" id="providers-grid">
        <div class="loading"><div class="spinner"></div></div>
      </div>
    </div>
  `;

  searchProviders();
});

const searchProviders = debounce(async () => {
  const search = document.getElementById('search-input')?.value || '';
  const category = document.getElementById('category-filter')?.value || 'all';
  const sort = document.getElementById('sort-filter')?.value || 'rating';

  try {
    const params = new URLSearchParams({ sort });
    if (category !== 'all') params.set('category', category);
    if (search) params.set('search', search);

    const providers = await Api.get(`/providers?${params}`);
    renderProviderGrid('providers-grid', providers);
  } catch (err) {
    document.getElementById('providers-grid').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">🔍</div>
        <h3>No providers found</h3>
        <p>Try adjusting your search or filters</p>
      </div>
    `;
  }
}, 300);

function renderProviderGrid(containerId, providers) {
  const container = document.getElementById(containerId);
  if (!providers.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">🏥</div>
        <h3>No providers found</h3>
        <p>Try different search criteria or check back later</p>
      </div>
    `;
    return;
  }

  container.innerHTML = providers.map((p, i) => `
    <div class="provider-card animate-in" style="animation-delay:${i * 0.05}s" onclick="openBooking('${p.id}')">
      <div class="provider-card-header">
        <img src="${p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=6366f1&color=fff&size=128`}" 
             alt="${p.name}" class="provider-avatar" 
             onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=6366f1&color=fff&size=128'">
        <div class="provider-info">
          <div class="provider-name">${p.name}</div>
          <div class="provider-specialty">${p.specialization || p.category}</div>
          <span class="provider-category-badge ${getCategoryBadgeClass(p.category)}">${p.category}</span>
        </div>
      </div>
      <div class="provider-card-body">
        <p class="provider-bio">${p.bio || 'Professional service provider'}</p>
        <div class="provider-meta">
          <div class="provider-rating">
            ⭐ <span class="rating-value">${p.rating || '0.0'}</span>
            <span class="rating-count">(${p.total_reviews || 0})</span>
          </div>
          <div class="provider-meta-item">
            <span class="icon">📍</span> ${p.location || 'Location TBD'}
          </div>
          <div class="provider-meta-item">
            <span class="icon">⏱️</span> ${p.duration || 30} min
          </div>
        </div>
      </div>
      <div class="provider-card-footer">
        <div class="provider-price">$${p.price || 0}<span class="price-unit"> / session</span></div>
        <button class="btn btn-primary btn-sm">Book Now</button>
      </div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════════════
// BOOKING FLOW
// ═══════════════════════════════════════════════════════════
let bookingState = {
  provider: null,
  selectedDate: null,
  selectedSlot: null,
  availableDates: [],
  slots: [],
  calendarMonth: new Date().getMonth(),
  calendarYear: new Date().getFullYear()
};

async function openBooking(providerId) {
  if (!Api.isLoggedIn()) {
    showToast('Please sign in to book an appointment', 'warning');
    navigate('/login');
    return;
  }

  try {
    const provider = await Api.get(`/providers/${providerId}`);
    bookingState.provider = provider;
    bookingState.selectedDate = null;
    bookingState.selectedSlot = null;
    bookingState.calendarMonth = new Date().getMonth();
    bookingState.calendarYear = new Date().getFullYear();

    // Load available dates
    await loadAvailableDates();

    renderBookingModal();
    document.getElementById('booking-modal').classList.add('active');
  } catch (err) {
    showToast('Failed to load provider details', 'error');
  }
}

async function loadAvailableDates() {
  try {
    const { calendarMonth, calendarYear, provider } = bookingState;
    const dates = await Api.get(
      `/slots/provider/${provider.id}/dates?month=${calendarMonth + 1}&year=${calendarYear}`
    );
    bookingState.availableDates = dates;
  } catch (err) {
    bookingState.availableDates = [];
  }
}

async function loadSlots(date) {
  try {
    const slots = await Api.get(`/slots/provider/${bookingState.provider.id}?date=${date}`);
    bookingState.slots = slots;
    bookingState.selectedDate = date;
    bookingState.selectedSlot = null;
    renderBookingModal();
  } catch (err) {
    showToast('Failed to load time slots', 'error');
  }
}

function renderBookingModal() {
  const { provider, selectedDate, selectedSlot, slots, calendarMonth, calendarYear, availableDates } = bookingState;
  const modal = document.getElementById('modal-content');

  // Build calendar
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const availDateSet = new Set(availableDates.filter(d => d.available_count > 0).map(d => d.date));

  let calendarDays = '';
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    calendarDays += '<div class="calendar-day empty"></div>';
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(calendarYear, calendarMonth, d);
    const isPast = dateObj < today;
    const isToday = dateObj.getTime() === today.getTime();
    const isSelected = dateStr === selectedDate;
    const hasSlots = availDateSet.has(dateStr);

    const classes = [
      'calendar-day',
      isPast ? 'disabled' : '',
      isToday ? 'today' : '',
      isSelected ? 'selected' : '',
      hasSlots ? 'has-slots' : ''
    ].filter(Boolean).join(' ');

    calendarDays += `<div class="${classes}" onclick="${!isPast ? `loadSlots('${dateStr}')` : ''}">${d}</div>`;
  }

  // Time slots HTML
  let slotsHTML = '';
  if (selectedDate && slots.length > 0) {
    slotsHTML = `
      <div class="time-slots-container">
        <div class="time-slots-title">Available Times for ${formatDate(selectedDate)}</div>
        <div class="time-slots-grid">
          ${slots.map(s => `
            <div class="time-slot ${!s.is_available ? 'booked' : ''} ${selectedSlot?.id === s.id ? 'selected' : ''}"
                 onclick="${s.is_available ? `selectSlot('${s.id}', '${s.start_time}', '${s.end_time}')` : ''}">
              ${formatTime(s.start_time)}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (selectedDate) {
    slotsHTML = `
      <div class="empty-state" style="padding:30px;">
        <div class="empty-icon">📭</div>
        <h3>No slots available</h3>
        <p>Try selecting a different date</p>
      </div>
    `;
  }

  // Booking summary
  let summaryHTML = '';
  if (selectedSlot) {
    summaryHTML = `
      <div class="booking-summary">
        <h4>📋 Booking Summary</h4>
        <div class="summary-row">
          <span class="summary-label">Provider</span>
          <span class="summary-value">${provider.name}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Service</span>
          <span class="summary-value">${provider.specialization || provider.category}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Date</span>
          <span class="summary-value">${formatDate(selectedDate)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Time</span>
          <span class="summary-value">${formatTime(selectedSlot.start_time)} – ${formatTime(selectedSlot.end_time)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Duration</span>
          <span class="summary-value">${provider.duration || 30} minutes</span>
        </div>
        <div class="summary-row" style="border-top:1px solid var(--primary-200);padding-top:10px;margin-top:6px;">
          <span class="summary-label" style="font-weight:600;">Total</span>
          <span class="summary-value" style="font-size:1.1rem;color:var(--primary-600);">$${provider.price || 0}</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes (optional)</label>
        <textarea id="booking-notes" class="form-input" rows="2" placeholder="Any special requests or notes..." style="resize:vertical;"></textarea>
      </div>
      <button class="btn btn-primary btn-lg w-full" onclick="confirmBooking()">
        ✓ Confirm Booking
      </button>
    `;
  }

  modal.innerHTML = `
    <div class="modal-header">
      <div>
        <h2>Book Appointment</h2>
        <p style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">with ${provider.name} — ${provider.specialization || provider.category}</p>
      </div>
      <button class="modal-close" onclick="closeBookingModal()">✕</button>
    </div>
    <div class="modal-body">
      <!-- Provider info -->
      <div style="display:flex;align-items:center;gap:14px;padding:16px;background:var(--gray-50);border-radius:var(--radius-lg);margin-bottom:20px;">
        <img src="${provider.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.name)}&background=6366f1&color=fff&size=128`}" 
             style="width:56px;height:56px;border-radius:var(--radius-md);object-fit:cover;"
             onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(provider.name)}&background=6366f1&color=fff&size=128'">
        <div>
          <div style="font-weight:700;font-size:1rem;">${provider.name}</div>
          <div style="font-size:0.82rem;color:var(--text-secondary);">${provider.specialization} • ${provider.location}</div>
          <div style="font-size:0.82rem;margin-top:2px;">⭐ ${provider.rating} (${provider.total_reviews} reviews) • $${provider.price}/session</div>
        </div>
      </div>

      <!-- Calendar -->
      <div class="calendar-container">
        <div class="calendar-header">
          <span class="calendar-title">${monthNames[calendarMonth]} ${calendarYear}</span>
          <div class="calendar-nav">
            <button class="btn btn-ghost btn-icon btn-sm" onclick="changeCalendarMonth(-1)">◀</button>
            <button class="btn btn-ghost btn-icon btn-sm" onclick="changeCalendarMonth(1)">▶</button>
          </div>
        </div>
        <div class="calendar-grid">
          ${dayNames.map(d => `<div class="calendar-day-header">${d}</div>`).join('')}
          ${calendarDays}
        </div>
      </div>

      ${slotsHTML}
      ${summaryHTML}
    </div>
  `;
}

function selectSlot(id, startTime, endTime) {
  bookingState.selectedSlot = { id, start_time: startTime, end_time: endTime };
  renderBookingModal();
}

async function changeCalendarMonth(delta) {
  bookingState.calendarMonth += delta;
  if (bookingState.calendarMonth > 11) {
    bookingState.calendarMonth = 0;
    bookingState.calendarYear++;
  } else if (bookingState.calendarMonth < 0) {
    bookingState.calendarMonth = 11;
    bookingState.calendarYear--;
  }
  await loadAvailableDates();
  renderBookingModal();
}

async function confirmBooking() {
  const { provider, selectedSlot } = bookingState;
  const notes = document.getElementById('booking-notes')?.value || '';

  try {
    const res = await Api.post('/appointments', {
      provider_id: provider.id,
      slot_id: selectedSlot.id,
      notes
    });

    closeBookingModal();
    showToast('Appointment booked! Connecting to AI Assistant... 🎙️', 'success');

    // Trigger Vapi Web Call
    try {
      if (!window.Vapi) {
        showToast("Error: Vapi module failed to load", "error");
      } else {
        if (!window.vapiInstance) {
          const VapiClass = window.Vapi.default || window.Vapi;
          window.vapiInstance = new VapiClass("268f768c-b518-439c-a439-355156ea347e");
          
          window.vapiInstance.on('error', (e) => {
            console.error(e);
            showToast('Vapi Error: ' + (e.message || JSON.stringify(e)), 'error');
          });
          window.vapiInstance.on('call-start', () => {
            showToast('Microphone active. AI is speaking...', 'success');
            if (!document.getElementById('ai-active-orb')) {
              const orb = document.createElement('div');
              orb.id = 'ai-active-orb';
              orb.className = 'ai-overlay';
              orb.innerHTML = '<div class="ai-orb"></div><div class="ai-text">AI Assistant is listening...</div>';
              document.body.appendChild(orb);
            }
          });
          window.vapiInstance.on('call-end', () => {
            const orb = document.getElementById('ai-active-orb');
            if (orb) orb.remove();
            showToast('Call ended. Refreshing dashboard...', 'info');
          });
        }
        
        showToast("Initializing microphone... Please allow access.", "info");

        window.vapiInstance.start({
          model: {
            provider: "openai",
            model: "gpt-3.5-turbo",
            messages: [{
              role: "system",
              content: `You are an automated assistant for Appointify calling on behalf of a ${provider.category}. User: ${Api.user.name}.
RULES:
1. Ask if they want to confirm their appointment.
2. If yes, ask EXACTLY ONE short question related to their ${provider.category} appointment.
3. After they answer, thank them and IMMEDIATELY use the endCall function to hang up. DO NOT ask any follow-up questions.`
            }]
          },
          voice: {
            provider: "11labs",
            voiceId: "bIHbv24MWmeRgasZH58o" // Generic Voice
          },
          endCallFunctionEnabled: true,
          analysisPlan: {
            summaryPrompt: "Generate a brief, professional summary of the call. State clearly if the appointment is CONFIRMED or CANCELLED, and summarize their answer to the specific question in one sentence."
          },
          serverUrl: "https://zippy-moonlit-fence.ngrok-free.dev/api/appointments/webhook/vapi?appointmentId=" + res.appointment.id
        });
      }
    } catch(err) {
      console.error("Vapi start error", err);
      showToast("Vapi Exception: " + err.message, "error");
    }

    // Refresh current page
    if (currentRoute === '/dashboard') {
      navigate('/dashboard');
    }
  } catch (err) {
    showToast(err.error || 'Failed to book appointment', 'error');
  }
}

function closeBookingModal() {
  document.getElementById('booking-modal').classList.remove('active');
}

// Close modal on overlay click
document.getElementById('booking-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeBookingModal();
});

// ═══════════════════════════════════════════════════════════
// PAGE: LOGIN
// ═══════════════════════════════════════════════════════════
route('/login', () => {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <a href="/" class="auth-logo" onclick="event.preventDefault(); navigate('/');">
            <span class="brand-icon" style="width:32px;height:32px;background:linear-gradient(135deg,var(--primary-500),var(--primary-700));border-radius:8px;display:inline-flex;align-items:center;justify-content:center;color:white;font-size:1rem;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>
            Appointify
          </a>
          <h2>Welcome back</h2>
          <p>Sign in to manage your appointments</p>
        </div>
        <form class="auth-form" onsubmit="handleLogin(event)">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" id="login-email" class="form-input" placeholder="you@example.com" required>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="login-password" class="form-input" placeholder="Enter your password" required>
          </div>
          <button type="submit" class="btn btn-primary btn-lg" id="login-btn">Sign In</button>
        </form>
        <div class="auth-footer">
          Don't have an account? <a href="/register" onclick="event.preventDefault(); navigate('/register');">Create one</a>
        </div>
        <div style="margin-top:20px;padding:16px;background:var(--primary-50);border-radius:var(--radius-md);font-size:0.78rem;color:var(--text-secondary);">
          <strong>Demo accounts</strong> (password: password123)<br>
          👤 User: john@example.com<br>
          🩺 Provider: emily@example.com
        </div>
      </div>
    </div>
  `;
});

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  btn.textContent = 'Signing in...';
  btn.disabled = true;

  try {
    const data = await Api.post('/auth/login', {
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value
    });
    Api.setAuth(data.token, data.user);
    showToast(`Welcome back, ${data.user.name}! 👋`);
    navigate('/dashboard');
  } catch (err) {
    showToast(err.error || 'Login failed', 'error');
    btn.textContent = 'Sign In';
    btn.disabled = false;
  }
}

// ═══════════════════════════════════════════════════════════
// PAGE: REGISTER
// ═══════════════════════════════════════════════════════════
route('/register', () => {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <a href="/" class="auth-logo" onclick="event.preventDefault(); navigate('/');">
            <span class="brand-icon" style="width:32px;height:32px;background:linear-gradient(135deg,var(--primary-500),var(--primary-700));border-radius:8px;display:inline-flex;align-items:center;justify-content:center;color:white;font-size:1rem;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>
            Appointify
          </a>
          <h2>Create your account</h2>
          <p>Start booking appointments in minutes</p>
        </div>
        <form class="auth-form" onsubmit="handleRegister(event)">
          <div class="role-selector">
            <div class="role-option active" id="role-user" onclick="selectRole('user')">
              <div class="role-icon">👤</div>
              <div class="role-name">Client</div>
              <div class="role-desc">Book appointments</div>
            </div>
            <div class="role-option" id="role-provider" onclick="selectRole('provider')">
              <div class="role-icon">🏥</div>
              <div class="role-name">Provider</div>
              <div class="role-desc">Offer services</div>
            </div>
          </div>
          <input type="hidden" id="register-role" value="user">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" id="register-name" class="form-input" placeholder="John Doe" required>
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" id="register-email" class="form-input" placeholder="you@example.com" required>
          </div>
          <div class="form-group">
            <label class="form-label">Phone (optional)</label>
            <input type="tel" id="register-phone" class="form-input" placeholder="+1-555-0100">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="register-password" class="form-input" placeholder="Min 6 characters" required minlength="6">
          </div>
          <button type="submit" class="btn btn-primary btn-lg" id="register-btn">Create Account</button>
        </form>
        <div class="auth-footer">
          Already have an account? <a href="/login" onclick="event.preventDefault(); navigate('/login');">Sign in</a>
        </div>
      </div>
    </div>
  `;
});

function selectRole(role) {
  document.getElementById('register-role').value = role;
  document.getElementById('role-user').classList.toggle('active', role === 'user');
  document.getElementById('role-provider').classList.toggle('active', role === 'provider');
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('register-btn');
  btn.textContent = 'Creating account...';
  btn.disabled = true;

  try {
    const data = await Api.post('/auth/register', {
      name: document.getElementById('register-name').value,
      email: document.getElementById('register-email').value,
      password: document.getElementById('register-password').value,
      phone: document.getElementById('register-phone').value,
      role: document.getElementById('register-role').value
    });
    Api.setAuth(data.token, data.user);
    showToast('Account created successfully! 🎉');

    if (data.user.role === 'provider') {
      navigate('/manage');
    } else {
      navigate('/dashboard');
    }
  } catch (err) {
    showToast(err.error || 'Registration failed', 'error');
    btn.textContent = 'Create Account';
    btn.disabled = false;
  }
}

// ═══════════════════════════════════════════════════════════
// PAGE: DASHBOARD (User & Provider)
// ═══════════════════════════════════════════════════════════
route('/dashboard', async () => {
  if (!Api.isLoggedIn()) {
    navigate('/login');
    return;
  }

  const app = document.getElementById('app');
  const user = Api.user;
  const isProvider = user.role === 'provider';

  app.innerHTML = renderNavbar() + `
    <div class="dashboard">
      <div class="dashboard-header">
        <h1 class="dashboard-greeting">Hello, ${user.name.split(' ')[0]} 👋</h1>
        <p class="dashboard-subtitle">${isProvider ? 'Manage your schedule and appointments' : 'Here\'s an overview of your appointments'}</p>
      </div>

      <div class="stats-grid" id="stats-grid">
        <div class="loading" style="grid-column:1/-1;"><div class="spinner"></div></div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h2 class="section-title">${isProvider ? 'Upcoming Appointments' : 'My Appointments'}</h2>
        ${!isProvider ? `<button class="btn btn-primary btn-sm" onclick="navigate('/providers')">+ Book New</button>` : ''}
      </div>

      <div class="tabs" id="appointment-tabs">
        <div class="tab active" onclick="filterAppointments('all')">All</div>
        <div class="tab" onclick="filterAppointments('confirmed')">Upcoming</div>
        <div class="tab" onclick="filterAppointments('completed')">Completed</div>
        <div class="tab" onclick="filterAppointments('cancelled')">Cancelled</div>
      </div>

      <div class="appointments-list" id="appointments-list">
        <div class="loading"><div class="spinner"></div></div>
      </div>
    </div>
  `;

  loadDashboardStats();
  loadAppointments('all');
});

async function loadDashboardStats() {
  try {
    const stats = await Api.get('/appointments/stats/overview');
    const isProvider = Api.user?.role === 'provider';

    document.getElementById('stats-grid').innerHTML = `
      <div class="stat-card animate-in">
        <div class="stat-icon primary">📊</div>
        <div class="stat-content">
          <div class="stat-value">${stats.total}</div>
          <div class="stat-label">Total Appointments</div>
        </div>
      </div>
      <div class="stat-card animate-in animate-in-delay-1">
        <div class="stat-icon success">✅</div>
        <div class="stat-content">
          <div class="stat-value">${stats.confirmed}</div>
          <div class="stat-label">Confirmed</div>
        </div>
      </div>
      <div class="stat-card animate-in animate-in-delay-2">
        <div class="stat-icon warning">🏆</div>
        <div class="stat-content">
          <div class="stat-value">${stats.completed}</div>
          <div class="stat-label">Completed</div>
        </div>
      </div>
      <div class="stat-card animate-in animate-in-delay-3">
        <div class="stat-icon danger">❌</div>
        <div class="stat-content">
          <div class="stat-value">${stats.cancelled}</div>
          <div class="stat-label">Cancelled</div>
        </div>
      </div>
    `;
  } catch (err) {
    document.getElementById('stats-grid').innerHTML = '';
  }
}

async function loadAppointments(status) {
  try {
    const user = Api.user;
    let appointments;

    if (user.role === 'provider' && user.provider) {
      appointments = await Api.get(`/providers/${user.provider.id}/appointments?status=${status}`);
    } else {
      appointments = await Api.get(`/appointments/my?status=${status}`);
    }

    renderAppointmentsList(appointments);
  } catch (err) {
    document.getElementById('appointments-list').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>No appointments found</h3>
        <p>Your appointments will appear here</p>
      </div>
    `;
  }
}

function filterAppointments(status) {
  document.querySelectorAll('#appointment-tabs .tab').forEach(tab => tab.classList.remove('active'));
  event.currentTarget.classList.add('active');
  loadAppointments(status);
}

function renderAppointmentsList(appointments) {
  const container = document.getElementById('appointments-list');
  const isProvider = Api.user?.role === 'provider';

  if (!appointments.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>No appointments yet</h3>
        <p>${isProvider ? 'Appointments from clients will show up here' : 'Browse providers and book your first appointment!'}</p>
        ${!isProvider ? `<button class="btn btn-primary btn-sm mt-4" onclick="navigate('/providers')">Browse Providers</button>` : ''}
      </div>
    `;
    return;
  }

  container.innerHTML = appointments.map((a, i) => {
    const dateParts = getDateParts(a.date);
    const displayName = isProvider ? (a.user_name || 'Client') : (a.provider_name || a.specialization || 'Provider');

    return `
      <div class="appointment-card animate-in" style="animation-delay:${i * 0.05}s">
        <div class="appointment-date-block">
          <div class="date-month">${dateParts.month}</div>
          <div class="date-day">${dateParts.day}</div>
          <div class="date-weekday">${dateParts.weekday}</div>
        </div>
        <div class="appointment-divider"></div>
        <div class="appointment-details">
          <div class="appointment-provider-name">${displayName}</div>
          <div class="appointment-time">
            ${formatTime(a.start_time)} – ${formatTime(a.end_time)}
            ${a.category ? ` • ${a.category}` : ''}
            ${a.location ? ` • 📍 ${a.location}` : ''}
          </div>
        </div>
        <span class="status-badge status-${a.status}">${a.status === 'confirmed' ? '● ' : ''}${a.status}</span>
        <div class="appointment-actions">
          ${a.status === 'confirmed' ? `
            ${isProvider ? `
              <button class="btn btn-success btn-sm" onclick="completeAppointment('${a.id}')">✓ Complete</button>
            ` : `
              <button class="btn btn-secondary btn-sm" onclick="rescheduleAppointment('${a.id}', '${a.provider_id}')">📅 Reschedule</button>
            `}
            <button class="btn btn-danger btn-sm" onclick="cancelAppointment('${a.id}')">Cancel</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function cancelAppointment(id) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;

  try {
    await Api.put(`/appointments/${id}/cancel`);
    showToast('Appointment cancelled');
    loadAppointments('all');
    loadDashboardStats();
  } catch (err) {
    showToast(err.error || 'Failed to cancel', 'error');
  }
}

async function completeAppointment(id) {
  try {
    await Api.put(`/appointments/${id}/complete`);
    showToast('Appointment marked as completed ✓');
    loadAppointments('all');
    loadDashboardStats();
  } catch (err) {
    showToast(err.error || 'Failed to complete', 'error');
  }
}

async function rescheduleAppointment(appointmentId, providerId) {
  // Open booking modal in reschedule mode
  bookingState.rescheduleId = appointmentId;
  await openBooking(providerId);
}

// ═══════════════════════════════════════════════════════════
// PAGE: PROVIDER MANAGEMENT
// ═══════════════════════════════════════════════════════════
route('/manage', async () => {
  if (!Api.isLoggedIn() || Api.user.role !== 'provider') {
    navigate('/login');
    return;
  }

  const app = document.getElementById('app');
  const user = Api.user;
  const hasProfile = !!user.provider;

  app.innerHTML = renderNavbar() + `
    <div class="dashboard">
      <div class="dashboard-header">
        <h1 class="dashboard-greeting">Provider Dashboard</h1>
        <p class="dashboard-subtitle">Manage your profile and schedule</p>
      </div>

      <div class="tabs">
        <div class="tab active" id="tab-profile" onclick="showManageTab('profile')">👤 Profile</div>
        <div class="tab" id="tab-schedule" onclick="showManageTab('schedule')">📅 Schedule</div>
        <div class="tab" id="tab-appointments" onclick="showManageTab('appointments')">📋 Appointments</div>
      </div>

      <div id="manage-content">
        <!-- Profile form -->
        <div id="manage-profile" class="provider-setup">
          <div class="card">
            <div class="card-body">
              <h3>${hasProfile ? 'Update Your Profile' : '🏥 Set Up Your Provider Profile'}</h3>
              <form onsubmit="saveProviderProfile(event)">
                <div class="form-group">
                  <label class="form-label">Category *</label>
                  <select id="profile-category" class="form-select" required>
                    <option value="">Select category...</option>
                    <option value="Doctor" ${user.provider?.category === 'Doctor' ? 'selected' : ''}>🩺 Doctor</option>
                    <option value="Tutor" ${user.provider?.category === 'Tutor' ? 'selected' : ''}>📚 Tutor</option>
                    <option value="Consultant" ${user.provider?.category === 'Consultant' ? 'selected' : ''}>💼 Consultant</option>
                    <option value="Salon" ${user.provider?.category === 'Salon' ? 'selected' : ''}>💇 Salon & Spa</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Specialization</label>
                  <input type="text" id="profile-spec" class="form-input" placeholder="e.g., Cardiologist, Math Tutor..." value="${user.provider?.specialization || ''}">
                </div>
                <div class="form-group">
                  <label class="form-label">Bio / Description</label>
                  <textarea id="profile-bio" class="form-input" rows="3" placeholder="Tell clients about yourself..." style="resize:vertical;">${user.provider?.bio || ''}</textarea>
                </div>
                <div class="form-group">
                  <label class="form-label">Location</label>
                  <input type="text" id="profile-location" class="form-input" placeholder="e.g., 123 Main St, Suite 100" value="${user.provider?.location || ''}">
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                  <div class="form-group">
                    <label class="form-label">Price per Session ($)</label>
                    <input type="number" id="profile-price" class="form-input" placeholder="50" min="0" value="${user.provider?.price || ''}">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Session Duration (min)</label>
                    <input type="number" id="profile-duration" class="form-input" placeholder="30" min="15" step="15" value="${user.provider?.duration || 30}">
                  </div>
                </div>
                <button type="submit" class="btn btn-primary btn-lg w-full mt-2">
                  ${hasProfile ? '💾 Update Profile' : '✓ Create Profile'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- Schedule manager -->
        <div id="manage-schedule" class="hidden">
          <div class="schedule-manager">
            <h3>📅 Generate Available Slots</h3>
            <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:20px;">
              Automatically create time slots for a date range. Clients will be able to book during these times.
            </p>
            <form onsubmit="generateSlots(event)">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div class="form-group">
                  <label class="form-label">Start Date</label>
                  <input type="date" id="slot-start-date" class="form-input" required>
                </div>
                <div class="form-group">
                  <label class="form-label">End Date</label>
                  <input type="date" id="slot-end-date" class="form-input" required>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div class="form-group">
                  <label class="form-label">Start Hour</label>
                  <select id="slot-start-hour" class="form-select">
                    ${Array.from({length: 14}, (_, i) => i + 6).map(h =>
                      `<option value="${h}" ${h === 9 ? 'selected' : ''}>${h}:00 ${h < 12 ? 'AM' : 'PM'}</option>`
                    ).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">End Hour</label>
                  <select id="slot-end-hour" class="form-select">
                    ${Array.from({length: 14}, (_, i) => i + 6).map(h =>
                      `<option value="${h}" ${h === 17 ? 'selected' : ''}>${h}:00 ${h < 12 ? 'AM' : 'PM'}</option>`
                    ).join('')}
                  </select>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div class="form-group">
                  <label class="form-label">Slot Duration (min)</label>
                  <select id="slot-duration" class="form-select">
                    <option value="15">15 minutes</option>
                    <option value="30" selected>30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Break Between (min)</label>
                  <select id="slot-break" class="form-select">
                    <option value="0">No break</option>
                    <option value="5">5 minutes</option>
                    <option value="10" selected>10 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                  </select>
                </div>
              </div>
              <button type="submit" class="btn btn-primary btn-lg w-full" id="generate-slots-btn">
                ⚡ Generate Slots
              </button>
            </form>
          </div>
        </div>

        <!-- Provider appointments -->
        <div id="manage-appointments" class="hidden">
          <div class="appointments-list" id="provider-appointments-list">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Set default dates
  const today = new Date();
  const twoWeeksLater = new Date(today);
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

  const startInput = document.getElementById('slot-start-date');
  const endInput = document.getElementById('slot-end-date');
  if (startInput) startInput.value = today.toISOString().split('T')[0];
  if (endInput) endInput.value = twoWeeksLater.toISOString().split('T')[0];
});

function showManageTab(tab) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');

  document.getElementById('manage-profile').classList.toggle('hidden', tab !== 'profile');
  document.getElementById('manage-schedule').classList.toggle('hidden', tab !== 'schedule');
  document.getElementById('manage-appointments').classList.toggle('hidden', tab !== 'appointments');

  if (tab === 'appointments') {
    loadProviderAppointments();
  }
}

async function saveProviderProfile(e) {
  e.preventDefault();
  try {
    const data = {
      category: document.getElementById('profile-category').value,
      specialization: document.getElementById('profile-spec').value,
      bio: document.getElementById('profile-bio').value,
      location: document.getElementById('profile-location').value,
      price: parseFloat(document.getElementById('profile-price').value) || 0,
      duration: parseInt(document.getElementById('profile-duration').value) || 30
    };

    const provider = await Api.post('/providers/profile', data);
    Api.user.provider = provider;
    localStorage.setItem('appointify_user', JSON.stringify(Api.user));
    showToast('Profile saved successfully! ✓');
  } catch (err) {
    showToast(err.error || 'Failed to save profile', 'error');
  }
}

async function generateSlots(e) {
  e.preventDefault();
  const btn = document.getElementById('generate-slots-btn');
  btn.textContent = 'Generating...';
  btn.disabled = true;

  try {
    const data = {
      start_date: document.getElementById('slot-start-date').value,
      end_date: document.getElementById('slot-end-date').value,
      start_hour: parseInt(document.getElementById('slot-start-hour').value),
      end_hour: parseInt(document.getElementById('slot-end-hour').value),
      duration: parseInt(document.getElementById('slot-duration').value),
      break_minutes: parseInt(document.getElementById('slot-break').value),
      exclude_days: [0] // Exclude Sundays
    };

    const result = await Api.post('/slots/generate', data);
    showToast(result.message + ' ⚡');
  } catch (err) {
    showToast(err.error || 'Failed to generate slots', 'error');
  }

  btn.textContent = '⚡ Generate Slots';
  btn.disabled = false;
}

async function loadProviderAppointments() {
  try {
    const user = Api.user;
    if (!user.provider) {
      document.getElementById('provider-appointments-list').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏥</div>
          <h3>Set up your profile first</h3>
          <p>Create your provider profile to start receiving appointments</p>
        </div>
      `;
      return;
    }

    const appointments = await Api.get(`/providers/${user.provider.id}/appointments?status=all`);
    const container = document.getElementById('provider-appointments-list');

    if (!appointments.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>No appointments yet</h3>
          <p>When clients book your services, appointments will appear here</p>
        </div>
      `;
      return;
    }

    container.innerHTML = appointments.map((a, i) => {
      const dateParts = getDateParts(a.date);
      return `
        <div class="appointment-card animate-in" style="animation-delay:${i * 0.05}s">
          <div class="appointment-date-block">
            <div class="date-month">${dateParts.month}</div>
            <div class="date-day">${dateParts.day}</div>
            <div class="date-weekday">${dateParts.weekday}</div>
          </div>
          <div class="appointment-divider"></div>
          <div class="appointment-details">
            <div class="appointment-provider-name">${a.user_name || 'Client'}</div>
            <div class="appointment-time">
              ${formatTime(a.start_time)} – ${formatTime(a.end_time)}
              ${a.user_email ? ` • 📧 ${a.user_email}` : ''}
              ${a.user_phone ? ` • 📱 ${a.user_phone}` : ''}
            </div>
            ${a.notes ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">📝 ${a.notes}</div>` : ''}
            ${a.ai_summary ? `
              <div style="font-size:0.8rem; background:var(--primary-50); border:1px solid var(--primary-100); padding:8px 12px; border-radius:var(--radius-sm); margin-top:10px; color:var(--primary-800);">
                <div style="font-weight:600; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                  🤖 AI Call Summary
                </div>
                ${a.ai_summary}
              </div>
            ` : ''}
          </div>
          <span class="status-badge status-${a.status}">${a.status}</span>
          <div class="appointment-actions">
            ${a.status === 'confirmed' ? `
              <button class="btn btn-success btn-sm" onclick="completeProviderAppointment('${a.id}')">✓ Complete</button>
              <button class="btn btn-danger btn-sm" onclick="cancelProviderAppointment('${a.id}')">Cancel</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    document.getElementById('provider-appointments-list').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😕</div>
        <h3>Failed to load appointments</h3>
        <p>Please try again later</p>
      </div>
    `;
  }
}

async function completeProviderAppointment(id) {
  try {
    await Api.put(`/appointments/${id}/complete`);
    showToast('Appointment completed ✓');
    loadProviderAppointments();
  } catch (err) {
    showToast(err.error || 'Failed', 'error');
  }
}

async function cancelProviderAppointment(id) {
  if (!confirm('Cancel this appointment?')) return;
  try {
    await Api.put(`/appointments/${id}/cancel`);
    showToast('Appointment cancelled');
    loadProviderAppointments();
  } catch (err) {
    showToast(err.error || 'Failed', 'error');
  }
}

// ─── Initialize App ────────────────────────────────────────
window.addEventListener('popstate', handleRoute);
handleRoute();
