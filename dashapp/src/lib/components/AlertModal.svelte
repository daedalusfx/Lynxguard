<script>
	import { createEventDispatcher } from 'svelte';
	import { ShieldAlert, AlertTriangle, Info, X, FileDown } from 'lucide-svelte';

	export let isModalOpen = false;
	export let alertData = null;

	const dispatch = createEventDispatcher();

	const alertDetails = {
		Price_Deviation_Spike: { title: 'تخلف: اختلاف قیمت شدید', icon: ShieldAlert },
	};

	const severityClasses = {
		Critical: 'text-red-400',
		Warning: 'text-amber-400',
		Info: 'text-sky-400',
	};

	$: template = alertData ? (alertDetails[alertData.alertType] || { title: alertData.alertType, icon: AlertTriangle }) : {};

	function handleKeydown(event) {
		if (event.key === 'Escape') {
			dispatch('close');
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isModalOpen && alertData}
	<div
		class="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50"
		on:click={() => dispatch('close')}
		role="dialog"
		aria-modal="true"
	>
		<div
			class="bg-[#1A1F2D] rounded-lg shadow-2xl w-full max-w-4xl p-6 border border-gray-700 transform transition-all"
			on:click|stopPropagation
		>
			<!-- Header -->
			<div class="flex justify-between items-center mb-4">
				<div class="flex items-center gap-3">
					<svelte:component this={template.icon} class="{severityClasses[alertData.severity]} w-8 h-8" />
					<div>
						<h2 class="text-2xl font-bold text-white">{template.title}</h2>
						<p class="text-sm {severityClasses[alertData.severity]}">{alertData.severity}</p>
					</div>
				</div>
				<button on:click={() => dispatch('close')} class="text-gray-400 hover:text-white">
					<X class="w-6 h-6" />
				</button>
			</div>

			<!-- Body -->
			<div class="bg-gray-800/50 p-4 rounded-lg">
				<p class="text-gray-300">{alertData.message}</p>
				<div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
					<div><strong class="text-gray-500">Source ID:</strong> <span class="font-mono">{alertData.sourceIdentifier}</span></div>
					<div><strong class="text-gray-500">زمان تخلف:</strong> <span>{new Date(alertData.timestamp).toLocaleString('fa-IR')}</span></div>
					<div><strong class="text-gray-500">نماد:</strong> <span>{alertData.symbol}</span></div>
				</div>
			</div>

			<div class="mt-4">
				<h3 class="font-bold mb-2">اسنپ‌شات داده‌ها در لحظه تخلف</h3>
				<div class="bg-gray-800/50 p-4 rounded-lg font-mono text-sm grid grid-cols-2 gap-x-8 gap-y-2">
					<div class="text-gray-400">قیمت بروکر هدف:</div><div class="text-white">{alertData.snapshot?.targetPrice}</div>
					<div class="text-gray-400">قیمت بروکر مرجع:</div><div class="text-white">{alertData.snapshot?.referencePrice}</div>
					<div class="text-gray-400">اختلاف قیمت:</div><div class="text-amber-400">{(alertData.snapshot?.priceDifference * 10000).toFixed(2)} pips</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="mt-6 flex justify-end gap-3">
				<button class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg" on:click={() => dispatch('close')}>بستن</button>
				<button class="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2">
					<FileDown class="w-4 h-4" />
					<span>تولید گزارش PDF</span>
				</button>
			</div>
		</div>
	</div>
{/if}
