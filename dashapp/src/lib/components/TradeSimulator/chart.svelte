
<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import { lastKnownPrice } from '$lib/sim_stores';

    // Props from parent
    export let initialData = [];
    export let updateData = null;
    export let slOptions = null; // Stop Loss line options
    export let tpOptions = null; // Take Profit line options
    export let adjustMode = null; // 'sl' or 'tp'

    const dispatch = createEventDispatcher();

    // --- Chart and DOM elements ---
    let chartContainer;
    let chart;
    let candleSeries;
    let stopLossPriceLine = null;
    let takeProfitPriceLine = null;

    const LINE_STYLE_DEFAULT = { lineWidth: 2, lineStyle: 2 }; // Dashed
    const LINE_STYLE_HIGHLIGHT = { lineWidth: 4, lineStyle: 0 }; // Solid

    onMount(async () => {
        // Dynamically import the library to avoid SSR issues
        const { createChart, LineStyle } = await import('lightweight-charts');

        chart = createChart(chartContainer, {
            layout: { background: { color: '#131722' }, textColor: '#d1d4dc' },
            grid: { vertLines: { color: '#2a2e39' }, horzLines: { color: '#2a2e39' } },
            timeScale: { timeVisible: true, secondsVisible: true },
            crosshair: { mode: 1 }, // Normal
        });

        candleSeries = chart.addCandlestickSeries({
            upColor: '#26a69a', downColor: '#ef5350',
            borderDownColor: '#ef5350', borderUpColor: '#26a69a',
            wickDownColor: '#ef5350', wickUpColor: '#26a69a',
        });

        // Handle clicks on the chart for adjusting lines
        chart.subscribeClick(param => {
            if (!adjustMode || !param.point || !candleSeries) return;

            const clickedPrice = candleSeries.coordinateToPrice(param.point.y);
            if (clickedPrice !== null) {
                dispatch('lineMoved', { line: adjustMode, price: clickedPrice });
            }
        });

        // Load initial data if available
        if (initialData.length > 0) {
            candleSeries.setData(initialData);
            chart.timeScale().fitContent();
        }
    });

    onDestroy(() => {
        if (chart) {
            chart.remove();
        }
    });

    // --- Reactive Statements ---

    // Update chart data when initialData prop changes
    $: if (candleSeries && initialData) {
        candleSeries.setData(initialData);
        chart?.timeScale().fitContent();
        if (initialData.length > 0) {
            $lastKnownPrice = initialData[initialData.length - 1].close;
        }
    }

    // Update chart with real-time data
    $: if (candleSeries && updateData) {
        candleSeries.update(updateData);
        $lastKnownPrice = updateData.close;
    }

    // Manage Stop Loss line
    $: if (candleSeries) {
        if (slOptions && !stopLossPriceLine) {
            stopLossPriceLine = candleSeries.createPriceLine(slOptions);
        } else if (slOptions && stopLossPriceLine) {
            stopLossPriceLine.applyOptions(slOptions);
        } else if (!slOptions && stopLossPriceLine) {
            candleSeries.removePriceLine(stopLossPriceLine);
            stopLossPriceLine = null;
        }
        // Highlight SL line if in adjust mode
        stopLossPriceLine?.applyOptions(adjustMode === 'sl' ? LINE_STYLE_HIGHLIGHT : LINE_STYLE_DEFAULT);
    }

    // Manage Take Profit line
    $: if (candleSeries) {
        if (tpOptions && !takeProfitPriceLine) {
            takeProfitPriceLine = candleSeries.createPriceLine(tpOptions);
        } else if (tpOptions && takeProfitPriceLine) {
            takeProfitPriceLine.applyOptions(tpOptions);
        } else if (!tpOptions && takeProfitPriceLine) {
            candleSeries.removePriceLine(takeProfitPriceLine);
            takeProfitPriceLine = null;
        }
        // Highlight TP line if in adjust mode
        takeProfitPriceLine?.applyOptions(adjustMode === 'tp' ? LINE_STYLE_HIGHLIGHT : LINE_STYLE_DEFAULT);
    }
    
    // Update cursor style based on adjust mode
    $: if (chartContainer) {
        chartContainer.style.cursor = adjustMode ? 'crosshair' : 'default';
    }

</script>

<div bind:this={chartContainer} class="w-full h-full"></div>
