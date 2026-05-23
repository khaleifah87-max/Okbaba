-- Add payment_methods JSONB column to technician_profiles
-- This stores technicians' preferred payment methods and account details

ALTER TABLE technician_profiles
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '{}';

COMMENT ON COLUMN technician_profiles.payment_methods IS 'Stores technician preferred payment methods: {method_id: {enabled: bool, detail: string}}';