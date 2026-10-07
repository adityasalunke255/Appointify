const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user exists
    const { data: existing, error: existErr } = await supabase
      .from('app_users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const userRole = role === 'provider' ? 'provider' : 'user';

    const { error: insertErr } = await supabase
      .from('app_users')
      .insert([
        { id, name, email, password: hashedPassword, role: userRole, phone: phone || null }
      ]);

    if (insertErr) throw insertErr;

    const token = jwt.sign({ id, email, role: userRole, name }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id, name, email, role: userRole, phone }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: user, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user || error) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Get provider info if applicable
    let providerInfo = null;
    if (user.role === 'provider') {
      const { data: provider } = await supabase
        .from('providers')
        .select('*')
        .eq('user_id', user.id)
        .single();
      providerInfo = provider;
    }

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        provider: providerInfo
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('app_users')
      .select('id, name, email, role, phone, avatar, created_at')
      .eq('id', req.user.id)
      .single();

    if (!user || error) {
      return res.status(404).json({ error: 'User not found' });
    }

    let providerInfo = null;
    if (user.role === 'provider') {
      const { data: provider } = await supabase
        .from('providers')
        .select('*')
        .eq('user_id', user.id)
        .single();
      providerInfo = provider;
    }

    res.json({ ...user, provider: providerInfo });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    // update logic
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.user.id);

    if (error) throw error;

    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, role, phone, created_at')
      .eq('id', req.user.id)
      .single();

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
