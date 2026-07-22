-- 1. Add Columns to Pharmacies Table
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS upi_id text;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS whatsapp_admin_phone text;

-- 2. Add Column to Bills Table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS prescription_image text;

-- 3. Create the Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
    medicine_id uuid REFERENCES medicines(id) ON DELETE CASCADE,
    supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
    quantity integer NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. Enable Row Level Security (RLS) for Purchase Orders
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- 5. Create a basic RLS policy for Purchase Orders (so users can read/write their own POs)
CREATE POLICY "Users can manage their own pharmacy purchase orders"
    ON purchase_orders FOR ALL
    USING (pharmacy_id IN (SELECT pharmacy_id FROM profiles WHERE id = auth.uid()));
        