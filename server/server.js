// Load environment variables first
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists (still used for potential local assets if needed)
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const authRoutes = require('./routes/auth');
const providerRoutes = require('./routes/providers');
const slotRoutes = require('./routes/slots');
const appointmentRoutes = require('./routes/appointments');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/appointments', appointmentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║   🗓️  Appointify Server Running           ║`);
  console.log(`  ║   → http://localhost:${PORT}               ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});
