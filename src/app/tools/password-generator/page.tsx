"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, RefreshCw, CheckCircle2, Lock, Shield, Eye, EyeOff, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PasswordGenerator() {
    const [password, setPassword] = useState("");
    const [length, setLength] = useState(16);
    const [options, setOptions] = useState({
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
    });
    const [strength, setStrength] = useState({ label: "Medium", score: 2, color: "text-orange-500", bg: "bg-orange-500" });
    const [copied, setCopied] = useState(false);
    const [showPassword, setShowPassword] = useState(true);

    const generatePassword = useCallback(() => {
        const charset = {
            uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            lowercase: "abcdefghijklmnopqrstuvwxyz",
            numbers: "0123456789",
            symbols: "!@#$%^&*()_+~`|}{[]:;?><,./-=",
        };

        let characters = "";
        if (options.uppercase) characters += charset.uppercase;
        if (options.lowercase) characters += charset.lowercase;
        if (options.numbers) characters += charset.numbers;
        if (options.symbols) characters += charset.symbols;

        if (!characters) {
            setPassword("");
            return;
        }

        let result = "";
        const array = new Uint32Array(length);
        window.crypto.getRandomValues(array);

        for (let i = 0; i < length; i++) {
            result += characters.charAt(array[i] % characters.length);
        }
        setPassword(result);
    }, [length, options]);

    useEffect(() => {
        generatePassword();
    }, [generatePassword]);

    useEffect(() => {
        // Simple strength calculator
        let score = 0;
        if (password.length > 12) score++;
        if (password.length > 18) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        if (score <= 2) setStrength({ label: "Weak", score: 1, color: "text-red-500", bg: "bg-red-500" });
        else if (score <= 4) setStrength({ label: "Medium", score: 2, color: "text-orange-500", bg: "bg-orange-500" });
        else if (score <= 5) setStrength({ label: "Strong", score: 3, color: "text-emerald-500", bg: "bg-emerald-500" });
        else setStrength({ label: "Very Strong", score: 4, color: "text-blue-500", bg: "bg-blue-500" });
    }, [password]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen selection:bg-primary/20 bg-background">
            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-3xl">
                <div className="mb-8">
                    <Link href="/tools" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4 w-fit">
                        <ArrowLeft className="h-4 w-4 mr-1" /> กลับไปที่เครื่องมือ
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Lock className="h-6 w-6 text-emerald-500" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Secure Password Generator</h1>
                    </div>
                    <p className="text-muted-foreground">
                        สร้างรหัสผ่านที่ปลอดภัยและคาดเดายากได้ทันทีบนเครื่องของคุณ (Privacy-First)
                    </p>
                </div>

                <div className="grid gap-6">
                    <Card className="border-border/50 bg-muted/20 overflow-hidden">
                        <div className="p-6 sm:p-8 space-y-6">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        readOnly
                                        value={password}
                                        className="w-full text-xl sm:text-2xl font-mono p-5 pr-24 rounded-xl bg-background border border-border/50 focus:border-primary outline-none transition-all tracking-wider"
                                        placeholder="Generating..."
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 text-muted-foreground hover:text-primary"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 text-muted-foreground hover:text-primary"
                                            onClick={generatePassword}
                                        >
                                            <RefreshCw className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-muted-foreground">ความแข็งแรง:</span>
                                        <span className={`text-sm font-bold ${strength.color}`}>{strength.label}</span>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-bold">
                                        Security Score: {strength.score}/4
                                    </Badge>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex gap-1">
                                    {[1, 2, 3, 4].map((step) => (
                                        <div
                                            key={step}
                                            className={`h-full flex-1 transition-all duration-500 ${step <= strength.score ? strength.bg : 'bg-muted-foreground/10'}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <Button
                                className="w-full h-12 text-base font-bold gap-2 rounded-xl shadow-md hover:shadow-lg transition-all"
                                onClick={copyToClipboard}
                                disabled={!password}
                            >
                                {copied ? <CheckCircle2 className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                                {copied ? 'คัดลอกแล้ว!' : 'คัดลอกรหัสผ่าน'}
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-6 border-border/50 bg-card">
                        <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                            ปรับแต่งรหัสผ่าน (Options)
                        </h3>

                        <div className="space-y-8">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium">
                                        ความยาว: <span className="text-primary font-bold text-lg ml-1">{length}</span> ตัวอักษร
                                    </label>
                                </div>
                                <input
                                    type="range"
                                    min="8"
                                    max="64"
                                    value={length}
                                    onChange={(e) => setLength(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(Object.keys(options) as Array<keyof typeof options>).map((opt) => (
                                    <label
                                        key={opt}
                                        className={`flex items-center justify-between p-3.5 rounded-xl border border-border/50 hover:bg-muted/50 cursor-pointer transition-all ${options[opt] ? 'bg-primary/[0.03] border-primary/20' : ''}`}
                                    >
                                        <span className="text-sm font-medium capitalize">
                                            {opt === 'uppercase' && 'ตัวพิมพ์ใหญ่ (A-Z)'}
                                            {opt === 'lowercase' && 'ตัวพิมพ์เล็ก (a-z)'}
                                            {opt === 'numbers' && 'ตัวเลข (0-9)'}
                                            {opt === 'symbols' && 'สัญลักษณ์ (!@#$)'}
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={options[opt]}
                                            onChange={() => setOptions(prev => ({ ...prev, [opt]: !prev[opt] }))}
                                            className="w-4 h-4 accent-primary cursor-pointer"
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex gap-3 items-center">
                        <Shield className="h-5 w-5 text-emerald-500 shrink-0" />
                        <p className="text-[13px] text-muted-foreground leading-relaxed">
                            ปลอดภัยที่สุด: รหัสถูกสร้างขึ้นแบบสุ่มด้วย <code className="bg-emerald-500/10 px-1 rounded text-emerald-600 font-mono">crypto.getRandomValues()</code> ภายในเครื่องของคุณเท่านั้น ไม่มีการส่งข้อมูลไปยังเซิร์ฟเวอร์
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
