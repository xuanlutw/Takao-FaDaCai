<script lang="ts">
    import { onMount }     from "svelte";
    import { Map, Canvas } from "./map";

    let tmp_rail = {};
    let map: Map;
    let canvas: Canvas;
    let canvas_obj: any;

    let trigger_val = 1;

    let nstage        = 0;
    let stage         = [];
    let land_profile  = [];
    let rail_profile  = [];
    let infra_profile = [];
    let land_sel;
    let rail_sel;
    let infra_sel;

    let budget     = 0;
    let budget_r   = 0;
    let nconv      = 0;
    let nconv_r    = 0;
    let est_cost   = 0;
    let est_nconv  = 0;
    let land_price = 0;
    let state      = 0;
    let stage_count= 0;
    let log_str    = "";
    $: if (trigger_val) {
        if (map !== undefined) {
            budget        = map.budget;
            budget_r      = map.budget_r;
            nconv         = map.nconv;
            nconv_r       = map.nconv_r;
            land_price    = map.land_price;
            stage_count   = map.stage_count;
            land_profile  = stage[stage_count].land_profile;
            rail_profile  = stage[stage_count].rail_profile;
            infra_profile = stage[stage_count].infra_profile;
        }
        if (canvas !== undefined) {
            canvas.draw();
            state   = canvas.state;
            log_str = canvas.get_log();
            const res = canvas.comp_cost(state == 0? land_sel: state == 1? rail_sel: infra_sel);
            est_cost  = res.cost;
            est_nconv = res.nconv;
        }
        if (trigger_val > 1000)
            trigger_val = 1;
    }

    async function init() {
        const res       = await fetch('./init.json');
        const init_info = await res.json();

        nstage = init_info.nstage;
        stage  = init_info.stage;
        map    = new Map(init_info.map,
                         init_info.nstage,
                         init_info.stage);
        canvas = new Canvas(canvas_obj, 
                            (() => {trigger_val += 1}),
                            map);
        land_sel  = stage[0].land_profile.findIndex((x) => x.tax > 0);
        rail_sel  = stage[0].rail_profile.findIndex((x) => x.tax > 0);
        infra_sel = stage[0].infra_profile.findIndex((x) => x.tax > 0);
    }
    onMount(() => init())

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
        <h2> v0.3.2</h2>

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
                <th> 預估花費 </th>
                <th> {est_cost.toFixed(1)} </th>
            </tr>
            <tr>
                <th> 預估變更 </th>
                <th> {est_nconv} </th>
            </tr>
            <!---<tr>
                <th> 公告現值： </th>
                <th> {land_price.toFixed(1)} </th>
            </tr>--->
        </table>
        <table>
            <tr>
                <th colspan=2>
                    <p>
                    {stage_count + 1} <del>{stage_count == 0? "黑暗": 
                                            stage_count == 1? "封建": 
                                            stage_count == 2? "城堡": 
                                                              "發大財"}時代</del>
                    </p>
                </th>
                <th><button disabled={stage_count==nstage-1} on:click={() => canvas.update_stage()}>升級</button></th>
            </tr>
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
                <th><button on:click={() => canvas.set_state(3)}>拆除網絡</button></th>
                <th> </th>
                <th><button disabled={state != 3} on:click={() => canvas.build(infra_sel)}>拆！</button></th>
            </tr>
            <tr>
                <th><button on:click={() => canvas.set_state(4)}>拆除建設</button></th>
                <th> </th>
                <th><button disabled={state != 4} on:click={() => canvas.build(infra_sel)}>拆！</button></th>
            </tr>
            <tr>
                <th><button on:click={() => canvas.set_state(canvas.state)}>清空選取</button></th>
            </tr>
            <tr>
                <th colspan="3">
                    <textarea style={'visibility:' + (stage_count==nstage-1? 'visible': 'hidden')} rows="4"> {log_str} </textarea>
                </th>
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
