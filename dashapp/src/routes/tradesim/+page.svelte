<script>
    import { onMount } from 'svelte';
    import { status, chartInfo, lastKnownPrice } from '$lib/sim_stores.js';
    import Chart from '$lib/components/TradeSimulator/chart.svelte';
    import ControlPanel from '$lib/components/TradeSimulator/ControlPanel.svelte';

    // --- State Variables ---
    let historicalData = [];
    let liveUpdate = null;
    let tradeLines = { sl: null, tp: null }; // Holds the options for the lines
    let activeAdjustMode = null; // 'sl', 'tp', or null

    // --- WebSocket and Data Fetching Logic ---
    onMount(() => {
        const wsUrl = `ws://localhost:5000`; // Assuming server runs on port 5000
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => $status = { state: 'connecting', message: 'متصل شد. در انتظار سیگنال...' };
        
        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'chart_reset') {
                    clearAllState();
                    $chartInfo = { symbol: message.symbol, period: message.period };
                    fetchHistory(message.symbol, message.period);
                } else if (message.type === 'update_data' && message.symbol === $chartInfo.symbol) {
                    liveUpdate = message.data;
                }
            } catch (e) {
                console.error("Error processing WebSocket message:", e);
            }
        };

        socket.onclose = () => {
            $status = { state: 'disconnected', message: 'اتصال قطع شد. تلاش مجدد...' };
            setTimeout(() => window.location.reload(), 3000); // Simple reconnect logic
        };

        socket.onerror = (err) => {
            console.error("WebSocket Error:", err);
            $status = { state: 'disconnected', message: 'خطا در اتصال WebSocket.' };
        }
    });

    async function fetchHistory(symbol, period) {
        $status = { state: 'connecting', message: `در حال دریافت تاریخچه برای ${symbol}...` };
        try {
            const response = await fetch(`http://localhost:5000/history?symbol=${symbol}&period=${period}`);
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            
            const message = await response.json();
            if (message.data && message.data.length > 0) {
                historicalData = message.data;
                $status = { state: 'connected', message: `چارت برای ${symbol} (${period}) فعال است.` };
            } else {
                historicalData = [];
                $status = { state: 'connected', message: `تاریخچه‌ای برای ${symbol} یافت نشد.` };
            }
        } catch (e) {
            console.error("Fetch History Error:", e);
            $status = { state: 'disconnected', message: `خطا در دریافت تاریخچه.` };
        }
    }

    // --- Event Handlers from ControlPanel ---
    function handleCreateTrade(event) {
        const tradeType = event.detail.type;
        const entryPrice = $lastKnownPrice;
        if (entryPrice === 0) return;

        const isBuy = tradeType === 'buy';
        const slPrice = isBuy ? entryPrice * 0.995 : entryPrice * 1.005;
        const tpPrice = isBuy ? entryPrice * 1.01 : entryPrice * 0.99;

        tradeLines = {
            sl: { price: slPrice, color: '#ef5350', axisLabelVisible: true, title: `SL ${slPrice.toFixed(5)}` },
            tp: { price: tpPrice, color: '#26a69a', axisLabelVisible: true, title: `TP ${tpPrice.toFixed(5)}` }
        };
    }

    function handleClear() {
        clearAllState();
    }
    
    function handleAdjust(event) {
        const lineType = event.detail.line;
        // Toggle adjust mode
        activeAdjustMode = activeAdjustMode === lineType ? null : lineType;
    }

    // --- Event Handler from Chart component ---
    function handleLineMoved(event) {
        const { line, price } = event.detail;
        if (line === 'sl') {
            tradeLines.sl = { ...tradeLines.sl, price: price, title: `SL ${price.toFixed(5)}` };
        } else if (line === 'tp') {
            tradeLines.tp = { ...tradeLines.tp, price: price, title: `TP ${price.toFixed(5)}` };
        }
        // Re-assign to trigger reactivity
        tradeLines = { ...tradeLines };
        // Exit adjust mode after setting the line
        activeAdjustMode = null;
    }

    // --- Helper Functions ---
    function clearAllState() {
        tradeLines = { sl: null, tp: null };
        activeAdjustMode = null;
    }

    // --- Computed State ---
    $: tradeButtonsEnabled = $status.state === 'connected' && historicalData.length > 0;
    $: adjustControlsVisible = !!tradeLines.sl;

    const statusClasses = {
        connected: 'bg-green-500',
        disconnected: 'bg-red-500',
        connecting: 'bg-yellow-400 animate-pulse'
    };
</script>

<div class="flex flex-col h-screen">
    <!-- Status Bar -->
    <div class="bg-gray-800 p-2 text-center text-sm flex items-center justify-center space-x-2 space-x-reverse border-b border-gray-700">
     شبیه سازی معاملات 
        <span>{$status.message}</span>
        <span class="w-2.5 h-2.5 rounded-full {statusClasses[$status.state] || 'bg-gray-500'}"></span>
    </div>

    <!-- Main Content -->
    <div class="flex flex-row-reverse flex-1 overflow-hidden">
        <div class="flex-grow w-full h-full">
            <Chart 
                initialData={historicalData} 
                updateData={liveUpdate}
                slOptions={tradeLines.sl}
                tpOptions={tradeLines.tp}
                adjustMode={activeAdjustMode}
                on:lineMoved={handleLineMoved}
            />
        </div>
        
        <ControlPanel 
            {tradeButtonsEnabled}
            {adjustControlsVisible}
            {activeAdjustMode}
            on:createTrade={handleCreateTrade}
            on:clear={handleClear}
            on:adjust={handleAdjust}
        />
    </div>
</div>
