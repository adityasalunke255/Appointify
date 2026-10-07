require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const supabase = require('./database');

async function seed() {
  console.log('🌱 Seeding Supabase database...\n');

  try {
    // 1. Clear existing data
    // Supabase will automatically cascade deletes if we configured foreign keys, 
    // but without schema definitions we just delete users, the rest cascade.
    // For safety, we'll try to delete from all tables.
    await supabase.from('reviews').delete().neq('id', '0');
    await supabase.from('appointments').delete().neq('id', '0');
    await supabase.from('slots').delete().neq('id', '0');
    await supabase.from('providers').delete().neq('id', '0');
    await supabase.from('app_users').delete().neq('id', '0');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // 2. Create users
    const users = [
      { id: uuidv4(), name: 'John Patient', email: 'john@example.com', role: 'user', phone: '+1-555-0101', password: hashedPassword },
      { id: uuidv4(), name: 'Dr. Emily Chen', email: 'emily@example.com', role: 'provider', phone: '+1-555-0201', password: hashedPassword },
      { id: uuidv4(), name: 'Lisa Martinez', email: 'lisa@example.com', role: 'provider', phone: '+1-555-0203', password: hashedPassword },
    ];
    
    await supabase.from('app_users').insert(users);
    console.log(`  ✅ Created ${users.length} users`);

    // 3. Create providers
    const providers = [
      {
        id: uuidv4(), user_id: users[1].id, category: 'Doctor',
        specialization: 'Cardiologist', bio: 'Board-certified cardiologist with 15 years experience.',
        rating: 4.8, total_reviews: 124, location: 'Downtown Medical Center', price: 150, duration: 30,
        image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face',
        is_active: 1
      },
      {
        id: uuidv4(), user_id: users[2].id, category: 'Salon',
        specialization: 'Hair Styling & Color', bio: 'Award-winning hair stylist with 10 years experience.',
        rating: 4.7, total_reviews: 203, location: 'Glamour Studio, 123 Main St', price: 85, duration: 45,
        image: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=400&fit=crop&crop=face',
        is_active: 1
      }
    ];

    await supabase.from('providers').insert(providers);
    console.log(`  ✅ Created ${providers.length} service providers`);

    // 4. Generate time slots
    const today = new Date();
    const slots = [];
    
    for (const provider of providers) {
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date(today);
        date.setDate(date.getDate() + dayOffset);
        if (date.getDay() === 0) continue; // Skip Sunday
        
        const dateStr = date.toISOString().split('T')[0];
        const duration = provider.duration;
        
        for (let h = 9 * 60; h + duration <= 17 * 60; h += duration + 10) {
          const startTime = `${String(Math.floor(h / 60)).padStart(2, '0')}:${String(h % 60).padStart(2, '0')}`;
          const endMin = h + duration;
          const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
          
          slots.push({
            id: uuidv4(),
            provider_id: provider.id,
            date: dateStr,
            start_time: startTime,
            end_time: endTime,
            is_available: 1
          });
        }
      }
    }
    
    // Batch insert slots
    for (let i = 0; i < slots.length; i += 100) {
      await supabase.from('slots').insert(slots.slice(i, i + 100));
    }
    console.log(`  ✅ Generated ${slots.length} time slots`);

    console.log('\n🎉 Supabase database seeded successfully!');
    console.log('  User: john@example.com');
    console.log('  Provider: emily@example.com');
  } catch (err) {
    console.error('Seeding failed:', err);
  }
}

seed().catch(console.error);
