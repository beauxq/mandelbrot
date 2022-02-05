import PixelOrderer from "./PixelOrderer";

const squareSize = 8;
const codeRangeDivision = 512;

// TODO: BUG: leftmost pixels behave weird


/**
 * Choose scattered squares in multiple passes
 * from the vertical middle going up, then down,
 * deferring heavy squares until later.
 */
class ScatteringSquares implements PixelOrderer {
    private codeToColor: (code: number) => [number, number, number];
    // initialized in reset (really wish TypeScript would fix this)
    private width!: number;
    private height!: number;
    private _rgba!: ImageData;
    private horizontalSquareCount!: number;
    private verticalSquareCount!: number;
    private nextIndex!: number;
    private levelBegin!: number;
    private nextIncrement!: number;
    private root!: number;

    private squareQueueIndex!: number;
    private currentQueue!: number;
    private queues!: number[][];
    private queueLowerLimits!: number[];
    private codeRange: number;

    constructor(context: CanvasRenderingContext2D, codeRange: number, codeToColor: (code: number) => [number, number, number]) {
        this.codeToColor = codeToColor;
        this.codeRange = codeRange
        this.reset(context);
    }

    public get rgba() {
        return this._rgba;
    }

    public reset(context: CanvasRenderingContext2D): void {
        this.width = context.canvas.width;
        this.height = context.canvas.height;
        this._rgba = context.getImageData(0, 0, this.width, this.height);

        this.horizontalSquareCount = Math.ceil(this.width / squareSize);
        this.verticalSquareCount = Math.ceil(this.height / squareSize);
        const squareCount = this.horizontalSquareCount * this.verticalSquareCount;
        this.levelBegin = (1 << Math.floor(Math.log2(squareCount))) - 1;
        this.root = this.nextIndex = this.levelBegin;
        this.nextIncrement = (this.nextIndex + 1) << 1;

        this.squareQueueIndex = 0;
        this.currentQueue = -1;  // -1 is what we do while checking to see what goes in which queue

        // one for the highest value (+1), and one for each codeRangeDivision
        // except for the 1st, because we do that while filling queues (-1)
        const queueCount = Math.ceil((this.codeRange - 1) / codeRangeDivision);

        this.queues = [];
        // tried Array.fill, but it puts the same instance of the array in multiple times
        for (let i = queueCount; i > 0; --i) {
            this.queues.push([]);
        }
        this.queueLowerLimits = [];
        for (let i = 1; i < queueCount; ++i) {
            this.queueLowerLimits.push(i * codeRangeDivision);
        }
        this.queueLowerLimits.push(this.codeRange);
        console.log(this.queueLowerLimits);
    }

    private colorThisPixel(x: number, y: number, code: number): void {
        const baseIndex = (y * this.width + x) * 4;
        let [r, g, b] = this.codeToColor(code);
        this._rgba.data[baseIndex] = r;
        this._rgba.data[baseIndex + 1] = g;
        this._rgba.data[baseIndex + 2] = b;
        this._rgba.data[baseIndex + 3] = 255;
    }

    private colorThisSquare(squareIndex: number, callback: (x: number, y: number) => number): void {
        // 4 corners are already done
        let squareX = squareIndex % this.horizontalSquareCount;
        let squareY = Math.floor(squareIndex / this.horizontalSquareCount);
        
        const leftX = squareX * squareSize;
        const rightX = Math.min((squareX + 1) * squareSize - 1, this.width);
        const topY = squareY * squareSize;
        const bottomY = Math.min((squareY + 1) * squareSize - 1, this.height);
        const topLeft = callback(leftX, topY);
        this.colorThisPixel(leftX, topY, topLeft);
        // top row
        for (let x = leftX + 1; x < rightX; ++x) {
            const code = callback(x, topY);
            this.colorThisPixel(x, topY, code);
        }
        // between top and bottom rows
        for (let y = topY + 1; y < bottomY; ++y) {
            for (let x = leftX; x <= rightX; ++x) {
                const code = callback(x, y);
                this.colorThisPixel(x, y, code);
            }
        }
        // bottom row
        for (let x = leftX + 1; x < rightX; ++x) {
            const code = callback(x, bottomY);
            this.colorThisPixel(x, bottomY, code);
        }
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
                // debug
                for (let i = 0; i < this.queues.length; ++i) {
                    console.log(this.queues[i].length);
                }
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

            if (squareY < this.verticalSquareCount) {
                const leftX = squareX * squareSize;
                const rightX = Math.min((squareX + 1) * squareSize - 1, this.width);
                const topY = squareY * squareSize;
                const bottomY = Math.min((squareY + 1) * squareSize - 1, this.height);
                const topLeft = callback(leftX, topY);
                this.colorThisPixel(leftX, topY, topLeft);
                const topRight = callback(rightX, topY);
                this.colorThisPixel(rightX, topY, topRight);
                const botLeft = callback(leftX, bottomY);
                this.colorThisPixel(leftX, bottomY, botLeft);
                const botRight = callback(rightX, bottomY);
                this.colorThisPixel(rightX, bottomY, botRight);

                let queueI: number;
                for (queueI = this.queues.length - 1; queueI >= 0; --queueI) {
                    const limit = this.queueLowerLimits[queueI];
                    if (topLeft >= limit
                     && topRight >= limit
                     && botLeft >= limit
                     && botRight >= limit) {
                        this.queues[queueI].push(squareIndex);
                        break;
                    }
                }
                if (queueI == -1) {  // didn't put this in a queue
                    // do it now
                    this.colorThisSquare(squareIndex, callback);
                }

                this.nextIndex += this.nextIncrement;
            }
            else {
                // move to next level
                this.levelBegin = this.levelBegin >> 1;
                this.nextIndex = this.levelBegin;
                this.nextIncrement = this.nextIncrement >> 1;
            }
        }
        else {  // have filled queues
            const cQueue = this.queues[this.currentQueue];
            if (this.squareQueueIndex >= cQueue.length) {
                this.squareQueueIndex = 0;
                ++this.currentQueue;
            }
            else {
                this.colorThisSquare(cQueue[this.squareQueueIndex], callback);
                ++this.squareQueueIndex;
            }
        }
        return true;
    }
}

export default ScatteringSquares;
