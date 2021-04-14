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

    let slide_state = 1;

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
            const res = canvas.comp_cost(state == 0? land_sel: state == 1? rail_sel: infra_sel);
            est_cost  = res.cost;
            est_nconv = res.nconv;
            if (slide_state == 0)
                log_str = canvas.get_log();
        }
        if (trigger_val > 1000)
            trigger_val = 1;
        if (log_str != "") {
            document.cookie = 'log=' + log_str;
        }
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

        // Check slide state
        const urlParams = new URLSearchParams(window.location.search);
        slide_state     = 1 - (urlParams.get('slide') === null);
        console.log(urlParams.get('slide'), slide_state)
        // Suppose only one cookie
        const cookies = document.cookie.split(';')[0].split('=');
        if (cookies.length == 2 && cookies[1] != "[]" && slide_state == 0) {
            canvas.exec_log(JSON.parse(cookies[1]));
        }

    }
    onMount(() => init())

    function my_build (sel) {
        if (est_cost > budget_r)
            alert("注意!你已債留子孫 ╮(╯_╰)╭")
        canvas.build(sel)
    }

    function reload () {
        if (confirm("確定重來？")) {
            document.cookie="log="
            location.reload() 
        }
    }

    let slide_log = [];
    let slide_idx = 0;
    function slide_show () {
        if (slide_state == 1) {
            slide_log = JSON.parse(log_str);
            slide_state = 2;
        }
        console.log(log_str)
        console.log(slide_log)
        console.log(slide_idx)
        if (slide_idx < slide_log.length) {
            canvas.exec_log_s(slide_log[slide_idx])
            slide_idx += 1;
        }
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
        <h2> v0.4</h2>

        <table>
            <tr>
                <th> </th>
                <th> 預估   </th>
                <th> 剩餘   </th>
                <th> 上限   </th>
                <th> 執行率 </th>
            </tr>
            <tr>
                <th> 預算： </th>
                <th> {est_cost.toFixed(1)} </th>
                <th> {budget_r.toFixed(0)} </th>
                <th> {budget.toFixed(0)}   </th>
                <th> {(100 - budget_r / budget * 100).toFixed(1)}% </th>
            </tr>
            <tr>
                <th> 變更限制：  </th>
                <th> {est_nconv} </th>
                <th> {nconv_r}   </th>
                <th> {nconv}     </th>
            </tr>
            {#if slide_state != 0}
            <tr>
                <th> 公告現值： </th>
                <th> {land_price.toFixed(1)} </th>
            </tr>
            <tr>
                <th colspan=3>
                    第 {stage_count + 1} 階段 - {stage_count == 0? "黑暗": 
                                                 stage_count == 1? "封建": 
                                                 stage_count == 2? "城堡": 
                                                                   "發大財"}時代
                </th>
            </tr>
            {/if}
        </table>

        {#if slide_state == 0}
        <table>
            <tr>
                <th colspan=2>
                    第 {stage_count + 1} 階段 - {stage_count == 0? "黑暗": 
                                                 stage_count == 1? "封建": 
                                                 stage_count == 2? "城堡": 
                                                                   "發大財"}時代
                </th>
                <th><button disabled={stage_count==nstage-1} 
                            on:click={() => confirm("確定升級？")? canvas.update_stage(): 0}>升級</button></th>
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
                <th><button disabled={state != 0 || stage_count > 2}
                            on:click={() => my_build(land_sel)}>變更</button></th>
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
                <th><button disabled={state != 1 || stage_count > 2} 
                            on:click={() => my_build(rail_sel)}>建設</button></th>
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
                <th><button disabled={state != 2 || stage_count > 2} 
                            on:click={() => my_build(infra_sel)}>建設</button></th>
            </tr>
            <tr>
                <th><button on:click={() => canvas.set_state(3)}>拆除網絡</button></th>
                <th> </th>
                <th><button disabled={state != 3 || stage_count > 2} 
                            on:click={() => my_build(infra_sel)}>拆！</button></th>
            </tr>
            <tr>
                <th><button on:click={() => canvas.set_state(4)}>拆除建設</button></th>
                <th> </th>
                <th><button disabled={state != 4 || stage_count > 2} 
                            on:click={() => my_build(infra_sel)}>拆！</button></th>
            </tr>
            <tr>
                <th><button on:click={() => canvas.set_state(canvas.state)}>清空選取</button></th>
                <th> </th>
                <th>
                    <button on:click={reload}>
                        重來
                    </button>
                </th>
            </tr>
            <tr>
                <th colspan="3">
                    <textarea style={'visibility:' + (stage_count==nstage-1? 'visible': 'hidden')} rows="4">
                        {log_str}
                    </textarea>
                </th>
            </tr>
            <tr>
                <th>
                    <a class="github-button" href="https://github.com/xuanlutw">@xuanlutw</a>
                    <script async defer src="https://buttons.github.io/buttons.js"></script>
                </th>
            </tr>
        </table>
        {:else}
        <table>
            <tr>
                <th colspan="3">
                    <textarea disabled={slide_state != 1} bind:value={log_str} rows="4"></textarea>
                </th>
            </tr>
            <tr>
                <th><button on:click={() => slide_show()}>下一步</button></th>
            </tr>
            <tr>
                <th>
                    <a class="github-button" href="https://github.com/xuanlutw">@xuanlutw</a>
                    <script async defer src="https://buttons.github.io/buttons.js"></script>
                </th>
            </tr>
        </table>
        {/if}
    </div>
</main>
