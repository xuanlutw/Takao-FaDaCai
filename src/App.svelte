<script lang="ts">
    import { onMount } from 'svelte';

    const sqrt3   = 1.732050808;
    const sqrt3_2 = sqrt3 / 2.;
    const diff_x  = [0, sqrt3_2, sqrt3_2, 0, -sqrt3_2, -sqrt3_2];
    const diff_y  = [1, 0.5,     -0.5,   -1, -0.5,     0.5];

    const land_profile = [{'name': '海', 'color': '#0ADFDF', 'tax': 0, 'price': 0},
                          {'name': '綠', 'color': '#0FFF0F', 'tax': 0, 'price': 0},
                          {'name': '軍', 'color': '#6F6F6F', 'tax': 0, 'price': 0},
                          {'name': '農', 'color': '#FFFFFF', 'tax': 0, 'price': 0.1},
                          {'name': '住', 'color': '#FFFF0F', 'tax': 1, 'price': 2},
                          {'name': '商', 'color': '#FF5F0F', 'tax': 2, 'price': 10},
                          {'name': '重', 'color': '#AF00AF', 'tax': 5, 'price': 5}];

    const rail_profile = [{'name': '未成線', 'color': '#CFCFCF', 'tax': 0,   'price': 0},
                          {'name': '炱鐵',   'color': '#0F0FFF', 'tax': 0.5, 'price': 0},
                          {'name': '公路',   'color': '#FF0A0A', 'tax': 0.1, 'price': 0}]

    let canvas;
    let a;
    let map_info = {};
    let budget;
    let budget_remain = 0.;
    let budget_rate   = 0.;
    let land_price
    let tmp_rail = {};

    onMount(() => init())
    $: draw(map_info, tmp_rail)
    $: budget_rate = (budget - budget_remain) / budget * 100
    $: comp_land_price(map_info)

    // state = 0, 土地變更
    // state = 1, 建設交通線
    let state;
    let land_button = []
    let rail_button = []
    function set_state(new_state) {
        for (let i = 0; i < map_info.r; ++i)
            for (let j = 0; j < map_info.c; ++j)
                map_info.land[i][j].selected = 0;
        tmp_rail.r    = []
        tmp_rail.c    = []
        tmp_rail.type = 0

        state = new_state

        if (state == 0) {
            for (let i = 0; i < land_button.length; ++i)
                land_button[i].disabled = ""
            for (let i = 0; i < rail_button.length; ++i)
                rail_button[i].disabled = "disabled"
        }
        if (state == 1) {
            for (let i = 0; i < land_button.length; ++i)
                land_button[i].disabled = "disabled"
            for (let i = 0; i < rail_button.length; ++i)
                rail_button[i].disabled = ""
        }
    }

    async function init() {
        const res       = await fetch('./init.json');
        const init_info = await res.json();

        /*map_info.c = 45;*/
        /*map_info.r = 36;*/
        map_info.c = 42;
        map_info.r = 33;
        map_info.land = [];
        for (let i = 0; i < map_info.r; ++i) {
            map_info.land[i] = [];
            for (let j = 0; j < map_info.c; ++j) {
                map_info.land[i][j]          = {};
                map_info.land[i][j].r        = i;
                map_info.land[i][j].c        = j;
                map_info.land[i][j].selected = 0;

                if (typeof init_info.land[i]    === 'undefined' ||
                    typeof init_info.land[i][j] === 'undefined')
                    map_info.land[i][j].type = 3
                else
                    map_info.land[i][j].type = init_info.land[i][j];
                /*if (i < 20)*/
                    /*map_info.land[i][j].type     = 1;*/
                /*else*/
                    /*map_info.land[i][j].type     = 0;*/
            }
        }
        map_info.rail = init_info.rail
        /*map_info.rail = [{'r': [17, 17, 11], 'c': [21, 30 ,30], 'type': 1}]*/

        canvas.addEventListener('click', (e) => click_h(e))

        budget        = 100.
        budget_remain = 100.

        set_state(0)
    }

    function click_h(e) {
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // No padding, No scaling
        const xx = (x / a - sqrt3) / sqrt3;
        const yy = (y / a - 1.5) / 1.5;
        const r1 = Math.floor(yy);
        const r2 = r1 + 1;
        const c1 = Math.floor(xx - 1 * (r1 % 2));
        const c2 = Math.floor(xx - 1 * (r2 % 2));
        const c3 = c1 + 1;
        const c4 = c2 + 1;
        const rs = [r1, r1, r2, r2];
        const cs = [c1, c3, c2, c4];

        let max = 1000000;
        let remain;
        let r;
        let c;

        for (let i = 0; i < 4; ++i) {
            const remain = (xx - cs[i]) * (xx - cs[i]) + (yy - rs[i]) * (yy - rs[i]);
            if (remain < max) {
                r = rs[i]
                c = cs[i]
                max = remain;
            }
        }

        if (state == 0)
            map_info.land[r][c].selected = 1 - map_info.land[r][c].selected;
        if (state == 1) {
            tmp_rail.r[tmp_rail.r.length] = r
            tmp_rail.c[tmp_rail.c.length] = c
        }
    }

    function convert(type) {
        for (let i = 0; i < map_info.r; ++i)
            for (let j = 0; j < map_info.c; ++j)
                if (map_info.land[i][j].selected) {
                    map_info.land[i][j].type = type
                    budget_remain -= land_profile[type].tax
                }
        set_state(0)
    }

    function build(type) {
        if (tmp_rail.r.length > 1) {
            map_info.rail[map_info.rail.length] = {'r': tmp_rail.r,
                                                   'c': tmp_rail.c,
                                                   'type': type}
            console.log(tmp_rail.r, tmp_rail.c, type)
            let len = 0;
            for (let i = 1; i < tmp_rail.r.length; ++i)
                len += Math.sqrt((tmp_rail.r[i] - tmp_rail.r[i - 1]) * (tmp_rail.r[i] - tmp_rail.r[i - 1]) +
                                 (tmp_rail.c[i] - tmp_rail.c[i - 1]) * (tmp_rail.c[i] - tmp_rail.c[i - 1]))
            budget_remain -= len * rail_profile[type].tax
        }
        set_state(1)
    }

    function comp_land_price() {
        land_price = 0;
        for (let i = 0; i < map_info.r; ++i)
            for (let j = 0; j < map_info.c; ++j)
                land_price += land_profile[map_info.land[i][j].type].price
    }

    function grid_to_hex_center(r, c) {
        const x = sqrt3 * c + sqrt3 + sqrt3_2 * (r % 2);
        const y = 1.5 * r + 1.5;
        return {'x': x, 'y': y}
    }

    function draw_hex(land, type) {
        const ctx    = canvas.getContext('2d');
        const center = grid_to_hex_center(land.r, land.c)
        const cx     = center.x
        const cy     = center.y

        ctx.beginPath();
        ctx.moveTo(a * (cx + diff_x[5]), a * (cy + diff_y[5]));
        for (let i = 0; i < 6; ++i)
            ctx.lineTo(a * (cx + diff_x[i]), a * (cy + diff_y[i]));
        ctx.closePath();

        if (type == 'f') {
            ctx.fillStyle   = land_profile[land.type].color;
            ctx.fill()
            ctx.lineWidth   = 1;
            ctx.strokeStyle = '#AFAFAF';
            ctx.setLineDash([])
            ctx.stroke()
        }
        if (type == 'e' && land.selected) {
            ctx.lineWidth   = 2;
            ctx.strokeStyle = '#000000';
            /*ctx.setLineDash([3, 3])*/
            ctx.setLineDash([])
            ctx.stroke()
        }
        if (type == 'r') {
            ctx.lineWidth   = 2;
            ctx.strokeStyle = '#000000';
            ctx.setLineDash([3, 3])
            /*ctx.setLineDash([])*/
            ctx.stroke()
        }
    }
    
    function draw_rail(rail) {
        const ctx    = canvas.getContext('2d');
        const center = rail.r.map((_, idx) => grid_to_hex_center(rail.r[idx], rail.c[idx]))
        
        if (center.length == 0)
            return

        ctx.beginPath();
        ctx.moveTo(a * center[0].x, a * center[0].y);
        for (let i = 1; i < center.length; ++i)
            ctx.lineTo(a * center[i].x, a * center[i].y);

        ctx.lineWidth   = 3;
        ctx.strokeStyle = rail_profile[rail.type].color;
        ctx.setLineDash([])
        ctx.stroke()

        if (rail.type == 0)
            draw_hex(map_info.land[rail.r[rail.r.length - 1]][rail.c[rail.r.length - 1]], 'r')
    }

    function draw() {
        if (typeof canvas === 'undefined')
            return;

        // Suppose 45 * 36
        // Clear and init
        const ctx     = canvas.getContext('2d');
        a             = window.innerHeight / 55;
        canvas.width  = 75 * a;
        canvas.height = 52 * a;
        ctx.clearRect(0, 0, 100 * a, 100 * a);

        for (let i = 0; i < map_info.r; ++i)
            for (let j = 0; j < map_info.c; ++j)
                draw_hex(map_info.land[i][j], 'f');
        for (let i = 0; i < map_info.r; ++i)
            for (let j = 0; j < map_info.c; ++j)
                draw_hex(map_info.land[i][j], 'e');

        for (let i = 0; i < map_info.rail.length; ++i)
            draw_rail(map_info.rail[i]);
        draw_rail(tmp_rail)
    }

</script>

<main>
    <div style="float: left;">
        <canvas bind:this = {canvas}> </canvas>
    </div>
    <div style="float: right; text-align:left;">
        <h1> TAKAO Fa Da Cai .</h1>
        <h2> v0.2</h2>

        <table>
            <tr>
                <th> 預算： </th>
                <th> {budget_remain.toFixed(1)}/{budget} </th>
            </tr>
            <tr>
                <th> 執行率： </th>
                <th> {budget_rate.toFixed(1)}% </th>
            </tr>
            <tr>
                <th> 公告現值： </th>
                <th> {land_price.toFixed(1)} </th>
            </tr>
        </table>
        <table>
            <tr>
                <th><button on:click={() => set_state(0)}>變更土地分區</button></th>
                <th><button bind:this={land_button[0]} on:click={() => convert(4)}>住宅區</button></th>
            </tr>
            <tr>
                <th></th>
                <th><button bind:this={land_button[1]} on:click={() => convert(5)}>商業區</button></th>
            </tr>
            <tr>
                <th></th>
                <th><button bind:this={land_button[2]} on:click={() => convert(6)}>重工業區</button></th>
            </tr>
            <tr>
                <th><button on:click={() => set_state(1)}>建設交通線</button></th>
                <th><button bind:this={rail_button[1]} on:click={() => build(1)}>炱鐵</button></th>
            </tr>
            <tr>
                <th></th>
                <th><button bind:this={rail_button[0]} on:click={() => build(2)}>道路</button></th>
            </tr>
            <tr>
                <th><button on:click={() => set_state(state)}>清空選取</button></th>
            </tr>
            <tr>
                <th>
                    <a class="github-button" href="https://github.com/xuanlutw" aria-label="Follow @xuanlutw on GitHub">@xuanlutw</a>
                    <script async defer src="https://buttons.github.io/buttons.js"></script>
                </th>
            </tr>
        </table>
    </div>
</main>

<style>
</style>
