-- ====================================================
-- Supabase Setup Script for Live Previewer Share Feature
-- รันในส่วน SQL Editor ของ Supabase Dashboard
-- ====================================================

-- 1. สร้างตารางเก็บโค้ด snippet ที่แชร์
CREATE TABLE IF NOT EXISTS shared_snippets (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    html_code   TEXT NOT NULL DEFAULT '',
    css_code    TEXT NOT NULL DEFAULT '',
    js_code     TEXT NOT NULL DEFAULT '',
    ip_address  TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    expires_at  TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days') NOT NULL,

    -- จำกัดขนาดโค้ดไม่เกิน 100KB รวมต่อ row (ป้องกัน payload bomb)
    CONSTRAINT html_size_limit CHECK (length(html_code) <= 100000),
    CONSTRAINT css_size_limit  CHECK (length(css_code)  <= 50000),
    CONSTRAINT js_size_limit   CHECK (length(js_code)   <= 50000)
);

-- 2. ตั้ง Index เพื่อให้ expires_at ค้นหาเร็วตอน cleanup
CREATE INDEX IF NOT EXISTS idx_shared_snippets_expires_at ON shared_snippets(expires_at);
CREATE INDEX IF NOT EXISTS idx_shared_snippets_ip ON shared_snippets(ip_address, created_at);

-- 3. เปิดใช้ Row Level Security (RLS)
ALTER TABLE shared_snippets ENABLE ROW LEVEL SECURITY;

-- 4. Policy: ให้ทุกคนอ่านได้ (Public Read) แต่ต้องยังไม่หมดอายุ
CREATE POLICY "Allow public read of non-expired snippets"
ON shared_snippets FOR SELECT
USING (expires_at > now());

-- 5. Policy: ให้ทุกคน INSERT ได้ แต่จำกัด Rate Limiting ด้วย Function
--    กำหนดไม่เกิน 5 ครั้ง ต่อ IP ต่อ 10 นาที
CREATE OR REPLACE FUNCTION check_ip_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    recent_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO recent_count
    FROM shared_snippets
    WHERE ip_address = NEW.ip_address
      AND created_at > now() - INTERVAL '10 minutes';

    IF recent_count >= 5 THEN
        RAISE EXCEPTION 'Rate limit exceeded. Please wait before sharing again.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger: ดักก่อน INSERT เพื่อเช็ค Rate Limit
DROP TRIGGER IF EXISTS trg_check_rate_limit ON shared_snippets;
CREATE TRIGGER trg_check_rate_limit
BEFORE INSERT ON shared_snippets
FOR EACH ROW
EXECUTE FUNCTION check_ip_rate_limit();

-- 7. Policy: อนุญาตให้ INSERT จาก anon (public)
CREATE POLICY "Allow public insert with rate limiting"
ON shared_snippets FOR INSERT
WITH CHECK (true);

-- ====================================================
-- Auto Cleanup: ลบโค้ดที่หมดอายุทุกเที่ยงคืน (ต้องเปิด pg_cron ก่อน)
-- ใน Supabase ให้ไปที่ Database > Extensions > เปิดใช้ pg_cron แล้วรันส่วนนี้
-- ====================================================

-- เปิด extension pg_cron (ถ้ายังไม่ได้เปิด)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ลบแถวที่ expires_at ผ่านไปแล้วทุกวันตอนเที่ยงคืน (UTC)
-- SELECT cron.schedule(
--     'delete-expired-snippets',
--     '0 0 * * *',
--     $$DELETE FROM shared_snippets WHERE expires_at < now()$$
-- );
