<script>
	import { ShieldCheck } from 'lucide-svelte';
	import { connectionStatus, sources } from '$lib/stores.js';
	import SourceStatus from './SourceStatus.svelte';
</script>

<header class="flex justify-between items-center pb-4 border-b border-gray-700">
	<div class="flex items-center gap-3">
		<ShieldCheck class="text-cyan-400 w-8 h-8" />
		<div>
			<h1 class="text-2xl font-bold text-white">داشبورد نظارتی Propping Board</h1>
			{#if $connectionStatus.status === 'connected'}
				<p class="text-sm text-green-400">{$connectionStatus.message}</p>
			{:else if $connectionStatus.status === 'disconnected' || $connectionStatus.status === 'error'}
				<p class="text-sm text-red-500 animate-pulse">{$connectionStatus.message}</p>
			{:else}
				<p class="text-sm text-amber-400">{$connectionStatus.message}</p>
			{/if}
		</div>
	</div>
	<div class="flex items-center gap-6">
		{#each Object.entries($sources) as [id, source]}
			<SourceStatus broker={source.broker} color={source.color} />
		{/each}
	</div>
</header>