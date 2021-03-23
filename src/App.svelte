<script lang="ts">
    import { onMount }     from "svelte";
    import { Map, Canvas } from "./map";

    let tmp_rail = {};
    let map: Map;
    let canvas: Canvas;
    let canvas_obj: any;

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

    let land_profile = [];
    let land_sel = 8;
    let rail_profile = [];
    let rail_sel = 2;
    let infra_profile = [];
    let infra_sel = 2;

    let budget     = 0;
    let budget_r   = 0;
    let nconv      = 0;
    let nconv_r    = 0;
    let land_price = 0;
    let state      = 0;
    $: if (trigger_val) {
        if (map !== undefined) {
            map.comp_land_price();
            budget     = map.budget;
            budget_r   = map.budget_r;
            nconv      = map.nconv;
            nconv_r    = map.nconv_r;
            land_price = map.land_price;
        }
        if (canvas !== undefined) {
            canvas.draw();
            state = canvas.state;
        }
        if (trigger_val > 1000)
            trigger_val = 1;
    }

    onMount(() => init())

    async function init() {
        const res       = await fetch('./init.json');
        const init_info = await res.json();

        land_profile = init_info.land_profile;
        rail_profile = init_info.rail_profile;
        infra_profile = init_info.infra_profile;
        map    = new Map(init_info);
        canvas = new Canvas(canvas_obj, 
                            (() => {trigger_val += 1}),
                            map);
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
                <th> {budget_r.toFixed(1)}/
                     {budget.toFixed(1)}
                </th>
            </tr>
            <tr>
                <th> 執行率： </th>
                <th> {(100 - budget_r / budget * 100).toFixed(1)}% </th>
            </tr>
            <tr>
                <th> 變更限制： </th>
                <th> {nconv_r}/{nconv} </th>
            </tr>
            <tr>
                <th> 公告現值： </th>
                <th> {land_price.toFixed(1)} </th>
            </tr>
        </table>
        <table>
            <tr>
                <th><button on:click={() => canvas.set_state(0)}>土地分區</button></th>
                <th>
                    <select disabled={state != 0} bind:value={land_sel}>
                        {#each land_profile as profile, idx}
                            {#if profile.tax > 0}
                                <option value={idx}> {profile.name} </option>
                            {/if}
                        {/each}
                    </select>
                </th>
                <th><button disabled={state != 0} on:click={() => canvas.build(land_sel)}>變更</button></th>
            </tr>
            <tr>
                <th><button on:click={() => canvas.set_state(1)}>交通網絡</button></th>
                <th>
                    <select disabled={state != 1} bind:value={rail_sel}>
                        {#each rail_profile as profile, idx}
                            {#if profile.tax > 0}
                                <option value={idx}> {profile.name} </option>
                            {/if}
                        {/each}
                    </select>
                </th>
                <th><button disabled={state != 1} on:click={() => canvas.build(rail_sel)}>建設</button></th>
            </tr>
            <tr>
                <th><button on:click={() => canvas.set_state(2)}>基礎建設</button></th>
                <th>
                    <select disabled={state != 2} bind:value={infra_sel}>
                        {#each infra_profile as profile, idx}
                            {#if profile.tax > 0}
                                <option value={idx}> {profile.name} </option>
                            {/if}
                        {/each}
                    </select>
                </th>
                <th><button disabled={state != 2} on:click={() => canvas.build(infra_sel)}>建設</button></th>
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

