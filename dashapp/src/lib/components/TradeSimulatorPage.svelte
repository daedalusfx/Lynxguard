<script>
	import { onMount, onDestroy } from 'svelte';
	import { createChart, LineStyle, CrosshairMode } from 'lightweight-charts';

	// --- شناسه بروکر مرجع ---
	const REFERENCE_SOURCE_ID = "reference_lmax";

	// --- متغیرهای واکنشی (Reactive State) ---
	let chartContainer; // برای اتصال به DOM با bind:this
	let chart = null;
	let candleSeries = null;
	
	let lastKnownPrice = 0;
	let currentSymbol = '';
	let currentPeriod = '';
	
	let stopLossLine = null;
	let takeProfitLine = null;

	let adjustMode = { active: false, line: null }; // 'sl' or 'tp'
	let status = { text: 'در حال اتصال...', type: 'connecting' }; // connecting, connected, disconnected
	let tradeButtonsEnabled = false;
	let showAdjustControls = false;

	// --- ثابت‌های استایل ---
	const LINE_STYLE_DEFAULT = { lineWidth: 2, lineStyle: LineStyle.Dashed };
	const LINE_STYLE_HIGHLIGHT = { lineWidth: 4, lineStyle: LineStyle.Solid };
	
	let socket;

	// --- onMount: کدها بعد از رندر شدن کامپوننت اجرا می‌شوند ---
	onMount(() => {
		// --- راه‌اندازی چارت ---
		chart = createChart(chartContainer, {
			layout: { background: { color: '#131722' }, textColor: '#d1d4dc' },
			grid: { vertLines: { color: '#2a2e39' }, horzLines: { color: '#2a2e39' } },
			timeScale: { timeVisible: true, secondsVisible: true },
			crosshair: { mode: CrosshairMode.Normal },
		});
		candleSeries = chart.addCandlestickSeries({
			upColor: '#26a69a', downColor: '#ef5350',
			borderDownColor: '#ef5350', borderUpColor: '#26a69a',
			wickDownColor: '#ef5350', wickUpColor: '#26a69a',
		});

		// --- اتصال WebSocket ---
		const wsUrl = `ws://127.0.0.1:5000`;
		socket = new WebSocket(wsUrl);

		socket.onopen = () => {
			status = { text: 'متصل شد. در انتظار سیگنال...', type: 'connecting' };
		};

		socket.onmessage = (event) => {
			try {
				const message = JSON.parse(event.data);
				console.log("Received WebSocket message:", message);

				if (message.type === 'chart_reset' && message.sourceIdentifier === REFERENCE_SOURCE_ID) {
					clearAll();
					currentSymbol = message.symbol;
					currentPeriod = message.period;
					fetchHistory(currentSymbol, currentPeriod);
				} else if (message.type === 'tick' && message.payload.sourceIdentifier === REFERENCE_SOURCE_ID && candleSeries) {
					const tick = message.payload;
					candleSeries.update({
						time: tick.time_msc / 1000,
						open: tick.bid,
						high: tick.bid,
						low: tick.bid,
						close: tick.bid
					});
					lastKnownPrice = tick.bid;
				}
			} catch (e) {
				console.error('Error processing WebSocket message:', e);
			}
		};
		
		socket.onclose = () => {
			status = { text: 'اتصال قطع شد.', type: 'disconnected' };
			tradeButtonsEnabled = false;
		};
		
		// --- مدیریت کلیک روی چارت برای تنظیم خطوط ---
		chart.subscribeClick(param => {
			if (!adjustMode.active || !param.point) return;

			const clickedPrice = candleSeries.coordinateToPrice(param.point.y);
			if (clickedPrice === null) return;

			if (adjustMode.line === 'sl' && stopLossLine) {
				const slPrice = clickedPrice;
				stopLossLine.applyOptions({ price: slPrice, title: `SL ${slPrice.toFixed(5)}` });
			} else if (adjustMode.line === 'tp' && takeProfitLine) {
				const tpPrice = clickedPrice;
				takeProfitLine.applyOptions({ price: tpPrice, title: `TP ${tpPrice.toFixed(5)}` });
			}
			
			resetAdjustMode();
		});

	});
	
	// --- onDestroy: پاک‌سازی قبل از حذف کامپوننت ---
	onDestroy(() => {
		if (socket && socket.readyState === WebSocket.OPEN) {
			socket.close();
		}
		if (chart) {
			chart.remove();
		}
	});

	// --- توابع کمکی ---
	async function fetchHistory(symbol, period) {
		status = { text: `در حال دریافت تاریخچه برای ${symbol} از بروکر مرجع...`, type: 'connecting' };
		try {
			const response = await fetch(`/history?symbol=${symbol}&period=${period}&sourceIdentifier=${REFERENCE_SOURCE_ID}`);
			if (!response.ok) throw new Error(`Server responded with ${response.status}`);
			
			const message = await response.json();
			
			if (message.type === 'history_data' && message.data && message.data.length > 0) {
				candleSeries.setData(message.data);
				chart.timeScale().fitContent();
				lastKnownPrice = message.data[message.data.length - 1].close;
				status = { text: `چارت برای ${symbol} (${period}) فعال است.`, type: 'connected' };
				tradeButtonsEnabled = true;
			} else {
				 status = { text: `داده‌ای برای ${symbol} یافت نشد.`, type: 'disconnected' };
			}
		} catch (error) {
			console.error("Error fetching history:", error);
			status = { text: 'خطا در دریافت تاریخچه.', type: 'disconnected' };
		}
	}

	function clearAll() {
		if (stopLossLine) candleSeries.removePriceLine(stopLossLine);
		if (takeProfitLine) candleSeries.removePriceLine(takeProfitLine);
		stopLossLine = null;
		takeProfitLine = null;
		showAdjustControls = false;
		resetAdjustMode();
	}

	function createTradeLines(tradeType) {
		clearAll();
		if (lastKnownPrice === 0) return;

		const isBuy = tradeType === 'buy';
		const entryPrice = lastKnownPrice;
		
		const slPrice = isBuy ? entryPrice * 0.995 : entryPrice * 1.005;
		const tpPrice = isBuy ? entryPrice * 1.01 : entryPrice * 0.99;

		stopLossLine = candleSeries.createPriceLine({
			price: slPrice, color: '#ef5350', ...LINE_STYLE_DEFAULT,
			axisLabelVisible: true, title: `SL ${slPrice.toFixed(5)}`,
		});

		takeProfitLine = candleSeries.createPriceLine({
			price: tpPrice, color: '#26a69a', ...LINE_STYLE_DEFAULT,
			axisLabelVisible: true, title: `TP ${tpPrice.toFixed(5)}`,
		});

		showAdjustControls = true;
	}

	function resetAdjustMode() {
		if (adjustMode.line === 'sl' && stopLossLine) stopLossLine.applyOptions(LINE_STYLE_DEFAULT);
		if (adjustMode.line === 'tp' && takeProfitLine) takeProfitLine.applyOptions(LINE_STYLE_DEFAULT);
		
		adjustMode = { active: false, line: null };
		if (chartContainer) chartContainer.style.cursor = 'default';
	}

	function handleAdjustClick(lineType) {
		const wasActive = adjustMode.active && adjustMode.line === lineType;
		resetAdjustMode();
		if (!wasActive) {
			adjustMode = { active: true, line: lineType };
			chartContainer.style.cursor = 'crosshair';
			if (lineType === 'sl' && stopLossLine) stopLossLine.applyOptions(LINE_STYLE_HIGHLIGHT);
			if (lineType === 'tp' && takeProfitLine) takeProfitLine.applyOptions(LINE_STYLE_HIGHLIGHT);
		}
	}
</script>

<!-- ساختار HTML کامپوننت -->
<div class="flex flex-col h-screen bg-gray-900 text-gray-200">
	<!-- نوار وضعیت -->
	<div class="bg-gray-800 p-2 text-center text-sm border-b border-gray-700 flex items-center justify-center gap-2">
		<span>{status.text}</span>
		<span class="w-2.5 h-2.5 rounded-full" 
			  class:bg-green-500={status.type === 'connected'} 
			  class:bg-red-500={status.type === 'disconnected'} 
			  class:bg-yellow-400={status.type === 'connecting'} 
			  class:animate-pulse={status.type === 'connecting'}>
		</span>
	</div>

	<!-- محتوای اصلی -->
	<div class="flex flex-row-reverse flex-1 overflow-hidden">
		<!-- محفظه چارت -->
		<div bind:this={chartContainer} class="flex-grow w-full h-full"></div>

		<!-- پنل کنترل -->
		<div class="w-64 bg-gray-800 p-4 flex-shrink-0 flex flex-col space-y-4 border-l border-gray-700">
			<h2 class="text-lg font-bold text-center text-white">پنل معامله</h2>
			
			<div class="flex flex-col space-y-3">
				<button on:click={() => createTradeLines('buy')} disabled={!tradeButtonsEnabled} class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
					خرید (Buy)
				</button>
				<button on:click={() => createTradeLines('sell')} disabled={!tradeButtonsEnabled} class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
					فروش (Sell)
				</button>
			</div>

			{#if showAdjustControls}
				<div class="pt-4 border-t border-gray-700">
					<h3 class="text-md font-semibold text-center text-gray-300 mb-3">تنظیم خطوط</h3>
					<div class="flex flex-col space-y-3">
						<button on:click={() => handleAdjustClick('sl')} class="text-white font-bold py-2 px-4 rounded-lg transition-colors" class:bg-yellow-500={adjustMode.line === 'sl'} class:text-black={adjustMode.line === 'sl'} class:bg-gray-600={adjustMode.line !== 'sl'} class:hover:bg-gray-500={adjustMode.line !== 'sl'}>
						   تنظیم حد ضرر (SL)
						</button>
						<button on:click={() => handleAdjustClick('tp')} class="text-white font-bold py-2 px-4 rounded-lg transition-colors" class:bg-yellow-500={adjustMode.line === 'tp'} class:text-black={adjustMode.line === 'tp'} class:bg-gray-600={adjustMode.line !== 'tp'} class:hover:bg-gray-500={adjustMode.line !== 'tp'}>
						   تنظیم حد سود (TP)
						</button>
					</div>
				</div>
			{/if}

			<div class="flex-grow"></div>
			<button on:click={clearAll} class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
				پاک کردن همه چیز
			</button>
		</div>
	</div>
</div>

<!-- استایل‌های مخصوص این کامپوننت -->
<style>
	/* استایل‌های Tailwind به صورت سراسری اعمال می‌شوند و نیازی به تعریف مجدد ندارند */
	/* می‌توانید استایل‌های خاصی که فقط برای این کامپوننت هستند را اینجا اضافه کنید */
</style>
