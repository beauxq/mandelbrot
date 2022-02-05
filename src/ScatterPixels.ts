import PixelOrderer from "./PixelOrderer";


/**
 * Draw pixels in multiple passes
 * from the vertical middle going up, then down.
 */
class ScatterPixels implements PixelOrderer {
    private codeToColor: (code: number) => [number, number, number];
    // initialized in reset (really wish TypeScript would fix this)
    private width!: number;
    private height!: number;
    private _rgba!: ImageData;
    private nextIndex!: number;
    private levelBegin!: number;
    private nextIncrement!: number;
    private root!: number;

    constructor(context: CanvasRenderingContext2D, codeToColor: (code: number) => [number, number, number]) {
        this.codeToColor = codeToColor;
        this.reset(context);
    }

    public get rgba() {
        return this._rgba;
    }

    public reset(context: CanvasRenderingContext2D): void {
        this.width = context.canvas.width;
        this.height = context.canvas.height;
        this._rgba = context.getImageData(0, 0, this.width, this.height);

        const pixelCount = this.width * this.height;
        this.levelBegin = (1 << Math.floor(Math.log2(pixelCount))) - 1;
        this.root = this.nextIndex = this.levelBegin;
        this.nextIncrement = (this.nextIndex + 1) << 1;
    }

    /**
     * assign rgba value to each pixel in the square and prepare for next square
     * 
     * @returns anything left to draw on this canvas
    */
    public writePixels(callback: (x: number, y: number) => number): boolean {
        if (this.nextIncrement < 2) {
            // everything outside of canvas
            return false;
        }

        let pixelIndex = (this.nextIndex < this.root) ? ((this.root - 1) - this.nextIndex) : this.nextIndex;
        // TODO: test performance of this `if` instead of ternary (to lookup on `this` less)
        // let pixelIndex = this.nextIndex;
        // if (pixelIndex < this.root) {
        //     pixelIndex = (this.root - 1) - pixelIndex;
        // }

        let x = pixelIndex % this.width;
        let y = Math.floor(pixelIndex / this.width);

        if (y < this.height) {
            const baseIndex = (y * this.width + x) * 4;
            let [r, g, b] = this.codeToColor(callback(x, y));
            this._rgba.data[baseIndex] = r;
            this._rgba.data[baseIndex + 1] = g;
            this._rgba.data[baseIndex + 2] = b;
            this._rgba.data[baseIndex + 3] = 255;

            this.nextIndex += this.nextIncrement;
        }
        else {
            // move to next level
            this.levelBegin = this.levelBegin >> 1;
            this.nextIndex = this.levelBegin;
            this.nextIncrement = this.nextIncrement >> 1;
        }
        return true;
    }
}

export default ScatterPixels;
