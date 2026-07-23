-- ==========================================================
-- OPD & PATIENT RECORDS SCHEMA MIGRATION FOR SUPABASE
-- ==========================================================

-- 1. Create Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
    uhid text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    gender text,
    age integer,
    blood_group text,
    address text,
    allergies text,
    chronic_conditions text,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Create OPD Consultations Table
CREATE TABLE IF NOT EXISTS op_consultations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
    uhid text,
    patient_name text NOT NULL,
    patient_phone text,
    gender text,
    age integer,
    doctor_name text,
    vitals jsonb DEFAULT '{}'::jsonb,
    diagnosis text,
    medicines jsonb DEFAULT '[]'::jsonb,
    consultation_fee numeric DEFAULT 0,
    token_number text,
    status text DEFAULT 'Waiting',
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE op_consultations ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for Tenant Security
CREATE POLICY "Users can manage their pharmacy patients"
    ON patients FOR ALL
    USING (pharmacy_id IN (SELECT pharmacy_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their pharmacy OPD consultations"
    ON op_consultations FOR ALL
    USING (pharmacy_id IN (SELECT pharmacy_id FROM profiles WHERE id = auth.uid()));

-- 5. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
