// These classes save the properties of each land
class Land {
    r: number;
    c: number;
    type: number;
    selected: boolean;

    constructor (r: number, 
                 c: number,
                 type: number) {
        this.r = r;
        this.c = c;
        this.type = type;
        this.selected = false;
    }
}

class Rail {
    r: number[];
    c: number[];
    type: number;

    constructor (r: number[],
                 c: number[],
                 type: number) {
        this.r = r;
        this.c = c;
        this.type = type;
    }
}

// This class hold the game
export class Map {
    num_c:          number;
    num_r:          number;
    land:           Land[];
    rail:           Rail[];
    land_profile:   any;
    rail_profile:   any;

    budget:        number;
    budget_remain: number;
    nconv:         number;
    nconv_remain:  number;
    land_price:    number;

    constructor(init_info: {'num_c':  number,
                            'num_r':  number,
                            'budget': number,
                            'nconv':  number,
                            'land':   number[][],
                            'rail':   Rail[],
                            'land_profile': any,
                            'rail_profile': any}) {
        this.num_c          = init_info.num_c;
        this.num_r          = init_info.num_r;
        this.budget         = init_info.budget;
        this.budget_remain  = init_info.budget;
        this.nconv          = init_info.nconv;
        this.nconv_remain   = init_info.nconv;
        this.land           = new Array(this.num_r * this.num_c);
        this.rail           = init_info.rail;
        this.land_profile   = init_info.land_profile;
        this.rail_profile   = init_info.rail_profile;
        this.for_any_idx((r, c, x) => this.land[x] =  new Land(r, c, init_info.land[r][c]));
        this.comp_land_price();
    }

    get_idx (r: number, c: number): number {
        return this.num_c * r + c;
    }

    get_land (r: number, c: number): Land {
        return this.land[this.get_idx(r, c)];
    }

    re_select (r:number, c: number) {
        this.get_land(r, c).selected = !this.get_land(r, c).selected;
    }

    get_land_profile (land: Land): any {
        return this.land_profile[land.type];
    }

    get_rail_profile (rail: Rail): any {
        return this.rail_profile[rail.type];
    }

    for_any_idx (f: (_1: number, _2: number, _3: number) => void) {
        for (let r = 0; r < this.num_r; ++r)
            for (let c = 0; c < this.num_c; ++c)
                f(r, c, this.get_idx(r, c));
    }

    for_any_land (f: (_: Land) => void): void {
        this.for_any_idx((_1, _2, x: number) => f(this.land[x]));
    }

    for_any_rail (f: (_: Rail) => void): void {
        for (let i = 0; i < this.rail.length; ++i)
            f(this.rail[i]);
    }

    convert (new_type: number): void {
        this.for_any_land((x: Land) => {
            if (x.selected) {
                x.type = new_type;
                this.budget_remain -= this.get_land_profile(x).tax;
                this.nconv_remain  -= 1;
            }
        })
    }

    build(tmp_rail: Rail, new_type: number): void {
        if (tmp_rail.r.length > 1) {
            tmp_rail.type = new_type;
            this.rail[this.rail.length] = tmp_rail;
            let len = 0;
            for (let i = 1; i < tmp_rail.r.length; ++i)
                len += Math.sqrt((tmp_rail.r[i] - tmp_rail.r[i - 1]) * (tmp_rail.r[i] - tmp_rail.r[i - 1]) +
                                 (tmp_rail.c[i] - tmp_rail.c[i - 1]) * (tmp_rail.c[i] - tmp_rail.c[i - 1]))
            this.budget_remain -= len * this.get_rail_profile(tmp_rail).tax
        }
    }

    comp_land_price (): void {
        this.land_price = 0;
        this.for_any_land((x) => {
            this.land_price += this.get_land_profile(x).price;
        });
    }

}

const sqrt3   = 1.732050808;
const sqrt3_2 = sqrt3 / 2.;
const diff_x  = [0, sqrt3_2, sqrt3_2, 0, -sqrt3_2, -sqrt3_2];
const diff_y  = [1, 0.5,     -0.5,   -1, -0.5,     0.5];

// This class hold the UI and user interaction
export class Canvas {
    canvas: any;
    ctx:    any;
    map:    Map;
    a:      number;
    state:  number;

    tmp_rail: Rail;

    land_button: any;
    rail_button: any;
    trigger: () => void;

    constructor(canvas: any,
                map:    Map,
                land_button: any,
                rail_button: any,
                trigger: () => void) {
        this.canvas = canvas;
        this.ctx    = this.canvas.getContext('2d');
        this.map    = map;
        this.state  = 0;
        this.land_button = land_button;
        this.rail_button = rail_button;
        this.canvas.addEventListener('click', (e: any) => this.click_h(e))
        this.update_a();
        this.trigger = trigger;
        this.set_state(0);
    }

    click_h (e: any): any {
        const rect: any = this.canvas.getBoundingClientRect()
        const x: number = e.clientX - rect.left
        const y: number = e.clientY - rect.top

        // No padding, No scaling
        const xx: number   = (x / this.a - sqrt3) / sqrt3;
        const yy: number   = (y / this.a - 1.5)   / 1.5;
        const r1: number   = Math.floor(yy);
        const r2: number   = r1 + 1;
        const c1: number   = Math.floor(xx - 1 * (r1 % 2));
        const c2: number   = Math.floor(xx - 1 * (r2 % 2));
        const c3: number   = c1 + 1;
        const c4: number   = c2 + 1;
        const rs: number[] = [r1, r1, r2, r2];
        const cs: number[] = [c1, c3, c2, c4];
        let max: number    = 1000000000;
        let r: number;
        let c: number;

        // TODO: Rewrite it by Functional
        for (let i = 0; i < 4; ++i) {
            const remain = (xx - cs[i]) * (xx - cs[i]) + (yy - rs[i]) * (yy - rs[i]);
            if (remain < max) {
                r = rs[i]
                c = cs[i]
                max = remain;
            }
        }

        // State dependent action
        if (this.state == 0)
            this.map.re_select(r, c);
        if (this.state == 1) {
            this.tmp_rail.r[this.tmp_rail.r.length] = r;
            this.tmp_rail.c[this.tmp_rail.c.length] = c;
        }
        
        this.trigger();
    }

    update_a () {
        this.a = window.innerHeight / (this.map.num_c + 10);
    }

    grid_to_hex_center(r: number, c: number): {'x': number, 'y': number} {
        const x: number = sqrt3 * c + sqrt3 + sqrt3_2 * (r % 2);
        const y: number = 1.5   * r + 1.5;
        return {'x': x, 'y': y};
    }

    draw_hex(land: Land, draw_type: string) {
        const center     = this.grid_to_hex_center(land.r, land.c)
        const cx: number = center.x
        const cy: number = center.y

        this.ctx.beginPath();
        this.ctx.moveTo(this.a * (cx + diff_x[5]), this.a * (cy + diff_y[5]));
        for (let i = 0; i < 6; ++i)
            this.ctx.lineTo(this.a * (cx + diff_x[i]), this.a * (cy + diff_y[i]));
        this.ctx.closePath();

        // Full
        if (draw_type == 'f') {
            this.ctx.fillStyle   = this.map.get_land_profile(land).color;
            this.ctx.fill()
            this.ctx.lineWidth   = 1;
            this.ctx.strokeStyle = '#AFAFAF';
            this.ctx.setLineDash([])
            this.ctx.stroke()
        }
        if (draw_type == 'e' && land.selected) {
            this.ctx.lineWidth   = 2;
            this.ctx.strokeStyle = '#000000';
            /*ctx.setLineDash([3, 3])*/
            this.ctx.setLineDash([])
            this.ctx.stroke()
        }
        if (draw_type == 'r') {
            this.ctx.lineWidth   = 2;
            this.ctx.strokeStyle = '#000000';
            this.ctx.setLineDash([3, 3])
            /*ctx.setLineDash([])*/
            this.ctx.stroke()
        }
    }

    draw_rail (rail: Rail): void {
        const center = rail.r.map((_, idx) => this.grid_to_hex_center(rail.r[idx], rail.c[idx]))

        if (center.length == 0)
            return

        this.ctx.beginPath();
        this.ctx.moveTo(this.a * center[0].x, this.a * center[0].y);
        for (let i = 1; i < center.length; ++i)
            this.ctx.lineTo(this.a * center[i].x, this.a * center[i].y);

        this.ctx.lineWidth   = 3;
        this.ctx.strokeStyle = this.map.get_rail_profile(rail).color;
        this.ctx.setLineDash([])
        this.ctx.stroke()

        if (rail.type == 0)
            this.draw_hex(this.map.get_land(rail.r[rail.r.length - 1], rail.c[rail.r.length - 1]), 'r')
    }

    draw (): void {
        // Clear and init
        this.update_a();    // Update before drawing
        this.canvas.width  = (this.map.num_c + 1) * this.a * sqrt3;
        this.canvas.height = (this.map.num_r + 1) * this.a * 1.5;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Lands
        this.map.for_any_land((x: Land) => this.draw_hex(x, 'f'));
        this.map.for_any_land((x: Land) => this.draw_hex(x, 'e'));

        // Draw Rails
        this.map.for_any_rail((x: Rail) => this.draw_rail(x));
        this.draw_rail(this.tmp_rail);
    }

    // state = 0, 土地變更
    // state = 1, 建設交通線
    set_state(new_state: number): void {
        this.state = new_state
        this.map.for_any_land((x: Land) => x.selected = false);

        this.tmp_rail = new Rail([], [], 0);

        if (this.state == 0) {
            for (let i = 0; i < this.land_button.length; ++i)
                this.land_button[i].disabled = ""
            for (let i = 0; i < this.rail_button.length; ++i)
                this.rail_button[i].disabled = "disabled"
        }
        if (this.state == 1) {
            for (let i = 0; i < this.land_button.length; ++i)
                this.land_button[i].disabled = "disabled"
            for (let i = 0; i < this.rail_button.length; ++i)
                this.rail_button[i].disabled = ""
        }
        this.map.comp_land_price();
        this.trigger();
    }

    convert (new_type: number): void {
        this.map.convert(new_type);
        this.set_state(0);
    }

    build(new_type: number): void {
        this.map.build(this.tmp_rail, new_type);
        this.set_state(1);
    }
}
