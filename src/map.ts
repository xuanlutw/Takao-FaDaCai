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
    DelR  = 3,
    DelI  = 4,
    Stage = 5,
};

const sqrt3: number     = 1.732050808;
const sqrt3_2: number   = sqrt3 / 2.;
const delta_x: number[] = [0., sqrt3_2, sqrt3_2, 0., -sqrt3_2, -sqrt3_2];
const delta_y: number[] = [1., 0.5,     -0.5,   -1., -0.5,     0.5];

function grid_to_hex_center (coord: HCoord): Coord {
    const x: number = sqrt3 * coord.c + sqrt3 + sqrt3_2 * (coord.r % 2);
    const y: number = 1.5   * coord.r + 1.5;
    return {'x': x, 'y': y};
}

function HCoord_eq (x: HCoord, y: HCoord): boolean {
    return x.r == y.r && x.c == y.c;
}

//v log
//v stage
//v aspect rate
//v destroy
//show
//cookie
//v ui
// TRA  Blue
// MRT  Yellow
// LR   Green
// Road Red

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

    nstage:        number;
    stage_count:   number;
    stage:         any[];
    land_profile:  any;
    rail_profile:  any;
    infra_profile: any;

    budget:     number;
    budget_r:   number;
    nconv:      number;
    nconv_r:    number;
    land_price: number;

    constructor(map:   {'num_c':  number,
                        'num_r':  number,
                        'land':   number[][],
                        'rail':   Rail[],
                        'infra':  Infra[] },
                nstage: number,
                stage: {'budget': number,
                        'nconv':  number,
                        'land_profile': any,
                        'rail_profile': any,
                        'infra_profile': any}[]) {
        this.num_c = map.num_c;
        this.num_r = map.num_r;
        this.rail  = map.rail;
        this.infra = map.infra;
        this.land  = new Array(this.num_r * this.num_c);
        this.for_any_idx((coord, x) => this.land[x] =  map.land[coord.r][coord.c]);

        this.nstage      = nstage;
        this.stage       = stage;
        this.stage_count = -1;
        this.update_stage();
    }

    update_stage (): void {
        this.stage_count += 1;
        this.budget        = this.stage[this.stage_count].budget;
        this.budget_r      = this.stage[this.stage_count].budget;
        this.nconv         = this.stage[this.stage_count].nconv;
        this.nconv_r       = this.stage[this.stage_count].nconv;
        this.land_profile  = this.stage[this.stage_count].land_profile;
        this.rail_profile  = this.stage[this.stage_count].rail_profile;
        this.infra_profile = this.stage[this.stage_count].infra_profile;
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

    comp_cost (state: State, coords: HCoord[], ntype: number): {"cost": number, "nconv": number} {
        let cost:  number = 0;
        let nconv: number = 0;
        if (state == State.Land) {
            coords.map(_ => {
                cost  += this.land_profile[ntype].tax;
                nconv += 1;});
        }
        if (state == State.Rail && coords.length > 1) {
            let new_rail: Rail = new Rail(coords, ntype);
            let coords_xy: Coord[] = coords.map(grid_to_hex_center);
            const len_del: number[] = coords_xy.map((coord: Coord, idx: number) =>
                (idx == 0)? 0: Math.sqrt(Math.pow(coord.x - coords_xy[idx - 1].x, 2)
                                       + Math.pow(coord.y - coords_xy[idx - 1].y, 2)));
            const len: number = len_del.reduce((acc: number, del: number) => acc + del) / sqrt3;
            cost = len * this.get_rail_profile(new_rail).tax
        }
        if (state == State.Infra) {
            let new_infra: Infra = new Infra(coords, ntype);
            cost = coords.length * this.get_infra_profile(new_infra).tax
        }
        return {"cost": cost, "nconv": nconv};
    }

    build (state: State, coords: HCoord[], ntype: number): void {
        if (state == State.Land) {
            coords.map(coord => this.land[this.get_idx(coord)] = ntype);
        }
        if (state == State.Rail) {
            if (coords.length <= 1)
                return
            let new_rail: Rail = new Rail(coords, ntype);
            this.rail = [...this.rail, new_rail];
        }
        if (state == State.Infra) {
            let new_infra: Infra = new Infra(coords, ntype);
            this.infra = [...this.infra, new_infra];
        }
        if (state == State.DelR) {
            if (coords.length != 2) 
                return;

            let split_rail: Rail[] = [];
            this.rail.map(item => {
                const idx1 = item.coords.findIndex(x => HCoord_eq(x, coords[0]));
                const idx2 = item.coords.findIndex(x => HCoord_eq(x, coords[1]));
                if (idx1 != -1 && idx2 != -1) {
                    const coords1 = item.coords.filter((_, idx: number) => idx <= Math.min(idx1, idx2));
                    const coords2 = item.coords.filter((_, idx: number) => idx >= Math.max(idx1, idx2));
                    item.coords   = coords1;
                    split_rail    = [...split_rail, {"coords": coords2,
                                                     "type":   item.type}];
                }
            })
            this.rail = [...this.rail, ...split_rail].filter(x => x.coords.length > 0);
        }
        if (state == State.DelI) {
            this.infra.map(item => item.coords = item.coords.filter(coord => 
                !coords.some(x => HCoord_eq(x, coord))));
            this.infra = this.infra.filter(x => x.coords.length > 0);
        }
        let res = this.comp_cost(state, coords, ntype);
        let cost  = res.cost;
        let nconv = res.nconv;
        this.budget_r -= cost;
        this.nconv_r  -= nconv;
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
    log:   {"state":  State,
            "coords": HCoord[],
            "type":   Number}[];


    constructor(canvas:  any,
                trigger: () => void,
                map:     Map) {
        this.canvas      = canvas;
        this.ctx         = canvas.getContext('2d');
        this.trigger     = trigger;
        this.map         = map;

        this.init_canvas();
        this.set_state(State.Land);
        this.log = [];
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
        const coord: HCoord    = coords[remain.indexOf(Math.min(...remain))];

        this.update_sel(coord);
        this.trigger();
    }

    update_sel (coord: HCoord): void {
        if (this.state == State.Land || this.state == State.Infra) {
            if (this.sel.some(x => HCoord_eq(x, coord)))
                this.sel = this.sel.filter(x => !HCoord_eq(x, coord));
            else
                this.sel = [...this.sel, coord];
        }
        if (this.state == State.Rail) {
            if (this.sel.length > 0 && HCoord_eq(this.sel[this.sel.length - 1], coord))
                this.sel.pop();
            else
                this.sel = [...this.sel, coord];
        }
        if (this.state == State.DelR) {
            if (this.sel.some(x => HCoord_eq(x, coord)))
                this.sel = this.sel.filter(x => !HCoord_eq(x, coord));
            else {
                let flag: boolean = false;
                if (this.sel.length == 0) {
                    this.map.rail.map(item => {
                        if (item.coords.some(x => HCoord_eq(x, coord)))
                            flag = true;
                    });
                }
                if (this.sel.length == 1) {
                    this.map.rail.map(item => {
                        let idx1 = item.coords.findIndex(x => HCoord_eq(x, this.sel[0]));
                        let idx2 = item.coords.findIndex(x => HCoord_eq(x, coord));
                        if (idx1 != -1 && idx2 != -1 && Math.abs(idx1 - idx2) == 1)
                            flag = true;
                    })
                }
                if (flag)
                    this.sel = [...this.sel, coord];
            }
        }
        if (this.state == State.DelI) {
            const pre_len: number = this.sel.length;
            this.sel = this.sel.filter((item: HCoord) => item.r != coord.r || item.c != coord.c);
            if (this.sel.length == pre_len) {
                let flag: boolean = false;
                this.map.infra.map(item => {
                    if (item.coords.some(x => HCoord_eq(x, coord)))
                        flag = true;
                })
                if (flag)
                    this.sel = [...this.sel, coord];
            }
        }
    }

    init_canvas () {
        this.a = Math.min((window.innerHeight)      / ((this.map.num_r + 2) * 1.5),
                          (window.innerWidth - 300) / ((this.map.num_c + 2) * sqrt3));
        this.canvas.width  = (this.map.num_c + 1.5) * this.a * sqrt3;
        this.canvas.height = (this.map.num_r + 1.5) * this.a * 1.5;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw_hex (coord: HCoord, draw_type: string): void {
        const center     = grid_to_hex_center(coord)

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
        const center: Coord[] = rail.coords.map((coord: HCoord) => grid_to_hex_center(coord));

        if (center.length == 0)
            return

        this.ctx.beginPath();
        this.ctx.moveTo(this.a * center[0].x, this.a * center[0].y);
        center.map((coord: Coord) => this.ctx.lineTo(this.a * coord.x, this.a * coord.y));

        this.ctx.lineWidth   = this.map.get_rail_profile(rail).width;
        this.ctx.strokeStyle = this.map.get_rail_profile(rail).color;
        this.ctx.setLineDash(this.map.get_rail_profile(rail).dash)
        this.ctx.stroke()

        if (rail.type == 0)
            this.draw_hex(rail.coords[rail.coords.length - 1], 'r');
    }

    draw_infra (infra: Infra): void {
        const center: Coord[] = infra.coords.map((coord: HCoord) => grid_to_hex_center(coord));

        if (center.length == 0)
            return
        
        center.map((coord: Coord) => {
            this.ctx.fillStyle = this.map.get_infra_profile(infra).color;
            if (this.map.get_infra_profile(infra).text == " ") {
                this.ctx.beginPath();
                this.ctx.arc(this.a * coord.x, this.a * coord.y, 0.5 * this.a, 0, 2 * Math.PI, true);
                this.ctx.closePath();
                this.ctx.fill()
            }
            else {
                this.ctx.font = this.a + "px Sans";
                this.ctx.fillText(this.map.get_infra_profile(infra).text, this.a * (coord.x - 0.5), this.a * (coord.y + 0.4));
            }
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
        if (this.state == State.DelR) {
            if (this.sel.length == 0) {
                this.map.rail.map(item => item.coords.map(coord => this.draw_hex(coord, 'r') ));
            }
            if (this.sel.length == 1) {
                this.draw_hex(this.sel[0], 'e');
                this.map.rail.map(item => {
                    let idx = item.coords.findIndex(x => HCoord_eq(x, this.sel[0]))
                    if (idx != -1 && idx != 0)
                        this.draw_hex(item.coords[idx - 1], 'r');
                    if (idx != -1 && idx != item.coords.length - 1)
                        this.draw_hex(item.coords[idx + 1], 'r');
                })
            }
            if (this.sel.length == 2) {
                this.draw_hex(this.sel[0], 'e');
                this.draw_hex(this.sel[1], 'e');
            }
        }
        if (this.state == State.DelI) {
            this.map.infra.map(item => item.coords.map(coord => {
                if (!this.sel.some(x => HCoord_eq(x, coord)))
                    this.draw_hex(coord, 'r');
                else
                    this.draw_hex(coord, 'e');
            }));
        }
    }

    set_state (new_state: State): void {
        this.state = new_state;
        this.sel   = [];
        this.trigger();
    }

    comp_cost (ntype: number): {cost: number, nconv: number} {
        return this.map.comp_cost(this.state, this.sel, ntype);
    }

    build (ntype: number): void {
        this.map.build(this.state, this.sel, ntype);
        this.log = [...this.log, {"state":  this.state,
                                  "coords": this.sel, 
                                  "type":   ntype}];
        this.set_state(this.state);
    }

    get_log (): String {
        return JSON.stringify(this.log);
    }

    update_stage (): void {
        this.log = [...this.log, {"state":  State.Stage,
                                  "coords": [],
                                  "type":   0}];
        this.map.update_stage();
        this.set_state(this.state);
    }
}
