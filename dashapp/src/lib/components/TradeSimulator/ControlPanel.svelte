<script>
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    // Props received from the parent component
    export let tradeButtonsEnabled = false;
    let isBuy = false
    let isSell = false
    export let adjustControlsVisible = false;
    export let activeAdjustMode = null; // 'sl', 'tp', or null

    // Functions to dispatch events to the parent
    function createTrade(type) {
      console.log(type);
      
switch (type) {
    case 'sell':
      isBuy = !isBuy;
      break;


    case 'buy':
        isSell = !isSell
        break;

    default:
        break;
}
        
        dispatch('createTrade', { type });
    }

    function adjustLine(line) {
        dispatch('adjust', { line });
    }

    function clearAll() {
        dispatch('clear');
    }
</script>

<div class="w-64 bg-gray-800 p-4 flex-shrink-0 flex flex-col space-y-4 border-r border-gray-700">
    <h2 class="text-lg font-bold text-center text-white">پنل معامله</h2>

    <!-- Buy/Sell Buttons -->
    <div class="flex flex-col space-y-3">
        <button
            on:click={() => createTrade('buy')}
            disabled={isBuy}
            class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
            خرید (Buy)
        </button>
        <button
            on:click={() => createTrade('sell')}
            disabled={isSell}
            class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
            فروش (Sell)
        </button>
    </div>

    <!-- Adjust Lines Section -->
    <div class="pt-4 border-t border-gray-700" class:hidden={!adjustControlsVisible}>
        <h3 class="text-md font-semibold text-center text-gray-300 mb-3">تنظیم خطوط</h3>
        <div class="flex flex-col space-y-3">
            <button
                on:click={() => adjustLine('sl')}
                class="text-white font-bold py-2 px-4 rounded-lg transition-colors"
                class:bg-yellow-500={activeAdjustMode === 'sl'}
                class:text-black={activeAdjustMode === 'sl'}
                class:bg-gray-600={activeAdjustMode !== 'sl'}
                class:hover:bg-gray-500={activeAdjustMode !== 'sl'}>
                تنظیم حد ضرر (SL)
            </button>
            <button
                on:click={() => adjustLine('tp')}
                class="text-white font-bold py-2 px-4 rounded-lg transition-colors"
                class:bg-yellow-500={activeAdjustMode === 'tp'}
                class:text-black={activeAdjustMode === 'tp'}
                class:bg-gray-600={activeAdjustMode !== 'tp'}
                class:hover:bg-gray-500={activeAdjustMode !== 'tp'}>
                تنظیم حد سود (TP)
            </button>
        </div>
    </div>

    <div class="flex-grow"></div> <!-- Spacer -->

    <button
        on:click={clearAll}
        class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
        پاک کردن همه چیز
    </button>
</div>
