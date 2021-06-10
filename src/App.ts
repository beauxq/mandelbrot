import { countIter } from './mandelbrot';
import CodeTransformer from './CodeTransformer';
import WADrawer from './WADrawer';

class App {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private ct: CodeTransformer;
    private wa: WADrawer;

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

        this.ct = new CodeTransformer(5, 512);
        this.wa = new WADrawer(width, height, 5, 512);

        this.canvas.addEventListener('click', () => {
            if (this.wa.working) {
                // this.wa.updateB(5, 512);  // TODO: this
            }
            else {
                this.ct.b = Math.min(20, this.ct.b + 1);
            }
            this.draw();
        });
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.wa.working) {
                // this.wa.updateB(5, 512);  // TODO: this
            }
            else {
                this.ct.b = Math.max(1, this.ct.b - 1);
            }
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

    public resize(width: number, height: number) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext('2d')!;

        this.wa.resize(width, height);

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
        if (this.wa.working) {
            this.wa.draw(this.context,
                         this.canvas.width,
                         this.canvas.height,
                         this.zoomW,
                         this.leftX,
                         this.topY);
        }
        else {  // js instead of wa
            this.jsDraw();
        }
        console.log('draw completed');
        this.lastDraw = new Date().getTime();
    }

    private jsDraw() {
        const rgba = this.context.createImageData(this.canvas.width, this.canvas.height);
        const scale = this.zoomW / this.canvas.width;
        let i = 0;
        for (let y = 0; y < this.canvas.height; ++y) {
            for (let x = 0; x < this.canvas.width; ++x) {
                const sx = x * scale + this.leftX;
                const sy = y * scale + this.topY;
                let code = countIter(sx, sy);
                if (code < 512) {
                    // console.log("before transform", code);
                    code = Math.floor(this.ct.f(code));
                    // console.log("after transform", code);
                    let r: number, g: number, b: number;
                    if (code > 255) {
                        b = code - 256;
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
    }
}

export default App;
