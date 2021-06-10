import { drawWasm } from './drawWasm';

function decode(b64: string): ArrayBufferLike {
    const str = window.atob(b64);
    const array = new Uint8Array(str.length);
    for (let i = 0; i < str.length; ++i) {
        array[i] = str.charCodeAt(i);
    }
    return array.buffer;
};

interface WAAPI {
    initTrans: (b: number, k: number) => void,
    draw: (
        width: number,   // int
        height: number,  // int
        zoomW: number,   // double
        leftX: number,   // double
        topY: number     // double
    ) => number,         // return value int for debugging
    point: () => number, // offset in memory to pixel data
    memory: { buffer: ArrayBufferLike }
}

/** check `working` before doing anything with this */
class WADrawer {
    private readonly instance!: WebAssembly.Instance;
    private readonly exports!: WebAssembly.Exports & WAAPI
    private data!: Uint8ClampedArray;
    private img!: ImageData;
    public readonly working: boolean;

    constructor(width: number, height: number, b: number, k: number) {
        this.working = false;
        if (WebAssembly && WebAssembly.Instance && WebAssembly.Module) {
            this.instance = new WebAssembly.Instance(
                new WebAssembly.Module(new Uint8Array(decode(drawWasm)))
            );

            this.working = !!(this.instance &&
                              this.instance.exports &&
                              this.instance.exports.initTrans && 
                              this.instance.exports.draw &&
                              this.instance.exports.point);
        }
        console.log("WebAssembly working:", this.working);

        console.log("wa instance:");
        console.log(this.instance);

        if (this.working) {
            this.exports = this.instance.exports as WebAssembly.Exports & WAAPI;
            // TODO: save b to update it later
            this.updateB(b, k);

            this.resize(width, height);
        }
    }

    public updateB(b: number, k: number) {
        this.exports.initTrans(b, k);
    }

    public resize(width: number, height: number) {
        const pointer = this.exports.point();
        console.log("pointer", pointer);
        this.data = new Uint8ClampedArray(this.exports.memory.buffer, pointer, width * height * 4);
        this.img = new ImageData(this.data, width, height);
    }

    /**
     * @param context from canvas
     * ```
     * __INT32_TYPE__ width,
     * __INT32_TYPE__ height,
     * double zoomW,
     * double leftX,
     * double topY
     * ```
     */
    public draw(context: CanvasRenderingContext2D,
                width: number,
                height: number,
                zoomW: number,
                leftX: number,
                topY: number) {
        // this.logPixels(2);
        const ret = this.exports.draw(width, height, zoomW, leftX, topY);
        console.log("color or top left pixel", ret);
        // this.logPixels(2);
        context.putImageData(this.img, 0, 0);
    }

    // @ts-ignore - debugging
    private logPixels(count: number) {
        const tp: number[] = [];
        for (let i = 0; i < count * 4; ++i) {
            tp.push(this.data[i]);
        }
        console.log(tp);
    }
}

export default WADrawer;
  