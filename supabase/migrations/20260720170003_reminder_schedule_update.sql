-- STEP 2: Update reminder_schedule table with prescription columns
ALTER TABLE reminder_schedule 
ADD COLUMN IF NOT EXISTS prescription_id uuid REFERENCES prescriptions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS days_supplied_this_fill integer;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
