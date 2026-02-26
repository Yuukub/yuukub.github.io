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
    layout?: string;
    layoutKey?: string;
    responsive?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

export function AdUnit({
    slotId,
    format = "auto",
    layout,
    layoutKey,
    responsive = true,
    className = "",
    style = {},
}: AdUnitProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const pushed = useRef(false);

    useEffect(() => {
        if (pushed.current) return;

        const pushAd = () => {
            if (pushed.current) return;
            const width = containerRef.current?.offsetWidth ?? 0;
            if (width === 0) return; // รอจนกว่าจะมีความกว้าง

            pushed.current = true;
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (err) {
                console.error("AdSense error:", err);
            }
        };

        // ลอง push ทันที
        pushAd();

        // ถ้ายังไม่ได้ ใช้ ResizeObserver รอให้ layout เสร็จ
        if (!pushed.current && typeof ResizeObserver !== "undefined") {
            const observer = new ResizeObserver(() => {
                pushAd();
                if (pushed.current) observer.disconnect();
            });
            if (containerRef.current) observer.observe(containerRef.current);
            return () => observer.disconnect();
        }
    }, []);

    return (
        <div ref={containerRef} className={`ad-container my-8 text-center overflow-hidden ${className}`}>
            <ins
                className="adsbygoogle block"
                style={{ display: "block", textAlign: "center", minWidth: "1px", ...style }}
                data-ad-client="ca-pub-1635737019041674"
                data-ad-slot={slotId}
                data-ad-format={format}
                {...(layout ? { "data-ad-layout": layout } : {})}
                {...(layoutKey ? { "data-ad-layout-key": layoutKey } : {})}
                data-full-width-responsive={responsive}
            />
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mt-1 block">Advertisement</span>
        </div>
    );
}
