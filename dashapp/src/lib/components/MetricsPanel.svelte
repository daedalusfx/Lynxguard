<script>
	import { ArrowLeftRight } from 'lucide-svelte';
	import { sources, spreadDifferences, REFERENCE_SOURCE_ID } from '$lib/stores.js';
</script>

<div class="glass-effect p-4 rounded-lg flex-1 flex flex-col">
    <h2 class="text-lg font-bold text-white mb-4 border-b border-gray-600 pb-2">معیارهای کلیدی زنده</h2>
    <div class="space-y-5 flex-1">
        {#each Object.entries($sources) as [id, source] (id)}
            {#if id !== REFERENCE_SOURCE_ID}
                <div class="p-3 rounded-lg">
                    <div>
                        <p class="text-sm text-gray-400 flex items-center gap-2">
                            <ArrowLeftRight style="color:{source.color};" class="w-4 h-4" />
                            <span>اختلاف اسپرد ({source.broker})</span>
                        </p>
                        <p class="text-3xl font-bold text-center mt-2 text-white">
                            +{$spreadDifferences[id] || '0.0'}
                        </p>
                        <p class="text-xs text-gray-500 text-center">Pips</p>
                    </div>
                </div>
            {/if}
        {/each}
    </div>
</div>
