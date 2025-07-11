<script>
    export let broker;
    export let color;
</script>

<div class="flex items-center gap-2">
    <span class="w-3 h-3 rounded-full" style="background-color: {color};"></span>
    <span class="text-sm font-medium">{broker}</span>
</div>