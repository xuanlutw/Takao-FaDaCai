<script lang="ts">
    import { onMount } from 'svelte';

    const sqrt3   = 1.732050808;
    const sqrt3_2 = sqrt3 / 2.;
    const diff_x  = [0, sqrt3_2, sqrt3_2, 0, -sqrt3_2, -sqrt3_2];
    const diff_y  = [1, 0.5,     -0.5,   -1, -0.5,     0.5];

    const land_profile = [{'name': '海', 'color': '#00FFFF', 'tax': 0, 'price': 0},
                          {'name': '農', 'color': '#FFFFFF', 'tax': 0, 'price': 0.1},
                          {'name': '住', 'color': '#FFAFFF', 'tax': 1, 'price': 2},
                          {'name': '商', 'color': '#FFFFAF', 'tax': 2, 'price': 10}];

    let canvas;
    let a;
    let map_info = {};
    let budget;
    let budget_remain;
    let budget_rate;
    let land_price

    onMount(() => init())
    $: draw(map_info)
    $: budget_rate = (budget - budget_remain) / budget * 100
    $: comp_land_price(map_info)

    function init() {
        map_info.c = 45;
        map_info.r = 36;
        map_info.land = [];
        for (let i = 0; i < map_info.r; ++i) {
            map_info.land[i] = [];
            for (let j = 0; j < map_info.c; ++j) {
                map_info.land[i][j]          = {};
                map_info.land[i][j].r        = i;
                map_info.land[i][j].c        = j;
                map_info.land[i][j].selected = 0;
                if (i < 20)
                    map_info.land[i][j].type     = 1;
                else
                    map_info.land[i][j].type     = 0;
            }
        }
        canvas.addEventListener('click', (e) => click_h(e))

        budget        = 100
        budget_remain = 100
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
        map_info.land[r][c].selected = 1 - map_info.land[r][c].selected;
    }

    function convert(type) {
        for (let i = 0; i < map_info.r; ++i)
            for (let j = 0; j < map_info.c; ++j)
                if (map_info.land[i][j].selected) {
                    map_info.land[i][j].type = type
                    map_info.land[i][j].selected = 0
                    budget_remain -= land_profile[type].tax
                }
    }

    function comp_land_price() {
        land_price = 0;
        for (let i = 0; i < map_info.r; ++i)
            for (let j = 0; j < map_info.c; ++j)
                land_price += land_profile[map_info.land[i][j].type].price
    }

    function draw_hex(land, type) {
        const ctx = canvas.getContext('2d');
        const cx  = sqrt3 * land.c + sqrt3 + sqrt3_2 * (land.r % 2);
        const cy  = 1.5 * land.r + 1.5;

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
        else if (type == 'e' && land.selected) {
            ctx.lineWidth   = 2;
            ctx.strokeStyle = '#000000';
            ctx.setLineDash([3, 3])
            ctx.stroke()
        }
    }

    function draw() {
        if (typeof canvas === 'undefined')
            return;

        // Suppose 45 * 36
        // Clear and init
        const ctx     = canvas.getContext('2d');
        a             = window.innerHeight / 60;
        canvas.width  = 80 * a;
        canvas.height = 56 * a;
        ctx.clearRect(0, 0, 100 * a, 100 * a);

        for (let i = 0; i < map_info.r; ++i)
            for (let j = 0; j < map_info.c; ++j)
                draw_hex(map_info.land[i][j], 'f');
        for (let i = 0; i < map_info.r; ++i)
            for (let j = 0; j < map_info.c; ++j)
                draw_hex(map_info.land[i][j], 'e');

        ctx.beginPath();
        ctx.moveTo(0, 0)
        ctx.lineTo(0, 10)
        ctx.lineTo(10, 0)
        ctx.closePath();
    }

</script>

<main>
    <div style="float: left;">
        <canvas bind:this = {canvas}> </canvas>
    </div>
    <div style="float: right;">
        <h1> TAKAO Fa Da Cai .</h1>

        <table>
            <tr>
                <th> 預算： </th>
                <th> {budget_remain}/{budget} </th>
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
        <p><button type="button" on:click={() => convert(2)}>變更為住宅區</button></p>
        <p><button type="button" on:click={() => convert(3)}>變更為商業區</button></p>
    </div>
</main>

<style>
</style>
