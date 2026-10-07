const express = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all providers (with optional category filter)
router.get('/', async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    
    let query = supabase
      .from('providers')
      .select(`
        *,
        app_users!inner(name, email, phone)
      `)
      .eq('is_active', 1);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      const searchTerm = `%${search}%`;
      // Supabase supports basic filtering. For complex search we use or()
      query = query.or(`category.ilike.${searchTerm},specialization.ilike.${searchTerm},app_users.name.ilike.${searchTerm}`);
    }

    if (sort === 'rating') {
      query = query.order('rating', { ascending: false });
    } else if (sort === 'price-low') {
      query = query.order('price', { ascending: true });
    } else if (sort === 'price-high') {
      query = query.order('price', { ascending: false });
    } else {
      query = query.order('rating', { ascending: false }).order('total_reviews', { ascending: false });
    }

    const { data: providers, error } = await query;
    if (error) throw error;
    
    // Flatten the app_users join to match frontend expectations
    const formattedProviders = providers.map(p => ({
      ...p,
      name: p.app_users.name,
      email: p.app_users.email,
      phone: p.app_users.phone
    }));

    res.json(formattedProviders);
  } catch (err) {
    console.error('Get providers error:', err);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// Get single provider
router.get('/:id', async (req, res) => {
  try {
    const { data: provider, error } = await supabase
      .from('providers')
      .select(`*, app_users!inner(name, email, phone)`)
      .eq('id', req.params.id)
      .single();

    if (error || !provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const formattedProvider = {
      ...provider,
      name: provider.app_users.name,
      email: provider.app_users.email,
      phone: provider.app_users.phone
    };

    // Get reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*, app_users!inner(name)')
      .eq('provider_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(10);
      
    const formattedReviews = (reviews || []).map(r => ({
      ...r,
      user_name: r.app_users.name
    }));

    res.json({ ...formattedProvider, reviews: formattedReviews });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch provider' });
  }
});

// Create/update provider profile (for logged in providers)
router.post('/profile', authenticateToken, requireRole('provider'), async (req, res) => {
  try {
    const { category, specialization, bio, location, price, duration, image } = req.body;

    const { data: existing } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (existing) {
      const { data: provider, error } = await supabase
        .from('providers')
        .update({
          category,
          specialization,
          bio,
          location,
          price,
          duration,
          image
        })
        .eq('user_id', req.user.id)
        .select()
        .single();
        
      if (error) throw error;
      return res.json(provider);
    }

    const id = uuidv4();
    const { data: provider, error } = await supabase
      .from('providers')
      .insert([{
        id,
        user_id: req.user.id,
        category,
        specialization: specialization || '',
        bio: bio || '',
        location: location || '',
        price: price || 0,
        duration: duration || 30,
        image: image || ''
      }])
      .select()
      .single();
      
    if (error) throw error;
    res.status(201).json(provider);
  } catch (err) {
    console.error('Provider profile error:', err);
    res.status(500).json({ error: 'Failed to update provider profile' });
  }
});

// Get provider's appointments (provider dashboard)
router.get('/:id/appointments', authenticateToken, async (req, res) => {
  try {
    const { status, date } = req.query;
    
    let query = supabase
      .from('appointments')
      .select(`*, app_users!inner(name, email, phone)`)
      .eq('provider_id', req.params.id);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (date) {
      query = query.eq('date', date);
    }

    query = query.order('date', { ascending: true }).order('start_time', { ascending: true });

    const { data: appointments, error } = await query;
    if (error) throw error;
    
    const formatted = appointments.map(a => ({
      ...a,
      user_name: a.app_users.name,
      user_email: a.app_users.email,
      user_phone: a.app_users.phone
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

module.exports = router;
