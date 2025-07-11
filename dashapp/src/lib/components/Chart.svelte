<script>

	import { onMount, onDestroy } from 'svelte';
		import { createChart } from 'lightweight-charts';
		import { sources } from '../stores';
	
		/**
		 * @type {string | HTMLElement}
		 */
		 let chartContainer;
		 let chart;
		 let chartSeries = {};
		 
		onMount(() => {
			chart = createChart(chartContainer, {
				layout: { backgroundColor: '#1A1F2D', textColor: '#D1D4DC' },
				grid: { vertLines: { color: '#2A2E39' }, horzLines: { color: '#2A2E39' } },
				timeScale: { timeVisible: true, secondsVisible: true },
				legend: { visible: true, vertAlign: 'top', horzAlign: 'left' }
			});
	
			const subscription = sources.subscribe(allSources => {
				for (const [id, sourceData] of Object.entries(allSources)) {
					if (!chartSeries[id]) {
						chartSeries[id] = chart.addLineSeries({
							color: sourceData.color,
							lineWidth: 2,
							title: `${sourceData.broker} (${id})`
						});
					}
					// Pass the whole array of ticks to setSeriesData for efficiency
					if (sourceData.ticks.length > 0) {
						const latestTick = sourceData.ticks[sourceData.ticks.length -1];
						chartSeries[id].update(latestTick);
					}
				}
			});
	
			// Ensure chart resizes with window
			// @ts-ignore
			const handleResize = () => chart.resize(chartContainer.clientWidth, chartContainer.clientHeight);
			window.addEventListener('resize', handleResize);
	
			return () => {
				subscription();
				window.removeEventListener('resize', handleResize);
				chart.remove();
			};
		});
	</script>
	
	<div bind:this={chartContainer} class="w-full h-full"></div>