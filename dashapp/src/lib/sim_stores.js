import { writable } from 'svelte/store';

/**
 * @typedef {'connecting' | 'connected' | 'disconnected'} StatusState
 */

/**
 * @type {import('svelte/store').Writable<{state: StatusState, message: string}>}
 */
export const status = writable({
    state: 'connecting',
    message: 'در حال اتصال...'
});

/**
 * @type {import('svelte/store').Writable<{symbol: string, period: string}>}
 */
export const chartInfo = writable({
    symbol: '',
    period: ''
});

/**
 * @type {import('svelte/store').Writable<number>}
 */
export const lastKnownPrice = writable(0);
