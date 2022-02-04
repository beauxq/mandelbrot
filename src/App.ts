import { countIter } from './mandelbrot';
import CodeTransformer from './CodeTransformer';
import WADrawer from './WADrawer';
import ScatteringSquares from './ScatteringSquares';
import PixelOrderer from './PixelOrderer';

// TODO: in worker: https://developers.google.com/web/updates/2018/08/offscreen-canvas

const zoomExponentDenominator = 4;  // defines how much to zoom with each zoom command
const zoomScaler = 2 ** (1 / zoomExponentDenominator);

const zoomOutLimit = 4;  // 2 ** zoomOutLimit = visible width of mandelbrot plane
const zoomInLimit = -64;  // 2 ** -64 is total loss of 64-bit float precision
const defaultZoom = 2;  // 2 ** defaultZoom = starts at 4 [-2.5, 1.5]

const iterationLimit = 2112;  // quality of image when further zoomed in, but also render time
// to get purple edges, this needs to be (a multiple of 768) + about 576


class App {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private pixelOrderer: PixelOrderer;
    private ct: CodeTransformer;
    private wa: WADrawer;
    private useWasm: boolean;

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
        this.pixelOrderer = new ScatteringSquares(this.context, iterationLimit, (code: number) => {
            return this.codeToColor(code);
        });

        this.leftX = - 2.5;  // left side of canvas is real (x) = leftX in mandelbrot plane
        this.zoomE = defaultZoom * zoomExponentDenominator;
        this.topY = - this.zoomH / 2;  // put imaginary (y) 0 in middle

        this.changed = true;
        this.osc = document.createElement('canvas');

        this.ct = new CodeTransformer(5, iterationLimit);
        this.wa = new WADrawer(width, height, 5, 512);  // TODO: apply iterationLimit to wasm
        this.useWasm = false;  // TODO: option to toggle this on and off

        this.canvas.addEventListener('click', () => {
            if (this.useWasm && this.wa.working) {
                // this.wa.updateB(5, 512);  // TODO: this
            }
            else {
                this.ct.b = Math.min(20, this.ct.b + 1);
            }
            this.changed = true;
        });
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.useWasm && this.wa.working) {
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
            const xp = x / this.canvas.width;
            /** mouse y 0 to 1 in window */
            const yp = y / this.canvas.height;
            const mandelbrotX = this.leftX + xp * this.zoomW;
            const mandelbrotY = this.topY + yp * this.zoomH;
            console.log("mandelbrotX", mandelbrotX, "mandelbrotY", mandelbrotY);
            let newWidth, newHeight, newLeft, newTop;  // of current canvas on new canvas
            if (out) {
                this.zoomE = Math.min(zoomOutLimit * zoomExponentDenominator, this.zoomE + 1);
                console.log("zoom out", this.zoomE);
                newWidth = this.canvas.width / zoomScaler;
                newHeight = this.canvas.height / zoomScaler;
                newLeft = x - x / zoomScaler;
                newTop = y - y / zoomScaler;
            }
            else {  // zoom in
                this.zoomE = Math.max(zoomInLimit * zoomExponentDenominator, this.zoomE - 1);
                console.log("zoom in ", this.zoomE);
                newWidth = this.canvas.width * zoomScaler;
                newHeight = this.canvas.height * zoomScaler;
                // In both Chrome and Firefox,
                // the pixels are 1/2 pixel off from where they should be -
                // something you don't notice until you scale it up.
                newLeft = (x + 0.5) - (x + 0.5) * zoomScaler;
                newTop = (y + 0.5) - (y + 0.5) * zoomScaler;
            }
            // clamp these to not get lost too far away from home
            // I can put 3 on the left, or -3 on the right
            this.leftX = Math.min(Math.max(mandelbrotX - xp * this.zoomW, -3 - 2 ** zoomOutLimit), 3);
            this.topY = Math.min(Math.max(mandelbrotY - yp * this.zoomH, -3 - 2 ** zoomOutLimit), 3);
            // TODO: once I implement mobile controls, make sure the Y limit isn't too restrictive on a portrait screen

            this.osc.width = this.canvas.width;
            this.osc.height = this.canvas.height;
            const oscContext = this.osc.getContext('2d');
            oscContext?.drawImage(this.canvas, 0, 0);
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.context.drawImage(this.osc, newLeft, newTop, newWidth, newHeight);
            if (out) {
                this.fastEdges(newLeft, newTop);
            }

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

    /**
     * how much width (real component) of the mandelbrot plane is showing
     */
    private get zoomW() {
        return Math.pow(2, this.zoomE / zoomExponentDenominator);
    }

    /**
     * how much height (imaginary component) of the mandelbrot plane is showing
     * 
     * `zoomW * canvas.height / canvas.width`
     */
    private get zoomH() {
        return this.zoomW * this.canvas.height / this.canvas.width;
    }

    /** fill in some color around the edges when zooming out */
    private fastEdges(addedWidthLeft: number, addedHeightTop: number) {
        addedWidthLeft = Math.ceil(addedWidthLeft);
        addedHeightTop = Math.ceil(addedHeightTop);
        const scalerDiff = zoomScaler - 1;
        const addedWidth = scalerDiff * this.canvas.width;
        const addedWidthRight = Math.ceil(addedWidth - addedWidthLeft);
        const addedHeight = scalerDiff * this.canvas.height;
        const addedHeightBottom = Math.ceil(addedHeight - addedHeightTop);
        let y = 0;
        let x;
        // top edge
        const length = 16;
        const midLength = 8;
        for (x = 0; x < this.canvas.width; x += length) {
            for (y = 0; y < addedHeightTop; y += length) {
                const [r, g, b] = this.colorForPixel(x + midLength, y + midLength);
                this.context.fillStyle = `rgb(${r}, ${g}, ${b})`;
                this.context.fillRect(x, y, length, length);
            }
        }
        // left and right
        for (y = addedHeightTop; y < this.canvas.height; y += length) {
            // left
            for (x = 0; x < addedWidthLeft; x += length) {
                const [r, g, b] = this.colorForPixel(x + midLength, y + midLength);
                this.context.fillStyle = `rgb(${r}, ${g}, ${b})`;
                this.context.fillRect(x, y, length, length);
            }
            // right
            for (x = this.canvas.width - addedWidthRight; x < this.canvas.width; x += length) {
                const [r, g, b] = this.colorForPixel(x + midLength, y + midLength);
                this.context.fillStyle = `rgb(${r}, ${g}, ${b})`;
                this.context.fillRect(x, y, length, length);
            }
        }
        // bottom row
        for (x = addedWidthLeft; x < this.canvas.width - addedWidthRight; x += length) {
            for (y = this.canvas.height - addedHeightBottom; y < this.canvas.height; y += length) {
                const [r, g, b] = this.colorForPixel(x + midLength, y + midLength);
                this.context.fillStyle = `rgb(${r}, ${g}, ${b})`;
                this.context.fillRect(x, y, length, length);
            }
        }
    }

    public resize(width: number, height: number) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext('2d')!;

        if (this.useWasm && this.wa.working) {
            this.wa.resize(width, height);
        }

        this.changed = true;
    }

    private draw() {
        if (this.useWasm && this.wa.working) {
            if (this.changed) {
                this.wa.draw(this.context,
                             this.canvas.width,
                             this.canvas.height,
                             this.zoomW,
                             this.leftX,
                             this.topY);
                this.changed = false;
            }
        }
        else {  // js instead of wasm
            if (this.changed) {
                this.pixelOrderer.updateZoom(this.context);
                this.changed = false;
            }
            this.jsDraw();
        }
        requestAnimationFrame(() => {
            this.draw();
        });
    }

    private codeToColor(code: number): [number, number, number] {
        let r = 0;
        let g = 0;
        let b = 0;
        if (code < iterationLimit) {
            // console.log("before transform", code);
            code = Math.floor(this.ct.f(code)) % 768;
            // console.log("after transform", code);
            if (code > 511) {
                r = code - 512;
                g = 0;
                b = 255 - r;
            }
            else if (code > 255) {
                b = code - 256;
                g = 255 - b;
                r = 0;
            }
            else {
                r = 255 - code;
                g = code;
                b = 0;
            }
        }
        return [r, g, b];
    }

    private codeForPixel(x: number, y: number): number {
        const scale = this.zoomW / this.canvas.width;  // TODO: cache this calculation for optimization
        const sx = x * scale + this.leftX;
        const sy = y * scale + this.topY;
        let code = countIter(sx, sy, iterationLimit);
        return code;
    }

    private colorForPixel(x: number, y: number): [number, number, number] {
        return this.codeToColor(this.codeForPixel(x, y));
    }

    private jsDraw() {
        const eachPixel = (x: number, y: number) => {
            return this.codeForPixel(x, y);
        };
        const endTime = Date.now() + 12;  // 12 ms to draw as much as you can before moving to next frame
        let drew = this.pixelOrderer.writePixels(eachPixel);
        while (drew && Date.now() < endTime) {
            drew = this.pixelOrderer.writePixels(eachPixel);
        }
        this.context.putImageData(this.pixelOrderer.rgba, 0, 0);
    }
}

export default App;
