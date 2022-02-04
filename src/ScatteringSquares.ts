import PixelOrderer from "./PixelOrderer";

const squareSize = 16;
const codeRangeDivision = 256;


/**
 * Choose scattered squares in multiple passes
 * from the vertical middle going up, then down,
 * deferring heavy squares until later.
 */
class ScatteringSquares implements PixelOrderer {
    // initialized in updateZoom (really wish TypeScript would fix this)
    private _rgba!: ImageData;
    private horizontalSquareCount!: number;
    private verticalSquareCount!: number;
    private nextIndex!: number;
    private levelBegin!: number;
    private nextIncrement!: number;
    private root!: number;

    private currentQueue!: number;
    private queues!: number[][];
    private codeRange: number;

    constructor(context: CanvasRenderingContext2D, codeRange: number) {
        this.codeRange = codeRange
        this.updateZoom(context);
    }

    public get rgba() {
        return this._rgba;
    }

    public updateZoom(context: CanvasRenderingContext2D): void {
        this._rgba = context.getImageData(0, 0, context.canvas.width, context.canvas.height);

        this.horizontalSquareCount = Math.ceil(context.canvas.width / squareSize);
        this.verticalSquareCount = Math.ceil(context.canvas.height / squareSize);
        const squareCount = this.horizontalSquareCount * this.verticalSquareCount;
        this.levelBegin = (1 << Math.floor(Math.log2(squareCount))) - 1;
        this.root = this.nextIndex = this.levelBegin;
        this.nextIncrement = (this.nextIndex + 1) << 1;

        this.currentQueue = -1;  // -1 is what we do while checking to see what goes in which queue

        // one for the highest value (+1), and one for each codeRangeDivision
        // except for the 1st, because we do that while filling queues (-1)
        const queueCount = Math.ceil((this.codeRange - 1) / codeRangeDivision);

        this.queues = Array(queueCount).fill([]);  // https://www.designcise.com/web/tutorial/are-there-any-differences-between-using-array-and-new-array-in-javascript
    }

    /**
     * assign rgba value to each pixel in the square and prepare for next square
     * 
     * @returns anything left to draw on this canvas
    */
    public writePixels(callback: (x: number, y: number) => number): boolean {
        if (this.currentQueue == this.queues.length) {
            // done with all queues
            return false;
        }
        if (this.currentQueue == -1) {  // haven't filled queues yet
            if (this.nextIncrement < 2) {
                // everything outside of canvas
                this.currentQueue = 0;
            }

            let squareIndex = (this.nextIndex < this.root) ? ((this.root - 1) - this.nextIndex) : this.nextIndex;
            // TODO: test performance of this `if` instead of ternary (to lookup on `this` less)
            // let pixelIndex = this.nextIndex;
            // if (pixelIndex < this.root) {
            //     pixelIndex = (this.root - 1) - pixelIndex;
            // }

            let squareX = squareIndex % this.horizontalSquareCount;
            let squareY = Math.floor(squareIndex / this.horizontalSquareCount);

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
        else {  // have filled queues

        }
    }
}

export default ScatteringSquares;
