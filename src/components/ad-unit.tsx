"use client";

import { useEffect, useRef } from "react";

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

interface AdUnitProps {
    slotId: string;
    format?: "auto" | "fluid" | "rectangle";
    layoutKey?: string;
    responsive?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

export function AdUnit({
    slotId,
    format = "auto",
    layoutKey,
    responsive = true,
    className = "",
    style = {},
}: AdUnitProps) {
    const adRef = useRef<HTMLModElement>(null);

    useEffect(() => {
        try {
            if (typeof window !== "undefined") {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (err) {
            console.error("AdSense error:", err);
        }
    }, []);

    return (
        <div className={`ad-container my-8 text-center overflow-hidden ${className}`}>
            <ins
                className="adsbygoogle block"
                style={{ display: "block", ...style }}
                data-ad-client="ca-pub-xxxxxxxxxxxxxxxx" // TODO: Replace with actual client ID
                data-ad-slot={slotId}
                data-ad-format={format}
                data-full-width-responsive={responsive}
                {...(layoutKey ? { "data-ad-layout-key": layoutKey } : {})}
            />
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mt-1 block">Advertisement</span>
        </div>
    );
}
