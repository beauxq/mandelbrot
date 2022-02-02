import { countIter } from './mandelbrot';
import CodeTransformer from './CodeTransformer';
import WADrawer from './WADrawer';
import DrawFrame from './DrawFrame';

// TODO: in worker: https://developers.google.com/web/updates/2018/08/offscreen-canvas

class App {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private drawFrame: DrawFrame;
    private ct: CodeTransformer;
    private wa: WADrawer;

    // zoom info - in mandelbrot coordinates
    private leftX: number;
    private topY: number;
    private zoomE: number;

    private changed: boolean;
    private osc: HTMLCanvasElement;  // for copying image with different transformation when changing it

    constructor(width: number, height: number) {
        this.canvas = document.getElementById('c') as HTMLCanvasElement;
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext('2d')!;
        this.drawFrame = new DrawFrame(this.context);

        this.leftX = - 2.5;  // left side of canvas is real (x) = leftX in mandelbrot plane
        this.zoomE = 8;
        this.topY = - this.zoomH / 2;  // put imaginary (y) 0 in middle

        this.changed = true;
        this.osc = document.createElement('canvas');

        this.ct = new CodeTransformer(5, 512);
        this.wa = new WADrawer(width, height, 5, 512);

        this.canvas.addEventListener('click', () => {
            if (this.wa.working) {
                // this.wa.updateB(5, 512);  // TODO: this
            }
            else {
                this.ct.b = Math.min(20, this.ct.b + 1);
            }
            this.changed = true;
        });
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.wa.working) {
                // this.wa.updateB(5, 512);  // TODO: this
            }
            else {
                this.ct.b = Math.max(1, this.ct.b - 1);
            }
            this.changed = true;
        });
        this.canvas.addEventListener('wheel', (e) => {
            const out = e.deltaY > 0;
            const x = e.offsetX;
            const y = e.offsetY;
            /** mouse x 0 to 1 in window */
            const xp = x / width;
            /** mouse y 0 to 1 in window */
            const yp = y / height;
            const mandelbrotX = this.leftX + xp * this.zoomW;
            const mandelbrotY = this.topY + yp * this.zoomH;
            console.log("mandelbrotX", mandelbrotX, "mandelbrotY", mandelbrotY);
            let newWidth, newHeight, newLeft, newTop;  // of current canvas on new canvas
            const scaler = 1.189207115002721;  // 2 ** (1/4) for transformation
            if (out) {
                this.zoomE = Math.min(16, this.zoomE + 1);
                console.log("zoom out", this.zoomE);
                newWidth = this.canvas.width / scaler;
                newHeight = this.canvas.height / scaler;
                newLeft = x - x / scaler;
                newTop = y - y / scaler;
            }
            else {  // zoom in
                this.zoomE = Math.max(-256, this.zoomE - 1);  // -256 is about where you hit the limits of 64-bit float precision
                console.log("zoom in ", this.zoomE);
                newWidth = this.canvas.width * scaler;
                newHeight = this.canvas.height * scaler;
                newLeft = x - x * scaler;
                newTop = y - y * scaler;
            }
            // clamp these to not get lost too far away from home
            // I can put 3 on the left, or -3 on the right (-19 + 2 ** (zoomE limit / 4))
            this.leftX = Math.min(Math.max(mandelbrotX - xp * this.zoomW, -19), 3);
            this.topY = Math.min(Math.max(mandelbrotY - yp * this.zoomH, -19), 3);
            // TODO: once I implement mobile controls, make sure the Y limit isn't too restrictive on a portrait screen

            this.osc.width = this.canvas.width;
            this.osc.height = this.canvas.height;
            const oscContext = this.osc.getContext('2d');
            oscContext?.drawImage(this.canvas, 0, 0);
            this.context.drawImage(this.osc, newLeft, newTop, newWidth, newHeight);

            this.changed = true;
        });

        // TODO: move to unit tests
        console.log("should be 0", this.ct.f(0));
        console.log("should be 511", this.ct.f(511));
        console.log("should be ~43", this.ct.f(3));
        console.log("should be ~100", this.ct.f(11));
        console.log("should be ~150", this.ct.f(17));

        requestAnimationFrame(() => {
            this.draw();
        });
    }

    public resize(width: number, height: number) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext('2d')!;

        this.wa.resize(width, height);

        this.changed = true;
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
            if (this.changed) {
                this.wa.draw(this.context,
                             this.canvas.width,
                             this.canvas.height,
                             this.zoomW,
                             this.leftX,
                             this.topY);
            }
        }
        else {  // js instead of wasm
            if (this.changed) {
                this.drawFrame.updateZoom(this.context);
            }
            this.jsDraw();
        }
        if (this.changed) {
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
            this.changed = false;
        }
        requestAnimationFrame(() => {
            this.draw();
        });
    }

    private jsDraw() {
        const scale = this.zoomW / this.canvas.width;
        const eachPixel: (x: number, y: number) => [number, number, number] = (x: number, y: number) => {
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
                return [r, g, b];
            }
            return [0, 0, 0];
        };
        const endTime = Date.now() + 12;
        let drew = this.drawFrame.writeSquare(this.canvas.width, this.canvas.height, eachPixel);
        while (drew && Date.now() < endTime) {
            drew = this.drawFrame.writeSquare(this.canvas.width, this.canvas.height, eachPixel);
        }
        this.context.putImageData(this.drawFrame.rgba, 0, 0);
    }
}

export default App;
