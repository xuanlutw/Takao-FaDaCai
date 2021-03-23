type Coord = {
    x: number,
    y: number
};

type HCoord = {
    r: number,
    c: number
};

enum State {
    Land  = 0,
    Rail  = 1,
    Infra = 2,
};

const sqrt3: number     = 1.732050808;
const sqrt3_2: number   = sqrt3 / 2.;
const delta_x: number[] = [0., sqrt3_2, sqrt3_2, 0., -sqrt3_2, -sqrt3_2];
const delta_y: number[] = [1., 0.5,     -0.5,   -1., -0.5,     0.5];

// These classes save the properties of each land
class Rail {
    coords: HCoord[];
    type:   number;

    constructor (coords: HCoord[],
                 type: number) {
        this.coords = coords;
        this.type   = type;
    }
}

class Infra {
    coords: HCoord[];
    type:   number;

    constructor (coords: HCoord[],
                 type: number) {
        this.coords = coords;
        this.type   = type;
    }
}

// This class hold the game
export class Map {
    num_c:         number;
    num_r:         number;
    land:          number[];
    rail:          Rail[];
    infra:         Infra[];
    land_profile:  any;
    rail_profile:  any;
    infra_profile: any;

    budget:     number;
    budget_r:   number;
    nconv:      number;
    nconv_r:    number;
    land_price: number;

    constructor(init_info: {'num_c':  number,
                            'num_r':  number,
                            'budget': number,
                            'nconv':  number,
                            'land':   number[][],
                            'rail':   Rail[],
                            'infra':  Infra[],
                            'land_profile': any,
                            'rail_profile': any,
                            'infra_profile': any}) {
        this.num_c         = init_info.num_c;
        this.num_r         = init_info.num_r;
        this.budget        = init_info.budget;
        this.budget_r      = init_info.budget;
        this.nconv         = init_info.nconv;
        this.nconv_r       = init_info.nconv;
        this.land          = new Array(this.num_r * this.num_c);
        this.for_any_idx((coord, x) => this.land[x] =  init_info.land[coord.r][coord.c]);
        this.rail          = init_info.rail;
        this.infra         = init_info.infra;
        this.land_profile  = init_info.land_profile;
        this.rail_profile  = init_info.rail_profile;
        this.infra_profile = init_info.infra_profile;
        this.comp_land_price();
    }

    get_idx (coord: HCoord): number {
        return this.num_c * coord.r + coord.c;
    }

    get_land_profile (coord: HCoord): any {
        return this.land_profile[this.land[this.get_idx(coord)]];
    }

    get_rail_profile (rail: Rail): any {
        return this.rail_profile[rail.type];
    }

    get_infra_profile (infra: Infra): any {
        return this.infra_profile[infra.type];
    }

    for_any_idx (f: (_1: HCoord, _2: number) => void): void {
        for (let r = 0; r < this.num_r; ++r)
            for (let c = 0; c < this.num_c; ++c) {
                const idx: HCoord = {'r': r, 'c': c};
                f(idx, this.get_idx(idx));
            }
    }

    for_any_rail (f: (_: Rail) => void): void {
        for (let i = 0; i < this.rail.length; ++i)
            f(this.rail[i]);
    }

    for_any_infra (f: (_: Infra) => void): void {
        for (let i = 0; i < this.infra.length; ++i)
            f(this.infra[i]);
    }

    build (state: State, coords: HCoord[], new_type: number): void {
        if (state == State.Land) {
            coords.map(coord => {
                this.budget_r -= this.get_land_profile(coord).tax;
                this.nconv_r  -= 1;
                this.land[this.get_idx(coord)] = new_type});
        }
        if (state == State.Rail) {
            if (coords.length <= 1)
                return
            let new_rail: Rail = new Rail(coords, new_type);
            const len_del: number[] = coords.map((coord: HCoord, idx: number) =>
                (idx == 0)? 0: Math.sqrt(Math.pow(coord.r - coords[idx - 1].r, 2)
                                       + Math.pow(coord.c - coords[idx - 1].c, 2)));
            const len: number = len_del.reduce((acc: number, del: number) => acc + del);
            this.rail = [...this.rail, new_rail];
            this.budget_r -= len * this.get_rail_profile(new_rail).tax
        }
        if (state == State.Infra) {
            let new_infra: Infra = new Infra(coords, new_type);
            this.infra = [...this.infra, new_infra];
            this.budget_r -= coords.length * this.get_infra_profile(new_infra).tax
        }
    }

    comp_land_price (): void {
        this.land_price = 0;
        this.for_any_idx((x) => {
            this.land_price += this.get_land_profile(x).price;
        });
    }
}

// This class hold the UI and user interaction
export class Canvas {
    canvas:      any;
    ctx:         any;
    trigger:     () => void;

    map:   Map;
    a:     number;
    state: State;
    sel:   HCoord[];


    constructor(canvas:      any,
                trigger:     () => void,
                map:         Map) {
        this.canvas      = canvas;
        this.ctx         = canvas.getContext('2d');
        this.trigger     = trigger;
        this.map         = map;

        this.init_canvas();
        this.set_state(State.Land);
        this.canvas.addEventListener('click', (e: any) => this.click_h(e))
    }

    click_h (e: any): void {
        const rect: any = this.canvas.getBoundingClientRect()
        const x: number = e.clientX - rect.left
        const y: number = e.clientY - rect.top

        // No padding, No scaling
        const c: number        = (x / this.a - sqrt3) / sqrt3;
        const r: number        = (y / this.a - 1.5)   / 1.5;
        const coords: HCoord[] = [{'r': Math.floor(r),     'c': Math.floor(c - 1 * (Math.floor(r) % 2))},
                                  {'r': Math.floor(r),     'c': Math.floor(c - 1 * (Math.floor(r) % 2) + 1)},
                                  {'r': Math.floor(r + 1), 'c': Math.floor(c - 1 * (Math.floor(r + 1) % 2))},
                                  {'r': Math.floor(r + 1), 'c': Math.floor(c - 1 * (Math.floor(r + 1) % 2) + 1)}];
        const remain: number[] = coords.map((coord) => (c - coord.c) * (c - coord.c) + (r - coord.r) * (r - coord.r));
        this.sel = [...this.sel, coords[remain.indexOf(Math.min(...remain))]];
        this.trigger();
    }

    init_canvas () {
        this.a = window.innerHeight / (this.map.num_c + 10);
        this.canvas.width  = (this.map.num_c + 1) * this.a * sqrt3;
        this.canvas.height = (this.map.num_r + 1) * this.a * 1.5;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    grid_to_hex_center (coord: HCoord): Coord {
        const x: number = sqrt3 * coord.c + sqrt3 + sqrt3_2 * (coord.r % 2);
        const y: number = 1.5   * coord.r + 1.5;
        return {'x': x, 'y': y};
    }

    draw_hex (coord: HCoord, draw_type: string): void {
        const center     = this.grid_to_hex_center(coord)

        this.ctx.beginPath();
        this.ctx.moveTo(this.a * (center.x + delta_x[5]), this.a * (center.y + delta_y[5]));
        delta_x.map((_, idx: number) =>
            this.ctx.lineTo(this.a * (center.x + delta_x[idx]), this.a * (center.y + delta_y[idx])));
        this.ctx.closePath();

        // Full
        if (draw_type == 'f') {
            this.ctx.fillStyle   = this.map.get_land_profile(coord).color;
            this.ctx.fill()
            this.ctx.lineWidth   = 1;
            this.ctx.strokeStyle = '#AFAFAF';
            this.ctx.setLineDash([])
            this.ctx.stroke()
        }
        if (draw_type == 'e') {
            this.ctx.lineWidth   = 2;
            this.ctx.strokeStyle = '#000000';
            this.ctx.setLineDash([])
            this.ctx.stroke()
        }
        if (draw_type == 'r') {
            this.ctx.lineWidth   = 2;
            this.ctx.strokeStyle = '#000000';
            this.ctx.setLineDash([3, 3])
            this.ctx.stroke()
        }
    }

    draw_rail (rail: Rail): void {
        const center: Coord[] = rail.coords.map((coord: HCoord) => this.grid_to_hex_center(coord));

        if (center.length == 0)
            return

        this.ctx.beginPath();
        this.ctx.moveTo(this.a * center[0].x, this.a * center[0].y);
        center.map((coord: Coord) => this.ctx.lineTo(this.a * coord.x, this.a * coord.y));

        this.ctx.lineWidth   = 3;
        this.ctx.strokeStyle = this.map.get_rail_profile(rail).color;
        this.ctx.setLineDash([])
        this.ctx.stroke()

        if (rail.type == 0)
            this.draw_hex(rail.coords[rail.coords.length - 1], 'r');
    }

    draw_infra (infra: Infra): void {
        const center: Coord[] = infra.coords.map((coord: HCoord) => this.grid_to_hex_center(coord));

        if (center.length == 0)
            return
        
        center.map((coord: Coord) => {
            this.ctx.beginPath();
            console.log(coord.x, coord.y);
            this.ctx.arc(this.a * coord.x, this.a * coord.y, 0.5 * this.a, 0, 2 * Math.PI, true);
            this.ctx.closePath();
            this.ctx.fillStyle   = this.map.get_infra_profile(infra).color;
            this.ctx.fill()
            //this.ctx.lineWidth   = 0;
            //this.ctx.stroke()
        })
    }

    draw (): void {
        this.init_canvas();

        this.map.for_any_idx((coord, _) => this.draw_hex(coord, 'f'));
        this.map.for_any_rail((x: Rail) => this.draw_rail(x));
        this.map.for_any_infra((x: Infra) => this.draw_infra(x));

        if (this.state == State.Land)
            this.sel.map(coord => this.draw_hex(coord, 'e'));
        if (this.state == State.Rail)
            this.draw_rail(new Rail(this.sel, 0));
        if (this.state == State.Infra)
            this.sel.map(coord => this.draw_hex(coord, 'e'));
    }

    set_state(new_state: State): void {
        this.state = new_state;
        this.sel   = [];
        this.trigger();
    }

    build(new_type: number): void {
        this.map.build(this.state, this.sel, new_type);
        this.set_state(this.state);
    }
}
