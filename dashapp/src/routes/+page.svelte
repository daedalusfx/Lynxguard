<script>
	import { onMount } from 'svelte';
	import { connectionStatus, alerts, sources, lastPrices, REFERENCE_SOURCE_ID } from '$lib/stores.js';

	// Component Imports
	import Header from '$lib/components/Header.svelte';
	import Chart from '$lib/components/Chart.svelte';
	import MetricsPanel from '$lib/components/MetricsPanel.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import AlertModal from '$lib/components/AlertModal.svelte';
	import ReportsPage from '$lib/components/ReportsPage.svelte'; // کامپوننت جدید برای تب دوم
	// import TradeSimulatorPage from '$lib/components/TradeSimulator/TradeSimulatorPage.svelte';

    // --- State for Tabs and Modal ---
    let activeTab = 'dashboard'; // 'dashboard' or 'reports'
    let isModalOpen = false;
    let selectedAlert = null;

	const COLOR_PALETTE = ['#38BDF8', '#FB923C', '#A78BFA', '#4ADE80', '#F472B6'];
	let colorIndex = 0;

	onMount(() => {
		const socket = new WebSocket('ws://localhost:5000');

		socket.onopen = () => connectionStatus.set({ message: 'اتصال به سرور برقرار است', status: 'connected' });
		socket.onclose = () => connectionStatus.set({ message: 'اتصال با سرور قطع شد!', status: 'disconnected' });
		socket.onerror = (error) => connectionStatus.set({ message: 'خطا در اتصال به سرور', status: 'error' });

		socket.onmessage = (event) => {
			const data = JSON.parse(event.data);
			if (data.type === 'tick') handleTick(data.payload);
			else if (data.type === 'new_alert') alerts.update(current => [data.payload, ...current]);
		};

		async function fetchAlerts() {
			try {
				const response = await fetch('http://localhost:5000/api/alerts');
				if (!response.ok) throw new Error('Network response was not ok');
				alerts.set(await response.json());
			} catch (error) {
				console.error('Failed to fetch alerts:', error);
			}
		}

		fetchAlerts();
		const alertInterval = setInterval(fetchAlerts, 10000);

		return () => {
			socket.close();
			clearInterval(alertInterval);
		};
	});

	function handleTick(tick) {
		const { sourceIdentifier, broker } = tick;
		sources.update(s => {
			if (!s[sourceIdentifier]) {
				const isReference = sourceIdentifier === REFERENCE_SOURCE_ID;
				const color = isReference ? '#FF6D00' : COLOR_PALETTE[colorIndex++ % COLOR_PALETTE.length];
				s[sourceIdentifier] = { broker, color, ticks: [] };
			}
			s[sourceIdentifier].ticks = [...s[sourceIdentifier].ticks, { time: tick.time_msc / 1000, value: tick.bid }];
			return s;
		});
		lastPrices.update(p => ({ ...p, [sourceIdentifier]: tick.bid }));
	}

    function openModal(event) {
        selectedAlert = event.detail;
        isModalOpen = true;
    }

    function closeModal() {
        isModalOpen = false;
        selectedAlert = null;
    }
</script>

<AlertModal {isModalOpen} alertData={selectedAlert} on:close={closeModal} />

<div class="flex h-screen p-4 gap-4">
	<main class="flex-1 flex flex-col gap-4">
		<Header />

        <!-- Tab Content -->
            <!-- Original Dashboard Content -->
            <div class="flex-1 flex gap-4 overflow-hidden">
                <div class="w-3/4 h-full bg-[#1A1F2D] rounded-lg p-2 shadow-lg">
                    <Chart />
                </div>
                <aside class="w-1/4 flex flex-col gap-4">
                    <MetricsPanel />
                </aside>
            </div>
            <div class="h-1/3 glass-effect rounded-lg p-4 flex flex-col">
                <h2 class="text-lg font-bold text-white mb-2 border-b border-gray-600 pb-2 flex-shrink-0">فید هشدارهای زنده</h2>
                <div class="flex-1 overflow-y-auto pr-2 space-y-2">
                    <!-- {#each $alerts as alert (alert.id)} -->
                    {#each $alerts as alert (alert.timestamp)}
                        <Alert {alert} on:openModal={openModal} />
                    {/each}
                </div>
            </div>
 
	</main>
</div>
