// lib/supabase-snippets.ts
// ฟังก์ชันติดต่อกับ Supabase สำหรับระบบ Share Code
// กำหนดค่า NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY ใน .env.local

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---- Types ----
export interface SnippetPayload {
    html_code: string;
    css_code: string;
    js_code: string;
}

export interface SnippetResult extends SnippetPayload {
    id: string;
    created_at: string;
    expires_at: string;
}

// ---- Helper: ดึง IP แบบ Client-side ผ่าน Public API ----
export async function getClientIp(): Promise<string> {
    try {
        const res = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
        const data = await res.json();
        return data.ip ?? "unknown";
    } catch {
        return "unknown";
    }
}

// ---- บันทึกโค้ดลง Supabase ----
export async function saveSnippet(
    payload: SnippetPayload,
    ipAddress: string
): Promise<{ id: string } | { error: string }> {
    // Validate ขนาดโค้ดก่อนส่ง (Client-side guard กันโค้ดที่ใหญ่เกิน)
    if (payload.html_code.length > 100_000) return { error: "HTML code is too large (max 100KB)" };
    if (payload.css_code.length > 50_000) return { error: "CSS code is too large (max 50KB)" };
    if (payload.js_code.length > 50_000) return { error: "JS code is too large (max 50KB)" };

    const { data, error } = await supabase
        .from("shared_snippets")
        .insert({
            html_code: payload.html_code,
            css_code: payload.css_code,
            js_code: payload.js_code,
            ip_address: ipAddress,
        })
        .select("id")
        .single();

    if (error) {
        // ดักข้อความ error จาก Trigger Rate Limit ที่เราตั้งไว้ใน DB
        if (error.message.includes("Rate limit exceeded")) {
            return { error: "คุณแชร์โค้ดบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" };
        }
        return { error: error.message };
    }

    return { id: data.id };
}

// ---- โหลดโค้ดจาก Supabase ด้วย ID ----
export async function loadSnippet(id: string): Promise<SnippetResult | { error: string }> {
    // Validate UUID format ก่อนส่ง ป้องกัน injection / garbage ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        return { error: "Invalid snippet ID format" };
    }

    const { data, error } = await supabase
        .from("shared_snippets")
        .select("id, html_code, css_code, js_code, created_at, expires_at")
        .eq("id", id)
        .gt("expires_at", new Date().toISOString()) // เช็กว่ายังไม่หมดอายุ
        .single();

    if (error || !data) {
        return { error: "ลิงก์นี้หมดอายุหรือไม่พบข้อมูล" };
    }

    return data as SnippetResult;
}
