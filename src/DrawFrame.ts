import PixelOrderer from "./PixelOrderer";

/**
 * Draw pixels from middle of canvas in squares going out towards the edges.
 */
class DrawFrame implements PixelOrderer {
    private codeToColor: (code: number) => [number, number, number];
    // initialized in updateZoom (really wish TypeScript would fix this)
    private width!: number;
    private height!: number;
    private _rgba!: ImageData;
    private nextX!: number;
    private nextY!: number;
    private nextW!: number;

    constructor(context: CanvasRenderingContext2D, codeToColor: (code: number) => [number, number, number]) {
        this.codeToColor = codeToColor;
        this.updateZoom(context);
    }

    public get rgba() {
        return this._rgba;
    }

    public updateZoom(context: CanvasRenderingContext2D): void {
        this.width = context.canvas.width;
        this.height = context.canvas.height;
        this._rgba = context.getImageData(0, 0, this.width, this.height);
        this.nextX = Math.floor((this.width - 1) / 2);
        this.nextY = Math.floor((this.height - 1) / 2);
        this.nextW = 2 - (this.width & 1);
    }

    /**
     * assign rgba value to each pixel in the square and prepare for next square
     * 
     * @returns anything left to draw on this canvas
    */
    public writePixels(callback: (x: number, y: number) => number): boolean {
        if (this.nextX < 0 && this.nextY < 0) {
            // everything outside of canvas
            return false;
        }

        let x = this.nextX;
        let y = this.nextY;

        const doThisPixel = () => {
            const baseIndex = (y * this.width + x) * 4;
            let [r, g, b] = this.codeToColor(callback(x, y));
            this._rgba.data[baseIndex] = r;
            this._rgba.data[baseIndex + 1] = g;
            this._rgba.data[baseIndex + 2] = b;
            this._rgba.data[baseIndex + 3] = 255;
        };
        let moving: number = 0;

        // right across top of square
        if (y >= 0) {
            for (moving = this.nextW; moving > 0; --moving) {
                if (x >= 0 && x < this.width) {
                    doThisPixel();
                }
                ++x;
            }
        }
        else {
            x += this.nextW;
        }
        --x;

        // down on right edge of square
        if (x < this.width) {
            for (moving = this.nextW - 1; moving > 0; --moving) {
                ++y;
                if (y >= 0 && y < this.height) {
                    doThisPixel();
                }
            }
        }
        else {
            y += this.nextW - 1;
        }

        // left across bottom of square
        if (y < this.height) {
            for (moving = this.nextW - 1; moving > 0; --moving) {
                --x;
                if (x >= 0 && x < this.width) {
                    doThisPixel();
                }
            }
        }
        else {
            x -= this.nextW - 1;
        }

        // up on left edge of square
        if (x >= 0) {
            for (moving = this.nextW - 2; moving > 0; --moving) {
                --y;
                if (y >= 0 && y < this.height) {
                    doThisPixel();
                }
            }
        }

        // set state for next square
        --this.nextX;
        --this.nextY;
        this.nextW += 2;

        return true;
    }
}

export default DrawFrame;
