<script lang="ts">
    import { onMount }     from "svelte";
    import { Map, Canvas } from "./map";

    let tmp_rail = {};
    let map: Map;
    let canvas: Canvas;
    let canvas_obj: any;
    let land_button:any[] = []
    let rail_button:any[] = []

    let trigger_val = 1;
    /*let trigger = (f) => {*/
        /*return () => {*/
            /*f();*/
            /*console.log('HO');*/
            /*trigger_val += 1;*/
            /*if (trigger_val > 1000)*/
                /*trigger_val = 1;*/
        /*}*/
    /*}*/

    let budget        = 0;
    let budget_remain = 0;
    let nconv         = 0;
    let nconv_remain  = 0;
    let land_price    = 0;
    $: if (trigger_val) {
        if (map !== undefined) {
            budget        = map.budget;
            budget_remain = map.budget_remain;
            nconv         = map.nconv;
            nconv_remain  = map.nconv_remain;
            land_price    = map.land_price;
        }
        if (canvas !== undefined) {
            canvas.draw()
        }
        if (trigger_val > 1000)
            trigger_val = 1;
    }

    onMount(() => init())

    async function init() {
        const res       = await fetch('./init.json');
        const init_info = await res.json();

        map    = new Map(init_info);
        canvas = new Canvas(canvas_obj, 
                            map, 
                            land_button, 
                            rail_button,
                            () => {trigger_val += 1});
    }

</script>

<svelte:head>
	<title>TAKAO Fa Da Cai !</title>
</svelte:head>

<main>
    <div style="float: left;">
        <canvas bind:this = {canvas_obj}> </canvas>
    </div>
    <div style="float: right; text-align:left;">
        <h1> TAKAO Fa Da Cai !</h1>
        <h2> v0.3</h2>

        <table>
            <tr>
                <th> 預算： </th>
                <th> {budget_remain.toFixed(1)}/
                     {budget.toFixed(1)}
                </th>
            </tr>
            <tr>
                <th> 執行率： </th>
                <th> {(100 - budget_remain / budget * 100).toFixed(1)}% </th>
            </tr>
            <tr>
                <th> 變更限制： </th>
                <th> {nconv_remain}/{nconv} </th>
            </tr>
            <tr>
                <th> 公告現值： </th>
                <th> {land_price.toFixed(1)} </th>
            </tr>
        </table>
        <table>
            <tr>
                <th><button on:click={() => canvas.set_state(0)}>變更土地分區</button></th>
                <th><button bind:this={land_button[0]} on:click={() => canvas.convert(4)}>住宅區</button></th>
            </tr>
            <tr>
                <th></th>
                <th><button bind:this={land_button[1]} on:click={() => canvas.convert(5)}>商業區</button></th>
            </tr>
            <tr>
                <th></th>
                <th><button bind:this={land_button[2]} on:click={() => canvas.convert(6)}>重工業區</button></th>
            </tr>
            <tr>
                <th><button on:click={() => canvas.set_state(1)}>建設交通線</button></th>
                <th><button bind:this={rail_button[1]} on:click={() => canvas.build(1)}>炱鐵</button></th>
            </tr>
            <tr>
                <th></th>
                <th><button bind:this={rail_button[0]} on:click={() => canvas.build(2)}>道路</button></th>
            </tr>
            <tr>
                <th><button on:click={() => canvas.set_state(canvas.state)}>清空選取</button></th>
            </tr>
            <tr>
                <th>
                    <a class="github-button" href="https://github.com/xuanlutw">@xuanlutw</a>
                    <script async defer src="https://buttons.github.io/buttons.js"></script>
                </th>
            </tr>
        </table>
    </div>
</main>

<style>
</style>

