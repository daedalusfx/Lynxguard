<script>
	import { createEventDispatcher } from 'svelte';
	import { ShieldAlert, AlertTriangle, Info } from 'lucide-svelte';

	export let alert;
	const dispatch = createEventDispatcher();

	const alertDetails = {
		Price_Deviation_Spike: { title: 'تخلف: اختلاف قیمت شدید', icon: ShieldAlert },
	};
	
	const template = alertDetails[alert.alertType] || { title: alert.alertType, icon: AlertTriangle };

	const severityClasses = {
		'Critical': 'text-red-400 bg-red-900/30',
		'Warning': 'text-amber-400 bg-amber-900/30',
		'Info': 'text-sky-400 bg-sky-900/30'
	};
	
	function handleClick() {
		dispatch('openModal', alert);
	}
</script>

<div on:click={handleClick} class="flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-700/50 {severityClasses[alert.severity]}"
	role="button"
	tabindex="0"
	on:keydown={(e) => e.key === 'Enter' && handleClick()}
>
	<svelte:component this={template.icon} class="w-5 h-5 mt-1" />
	<div>
		<h3 class="font-bold">{template.title} <span class="text-xs font-light text-gray-400">({alert.sourceIdentifier})</span></h3>
		<p class="text-sm text-gray-300">{alert.message}</p>
		<p class="text-xs text-gray-500 mt-1">{new Date(alert.timestamp).toLocaleString('fa-IR')}</p>
	</div>
</div>