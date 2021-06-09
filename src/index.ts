function f(cr: number, ci: number, zr: number, zi: number) {
    const mr = zr * zr - zi * zi;
    const mi = zr * zi * 2
    return [mr + cr, mi + ci];
}

/** membership test */
function inM(cr: number, ci: number) {
    console.log("testing c", cr, ci);
    let zr = 0;
    let zi = 0;
    for (let i = 512; i > 0; --i) {
        console.log(zr, zi);
        [zr, zi] = f(cr, ci, zr, zi);
        if (zr * zr + zi * zi > 8) {
            return false;
        }
    }
    console.log(zr, zi);
    return zr * zr + zi * zi <= 8;
}

/** how many iterations to get above 2 */
function countIter(cr: number, ci: number) {
    let zr = 0;
    let zi = 0;
    let i = 0;
    let mz2 = zr * zr + zi * zi;
    while (mz2 <= 8 && i < 512) {
        [zr, zi] = f(cr, ci, zr, zi);
        mz2 = zr * zr + zi * zi;
        ++i;
    }
    return i;
}

function test() {
    for (let i = 0; i < 32; ++i) {
        const cr = i / 32 + 0.000001;
        const ci = 0;
        console.log(cr, countIter(cr, ci));
    }
}

/**
 * color code distribution
 * 
 * ```
 * f(0) = 0
 * f(k) = k
 * f(x) is continuous in [0, k]
 * if g(x) is 1st derivative of f(x)
 * g(0) = 1 / g(k)
 * ```
 */
class CodeTransformer {
    private _b: number;
    private k: number;

    private a!: number;
    private bma!: number;
    private kDivBmA!: number;

    /**
     * @param b how far to modify the input from f(x) = x, 1 means f(x) = x
     * @param k the non-zero value that needs to match f(x) = x
     */
    constructor(b: number, k: number) {
        if (k === 0) {
            throw new Error("k can't be zero");
        }
        this._b = b;
        this.k = k;
        this.calculate();
    }

    private calculate() {
        this.a = 1 / this._b;
        this.bma = this._b - this.a;
        this.kDivBmA = this.k / this.bma;
        console.log("calculate results:");
        console.log(this);
    }

    private unscaled(x: number) {
        return (-1 / (x + this.a)) + this._b;
    }

    public f(x: number) {
        return Number.isFinite(this.kDivBmA) ? this.unscaled(x / this.kDivBmA) * this.kDivBmA : x;
    }

    public get b() {
        return this._b;
    }

    public set b(value: number) {
        this._b = value;
        this.calculate();
    }
}

class App {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private ct: CodeTransformer;

    // zoom info - in mandelbrot coordinates
    private leftX: number;
    private topY: number;
    private zoomE: number;

    private lastDraw: number;

    constructor(width: number, height: number) {
        this.canvas = document.getElementById('c') as HTMLCanvasElement;
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext('2d')!;

        this.leftX = - 2.5;  // left side of canvas is real (x) = leftX in mandelbrot plane
        this.zoomE = 8;
        this.topY = - this.zoomH / 2;  // put imaginary (y) 0 in middle

        this.lastDraw = 0;

        this.ct = new CodeTransformer(5, 511);
        this.canvas.addEventListener('click', () => {
            this.ct.b = Math.min(20, this.ct.b + 1);
            this.draw();
        });
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.ct.b = Math.max(1, this.ct.b - 1);
            this.draw();
        });
        this.canvas.addEventListener('wheel', (e) => {
            const now = new Date().getTime();
            if (now - this.lastDraw > 20) {
                console.log("wheel event");
                console.log(e);
                const out = e.deltaY > 0;
                const x = e.offsetX;
                const y = e.offsetY;
                const xp = x / width;
                const yp = y / height;
                const mx = this.leftX + xp * this.zoomW;
                const my = this.topY + yp * this.zoomH;
                console.log("mx", mx, "my", my);
                if (out) {
                    this.zoomE = Math.min(16, this.zoomE + 1);
                }
                else {  // zoom in
                    this.zoomE = this.zoomE - 1;
                }
                this.leftX = mx - xp * this.zoomW;
                this.topY = my - yp * this.zoomH;
                this.draw();
            }
        });

        // TODO: move to unit tests
        console.log("should be 0", this.ct.f(0));
        console.log("should be 511", this.ct.f(511));
        console.log("should be ~43", this.ct.f(3));
        console.log("should be ~100", this.ct.f(11));
        console.log("should be ~150", this.ct.f(17));

        this.draw();
    }

    /**
     * how much width (real component) of the mandelbrot plane is showing
     * 
     * starts at 4 [-2.5, 1.5]
     */
    private get zoomW() {
        return Math.pow(2, this.zoomE / 4);
    }

    /**
     * how much height (imaginary component) of the mandelbrot plane is showing
     * 
     * `zoomW * canvas.height / canvas.width`
     */
    private get zoomH() {
        return this.zoomW * this.canvas.height / this.canvas.width;
    }

    private draw() {
        const rgba = this.context.createImageData(this.canvas.width, this.canvas.height);
        const scale = this.zoomW / this.canvas.width;
        let i = 0;
        for (let y = 0; y < this.canvas.height; ++y) {
            for (let x = 0; x < this.canvas.width; ++x) {
                const sx = x * scale + this.leftX;
                const sy = y * scale + this.topY;
                let code = countIter(sx, sy);
                if (code !== 512) {
                    // console.log("before transform", code);
                    code = Math.floor(this.ct.f(code));
                    // console.log("after transform", code);
                    let r: number, g: number, b: number;
                    if (code > 255) {
                        b  = code - 256;
                        g = 255 - b;
                        r = 0;
                    }
                    else {
                        r = 255 - code;
                        g = code;
                        b = 0;
                    }
                    const baseIndex = i * 4;
                    rgba.data[baseIndex] = r;
                    rgba.data[baseIndex + 1] = g;
                    rgba.data[baseIndex + 2] = b;
                    rgba.data[baseIndex + 3] = 255;
                }
                ++i;
            }
        }
        this.context.putImageData(rgba, 0, 0);
        console.log('draw completed');
        this.lastDraw = new Date().getTime();
    }
}

window.onload = () => {
    test();
    const width = 1000;
    const height = 800;
    new App(width, height);
}
