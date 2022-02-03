import PixelOrderer from "./PixelOrderer";

class DrawFrame implements PixelOrderer {
    // initialized in updateZoom (really wish TypeScript would fix this)
    private _rgba!: ImageData;
    private nextIndex!: number;
    private levelBegin!: number;
    private nextIncrement!: number;
    private root!: number;

    constructor(context: CanvasRenderingContext2D) {
        this.updateZoom(context);
    }

    public get rgba() {
        return this._rgba;
    }

    public updateZoom(context: CanvasRenderingContext2D): void {
        this._rgba = context.getImageData(0, 0, context.canvas.width, context.canvas.height);

        const pixelCount = context.canvas.width * context.canvas.height;
        this.levelBegin = (1 << Math.floor(Math.log2(pixelCount))) - 1;
        this.root = this.nextIndex = this.levelBegin;
        this.nextIncrement = (this.nextIndex + 1) << 1;
    }

    /**
     * assign rgba value to each pixel in the square and prepare for next square
     * 
     * @returns anything left to draw on this canvas
    */
    public writeSquare(width: number,
                       height: number,
                       callback: (x: number, y: number) => [number, number, number]): boolean {
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

        let x = pixelIndex % width;
        let y = Math.floor(pixelIndex / width);

        if (y < height) {
            const baseIndex = (y * width + x) * 4;
            let [r, g, b] = callback(x, y);
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

export default DrawFrame;
