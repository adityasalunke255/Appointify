ALTER TABLE appointments ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS ai_transcript TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS ai_status TEXT;

-- Drop and recreate the check constraint to allow 'pending'
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
  CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed', 'rescheduled', 'no-show'));
