import { writable, derived } from 'svelte/store';

// --- Global State ---
export const REFERENCE_SOURCE_ID = "reference_lmax";

// --- Stores ---
export const connectionStatus = writable({ message: 'در حال اتصال به سرور...', status: 'connecting' });
export const sources = writable({});
export const lastPrices = writable({});
export const alerts = writable([]);

// --- Derived Stores ---
export const spreadDifferences = derived(lastPrices, ($lastPrices) => {
    if (!$lastPrices[REFERENCE_SOURCE_ID]) return {};

    const differences = {};
    for (const id in $lastPrices) {
        if (id !== REFERENCE_SOURCE_ID) {
            const diff = Math.abs($lastPrices[id] - $lastPrices[REFERENCE_SOURCE_ID]);
            differences[id] = (diff / 0.0001).toFixed(1);
        }
    }
    return differences;
});
