-- STEP 1: Create the prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
    customer_phone text NOT NULL,
    customer_name text NOT NULL,
    medicine_id uuid REFERENCES medicines(id) ON DELETE CASCADE,
    medicine_name text NOT NULL,
    total_duration_days integer NOT NULL,
    filled_days integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'Active' NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Create policy allowing pharmacy staff to read/write their own prescriptions
CREATE POLICY "Users can manage their own prescriptions"
    ON prescriptions FOR ALL
    USING (pharmacy_id IN (SELECT pharmacy_id FROM profiles WHERE id = auth.uid()));

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
