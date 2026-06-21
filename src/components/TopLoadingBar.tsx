import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { subscribeProgress, getInflight } from '../lib/progress';

// Thin YouTube-style progress bar fixed to the top of the viewport.
// Visible whenever any tracked request is in flight; creeps toward 90%
// while waiting, then completes to 100% and fades out when idle.
export default function TopLoadingBar() {
    const inflight = useSyncExternalStore(subscribeProgress, getInflight);
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);
    const visibleRef = useRef(false);

    useEffect(() => {
        visibleRef.current = visible;
    }, [visible]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        let timeout: ReturnType<typeof setTimeout> | undefined;

        if (inflight > 0) {
            setVisible(true);
            setProgress(p => (p < 8 ? 8 : p));
            interval = setInterval(() => {
                setProgress(p => {
                    if (p >= 90) return p;
                    const inc = p < 50 ? 9 : p < 75 ? 4 : 1.5;
                    return Math.min(90, p + inc);
                });
            }, 300);
        } else if (visibleRef.current) {
            setProgress(100);
            timeout = setTimeout(() => {
                setVisible(false);
                setProgress(0);
            }, 280);
        }

        return () => {
            if (interval) clearInterval(interval);
            if (timeout) clearTimeout(timeout);
        };
    }, [inflight]);

    if (!visible) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                zIndex: 99999,
                pointerEvents: 'none',
            }}
        >
            <div
                style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #fb923c, #f97316)',
                    boxShadow: '0 0 8px rgba(249,115,22,0.7)',
                    borderRadius: '0 2px 2px 0',
                    transition: 'width 0.3s ease',
                }}
            />
        </div>
    );
}
