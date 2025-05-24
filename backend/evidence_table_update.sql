-- Add new columns to evidence table for photo management
ALTER TABLE evidence 
ADD COLUMN IF NOT EXISTS thumbnail_path TEXT,
ADD COLUMN IF NOT EXISTS is_photo BOOLEAN DEFAULT false;

-- Update existing image records to mark them as photos
UPDATE evidence 
SET is_photo = true 
WHERE file_type LIKE 'image/%';

-- Add index for better performance when filtering photos
CREATE INDEX IF NOT EXISTS idx_evidence_is_photo ON evidence(is_photo);

-- Add comments for documentation
COMMENT ON COLUMN evidence.thumbnail_path IS 'Path to thumbnail image for photos (300x300 max)';
COMMENT ON COLUMN evidence.is_photo IS 'True if this evidence is a photo that should be displayed inline'; 