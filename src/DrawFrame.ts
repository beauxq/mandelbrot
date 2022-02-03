import PixelOrderer from "./PixelOrderer";

class DrawFrame implements PixelOrderer {
    // initialized in updateZoom (really wish TypeScript would fix this)
    private _rgba!: ImageData;
    private nextX!: number;
    private nextY!: number;
    private nextW!: number;

    constructor(context: CanvasRenderingContext2D) {
        this.updateZoom(context);
    }

    public get rgba() {
        return this._rgba;
    }

    public updateZoom(context: CanvasRenderingContext2D): void {
        this._rgba = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
        this.nextX = Math.floor((context.canvas.width - 1) / 2);
        this.nextY = Math.floor((context.canvas.height - 1) / 2);
        this.nextW = 2 - (context.canvas.width & 1);
    }

    /**
     * assign rgba value to each pixel in the square and prepare for next square
     * 
     * @returns anything left to draw on this canvas
    */
    public writeSquare(width: number,
                       height: number,
                       callback: (x: number, y: number) => [number, number, number]): boolean {
        if (this.nextX < 0 && this.nextY < 0) {
            // everything outside of canvas
            return false;
        }

        let x = this.nextX;
        let y = this.nextY;

        const doThisPixel = () => {
            const baseIndex = (y * width + x) * 4;
            let [r, g, b] = callback(x, y);
            this._rgba.data[baseIndex] = r;
            this._rgba.data[baseIndex + 1] = g;
            this._rgba.data[baseIndex + 2] = b;
            this._rgba.data[baseIndex + 3] = 255;
        };
        let moving: number = 0;

        // right across top of square
        if (y >= 0) {
            for (moving = this.nextW; moving > 0; --moving) {
                if (x >= 0 && x < width) {
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
        if (x < width) {
            for (moving = this.nextW - 1; moving > 0; --moving) {
                ++y;
                if (y >= 0 && y < height) {
                    doThisPixel();
                }
            }
        }
        else {
            y += this.nextW - 1;
        }

        // left across bottom of square
        if (y < height) {
            for (moving = this.nextW - 1; moving > 0; --moving) {
                --x;
                if (x >= 0 && x < width) {
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
                if (y >= 0 && y < height) {
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
