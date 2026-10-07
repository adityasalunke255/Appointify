const express = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get available slots for a provider on a specific date
router.get('/provider/:providerId', async (req, res) => {
  try {
    const { date } = req.query;
    const { providerId } = req.params;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const { data: slots, error } = await supabase
      .from('slots')
      .select('*')
      .eq('provider_id', providerId)
      .eq('date', date)
      .order('start_time', { ascending: true });

    if (error) throw error;
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

// Get available dates for a provider (dates that have at least one available slot)
router.get('/provider/:providerId/dates', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { month, year } = req.query;
    
    // Instead of doing group by in supabase client which is limited, 
    // we fetch slots for the period and calculate locally since it's a small dataset per month
    let query = supabase
      .from('slots')
      .select('date, is_available')
      .eq('provider_id', providerId);
      
    if (month && year) {
      const monthStr = String(month).padStart(2, '0');
      query = query.gte('date', `${year}-${monthStr}-01`)
                   .lte('date', `${year}-${monthStr}-31`);
    } else {
      // Default next 30 days
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0];
      query = query.gte('date', today).lte('date', nextMonth);
    }
    
    const { data: slots, error } = await query;
    if (error) throw error;
    
    const datesMap = {};
    for (const s of slots) {
      if (!datesMap[s.date]) datesMap[s.date] = { date: s.date, available_count: 0, total_count: 0 };
      datesMap[s.date].total_count++;
      if (s.is_available === 1 || s.is_available === true) {
        datesMap[s.date].available_count++;
      }
    }
    
    const dates = Object.values(datesMap).sort((a, b) => a.date.localeCompare(b.date));
    res.json(dates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch available dates' });
  }
});

// Create slots (provider only)
router.post('/', authenticateToken, requireRole('provider'), async (req, res) => {
  try {
    const { slots } = req.body; 

    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();
      
    if (!provider) {
      return res.status(404).json({ error: 'Provider profile not found.' });
    }

    const slotsToInsert = slots.map(s => ({
      id: uuidv4(),
      provider_id: provider.id,
      date: s.date,
      start_time: s.start_time,
      end_time: s.end_time,
      is_available: 1
    }));
    
    const { data, error } = await supabase
      .from('slots')
      .insert(slotsToInsert)
      .select();
      
    if (error) throw error;
    res.status(201).json({ message: `${data.length} slots created`, slots: data });
  } catch (err) {
    console.error('Create slots error:', err);
    res.status(500).json({ error: 'Failed to create slots' });
  }
});

// Generate slots automatically for a date range
router.post('/generate', authenticateToken, requireRole('provider'), async (req, res) => {
  try {
    const { start_date, end_date, start_hour, end_hour, duration, break_minutes, exclude_days } = req.body;

    const { data: provider } = await supabase
      .from('providers')
      .select('id, duration')
      .eq('user_id', req.user.id)
      .single();
      
    if (!provider) {
      return res.status(404).json({ error: 'Provider profile not found' });
    }

    const slotDuration = duration || provider.duration || 30;
    const breakMin = break_minutes || 0;
    const startH = start_hour || 9;
    const endH = end_hour || 17;
    const excludeDays = exclude_days || [0]; 

    const slotsToInsert = [];
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (excludeDays.includes(d.getDay())) continue;

      const dateStr = d.toISOString().split('T')[0];

      for (let h = startH; h < endH;) {
        const startMin = h * 60;
        const endMin = startMin + slotDuration;

        if (endMin > endH * 60) break;

        const startTime = `${String(Math.floor(startMin / 60)).padStart(2, '0')}:${String(startMin % 60).padStart(2, '0')}`;
        const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

        slotsToInsert.push({
          id: uuidv4(),
          provider_id: provider.id,
          date: dateStr,
          start_time: startTime,
          end_time: endTime,
          is_available: 1
        });

        h = (endMin + breakMin) / 60;
      }
    }
    
    if (slotsToInsert.length > 0) {
      const { error } = await supabase.from('slots').insert(slotsToInsert);
      if (error) throw error;
    }

    res.status(201).json({ message: `${slotsToInsert.length} slots generated successfully` });
  } catch (err) {
    console.error('Generate slots error:', err);
    res.status(500).json({ error: 'Failed to generate slots' });
  }
});

// Delete a slot
router.delete('/:id', authenticateToken, requireRole('provider'), async (req, res) => {
  try {
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();
      
    if (!provider) return res.status(404).json({ error: 'Provider not found' });

    const { data: slot } = await supabase
      .from('slots')
      .select('*')
      .eq('id', req.params.id)
      .eq('provider_id', provider.id)
      .single();

    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    const { data: appointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('slot_id', req.params.id)
      .eq('status', 'confirmed')
      .single();

    if (appointment) {
      return res.status(400).json({ error: 'Cannot delete slot with an active appointment' });
    }

    await supabase.from('slots').delete().eq('id', req.params.id);
    res.json({ message: 'Slot deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete slot' });
  }
});

module.exports = router;
