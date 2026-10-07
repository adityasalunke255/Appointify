const express = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Book an appointment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { provider_id, slot_id, notes } = req.body;

    if (!provider_id || !slot_id) {
      return res.status(400).json({ error: 'Provider ID and Slot ID are required' });
    }

    // Check slot availability
    const { data: slot, error: slotErr } = await supabase
      .from('slots')
      .select('*')
      .eq('id', slot_id)
      .eq('is_available', 1)
      .single();
      
    if (!slot || slotErr) {
      return res.status(400).json({ error: 'Slot is no longer available' });
    }

    // Check conflict
    const { data: conflict } = await supabase
      .from('appointments')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('date', slot.date)
      .eq('start_time', slot.start_time)
      .eq('status', 'confirmed')
      .single();

    if (conflict) {
      return res.status(400).json({ error: 'You already have an appointment at this time' });
    }

    // Mark slot unavailable
    await supabase.from('slots').update({ is_available: 0 }).eq('id', slot_id);

    // Fetch provider details for AI context
    const { data: providerDetails } = await supabase
      .from('providers')
      .select('category, specialization')
      .eq('id', provider_id)
      .single();

    // Create appointment
    const id = uuidv4();
    const { data: appointment, error: apptErr } = await supabase
      .from('appointments')
      .insert([{
        id,
        user_id: req.user.id,
        provider_id,
        slot_id,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        status: 'pending',
        notes: notes || null
      }])
      .select()
      .single();
      
    if (apptErr) throw apptErr;

    res.status(201).json({ message: 'Appointment booked successfully!', appointment });
  } catch (err) {
    console.error('Book appointment error:', err);
    res.status(400).json({ error: err.message || 'Failed to book appointment' });
  }
});

// Get user's appointments
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = supabase
      .from('appointments')
      .select(`
        *,
        providers:provider_id(category, specialization, image, location, app_users(name))
      `)
      .eq('user_id', req.user.id);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.order('date', { ascending: false }).order('start_time', { ascending: false });

    const { data: appointments, error } = await query;
    if (error) throw error;
    
    const formatted = appointments.map(a => ({
      ...a,
      provider_name: a.providers?.app_users?.name || 'Provider',
      category: a.providers?.category,
      specialization: a.providers?.specialization,
      provider_image: a.providers?.image,
      location: a.providers?.location
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Cancel appointment
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('*, providers(user_id)')
      .eq('id', req.params.id)
      .eq('status', 'confirmed')
      .single();

    if (!appointment) return res.status(404).json({ error: 'Appointment not found or already cancelled' });
    
    if (appointment.user_id !== req.user.id && appointment.providers.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', req.params.id);
    await supabase.from('slots').update({ is_available: 1 }).eq('id', appointment.slot_id);

    res.json({ message: 'Appointment cancelled successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to cancel appointment' });
  }
});

// Reschedule appointment
router.put('/:id/reschedule', authenticateToken, async (req, res) => {
  try {
    const { new_slot_id } = req.body;
    if (!new_slot_id) return res.status(400).json({ error: 'New slot ID is required' });

    const { data: appointment } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .eq('status', 'confirmed')
      .single();

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const { data: newSlot } = await supabase
      .from('slots')
      .select('*')
      .eq('id', new_slot_id)
      .eq('is_available', 1)
      .single();

    if (!newSlot) return res.status(400).json({ error: 'Selected slot is no longer available' });

    await supabase.from('slots').update({ is_available: 1 }).eq('id', appointment.slot_id);
    await supabase.from('slots').update({ is_available: 0 }).eq('id', new_slot_id);
    await supabase.from('appointments').update({
      slot_id: new_slot_id,
      date: newSlot.date,
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
      updated_at: new Date().toISOString()
    }).eq('id', req.params.id);

    res.json({ message: 'Appointment rescheduled successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to reschedule' });
  }
});

// Complete appointment (provider only)
router.put('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('*, providers(user_id)')
      .eq('id', req.params.id)
      .eq('status', 'confirmed')
      .single();

    if (!appointment || appointment.providers.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Appointment not found or unauthorized' });
    }

    await supabase.from('appointments').update({ status: 'completed' }).eq('id', req.params.id);
    res.json({ message: 'Appointment marked as completed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete appointment' });
  }
});

// Add review
router.post('/:id/review', authenticateToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const { data: appointment } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .eq('status', 'completed')
      .single();

    if (!appointment) return res.status(404).json({ error: 'Completed appointment not found' });

    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('appointment_id', req.params.id)
      .single();
      
    if (existing) return res.status(409).json({ error: 'Already reviewed' });

    const id = uuidv4();
    await supabase.from('reviews').insert([{
      id,
      user_id: req.user.id,
      provider_id: appointment.provider_id,
      appointment_id: req.params.id,
      rating,
      comment
    }]);

    // recalculate rating logic would go here ideally (supabase RPC is best for this)
    // for now we'll skip updating provider average rating for brevity

    res.status(201).json({ message: 'Review submitted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Get stats (for dashboard)
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const isProvider = req.user.role === 'provider';
    let queryField = 'user_id';
    let queryId = req.user.id;
    
    if (isProvider) {
      const { data: provider } = await supabase.from('providers').select('id').eq('user_id', req.user.id).single();
      if (!provider) return res.json({ total: 0, confirmed: 0, completed: 0, cancelled: 0, today: 0 });
      queryField = 'provider_id';
      queryId = provider.id;
    }
    
    const { data: apps } = await supabase.from('appointments').select('status, date').eq(queryField, queryId);
    
    if (!apps) return res.json({ total: 0, confirmed: 0, completed: 0, cancelled: 0, today: 0 });
    
    const stats = {
      total: apps.length,
      confirmed: apps.filter(a => a.status === 'confirmed').length,
      completed: apps.filter(a => a.status === 'completed').length,
      cancelled: apps.filter(a => a.status === 'cancelled').length,
    };
    
    if (isProvider) {
      const today = new Date().toISOString().split('T')[0];
      stats.today = apps.filter(a => a.status === 'confirmed' && a.date === today).length;
    } else {
      const today = new Date().toISOString().split('T')[0];
      stats.upcoming = apps.filter(a => a.status === 'confirmed' && a.date >= today).length;
    }

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Webhook for Vapi.ai
router.post('/webhook/vapi', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (message?.type === 'end-of-call-report') {
      const summary = message.summary;
      const transcript = message.transcript;
      
      // Read appointmentId from query string injected in frontend
      const appointmentId = req.query.appointmentId;
      
      if (!appointmentId) return res.status(200).send('No appointment id');
      
      const transcriptLower = transcript ? transcript.toLowerCase() : '';
      let newStatus = 'pending';
      
      if (transcriptLower.includes('cancel') || transcriptLower.includes('reschedule') || transcriptLower.includes('no')) {
        newStatus = 'cancelled';
        const { data: appt } = await supabase.from('appointments').select('slot_id').eq('id', appointmentId).single();
        if (appt) await supabase.from('slots').update({ is_available: 1 }).eq('id', appt.slot_id);
      } else {
        newStatus = 'confirmed';
      }

      await supabase.from('appointments').update({
        status: newStatus,
        ai_summary: summary || 'No summary provided',
        ai_transcript: transcript,
        ai_status: 'completed'
      }).eq('id', appointmentId);
    }
    
    res.status(200).json({ received: true });
  } catch(err) {
    console.error("Vapi Webhook error", err);
    res.status(500).send("Error");
  }
});

module.exports = router;
