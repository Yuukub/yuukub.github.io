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
    const [strength, setStrength] = useState({ label: "Medium", score: 2, color: "bg-orange-500" });
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

        if (score <= 2) setStrength({ label: "Weak", score: 1, color: "bg-red-500" });
        else if (score <= 4) setStrength({ label: "Medium", score: 2, color: "bg-orange-500" });
        else if (score <= 5) setStrength({ label: "Strong", score: 3, color: "bg-emerald-500" });
        else setStrength({ label: "Very Strong", score: 4, color: "bg-blue-500" });
    }, [password]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen selection:bg-primary/20 bg-background">
            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-2xl">
                <div className="mb-12 text-center flex flex-col items-center">
                    <Link href="/tools" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4 w-fit">
                        <ArrowLeft className="h-4 w-4 mr-1" /> กลับไปที่เครื่องมือ
                    </Link>
                    <Badge variant="outline" className="mb-4">Privacy-First Tool</Badge>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-4">Secure Password Generator</h1>
                    <p className="text-lg text-muted-foreground">
                        Generate strong, cryptographically secure passwords locally.
                    </p>
                </div>

                <div className="grid gap-6">
                    <Card className="p-8 border-primary/20 bg-muted/20">
                        <div className="relative mb-6">
                            <input
                                type={showPassword ? "text" : "password"}
                                readOnly
                                value={password}
                                className="w-full text-2xl font-mono p-6 pr-24 rounded-2xl bg-background border-2 border-border/50 focus:border-primary outline-none transition-all tracking-wider text-center"
                                placeholder="Password"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={generatePassword}>
                                    <RefreshCw className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 mb-8">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Strength: <span className="font-bold">{strength.label}</span></span>
                                <Badge className={`${strength.color} text-white`}>Security Score: {strength.score}/4</Badge>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex gap-1">
                                {[1, 2, 3, 4].map((step) => (
                                    <div
                                        key={step}
                                        className={`h-full flex-1 transition-all duration-500 ${step <= strength.score ? strength.color : 'bg-muted-foreground/10'}`}
                                    />
                                ))}
                            </div>
                        </div>

                        <Button
                            className="w-full h-14 text-lg font-bold gap-3 rounded-2xl shadow-lg hover:shadow-primary/20 transition-all"
                            onClick={copyToClipboard}
                        >
                            {copied ? <CheckCircle2 className="h-6 w-6" /> : <Copy className="h-6 w-6" />}
                            {copied ? 'Copied to Clipboard' : 'Copy Password'}
                        </Button>
                    </Card>

                    <Card className="p-6 border-border/50">
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-sm font-bold flex items-center gap-2">
                                        Password Length: <span className="text-primary text-lg">{length}</span>
                                    </label>
                                </div>
                                <input
                                    type="range"
                                    min="8"
                                    max="64"
                                    value={length}
                                    onChange={(e) => setLength(parseInt(e.target.value))}
                                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {(Object.keys(options) as Array<keyof typeof options>).map((opt) => (
                                    <label
                                        key={opt}
                                        className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                                    >
                                        <span className="text-sm font-medium capitalize">{opt}</span>
                                        <input
                                            type="checkbox"
                                            checked={options[opt]}
                                            onChange={() => setOptions(prev => ({ ...prev, [opt]: !prev[opt] }))}
                                            className="w-5 h-5 accent-primary cursor-pointer"
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex gap-3 items-center">
                        <Shield className="h-5 w-5 text-blue-500 shrink-0" />
                        <p className="text-xs text-muted-foreground">
                            We use <code className="bg-blue-500/10 px-1 rounded text-blue-600">crypto.getRandomValues()</code> to ensure high-quality randomness. Your passwords never leave your device.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
