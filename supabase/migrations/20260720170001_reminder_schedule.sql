-- STEP 2: Create the reminder_schedule table
CREATE TABLE IF NOT EXISTS reminder_schedule (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
    customer_phone text NOT NULL,
    customer_name text NOT NULL,
    medicine_id uuid REFERENCES medicines(id) ON DELETE CASCADE,
    medicine_name text NOT NULL,
    bill_id uuid REFERENCES bills(id) ON DELETE CASCADE,
    due_date date NOT NULL,
    status text DEFAULT 'Pending' NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE reminder_schedule ENABLE ROW LEVEL SECURITY;

-- Create policy allowing pharmacy staff to read/write their own reminders
CREATE POLICY "Users can manage their own pharmacy reminders"
    ON reminder_schedule FOR ALL
    USING (pharmacy_id IN (SELECT pharmacy_id FROM profiles WHERE id = auth.uid()));

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
