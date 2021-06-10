import { drawWasm } from './drawWasm';

function decode(b64: string): ArrayBufferLike {
    const str = window.atob(b64);
    const array = new Uint8Array(str.length);
    for (let i = 0; i < str.length; ++i) {
        array[i] = str.charCodeAt(i);
    }
    return array.buffer;
};

class WADrawer {
    private readonly instance: WebAssembly.Instance;
    private data!: Uint8ClampedArray;
    private img!: ImageData;
    public readonly working: boolean;

    constructor(width: number, height: number, b: number, k: number) {
        this.instance = new WebAssembly.Instance(
            new WebAssembly.Module(new Uint8Array(decode(drawWasm)))
        );

        console.log("wa instance:");
        console.log(this.instance);

        // TODO: save b to update it later
        this.updateB(b, k);

        this.resize(width, height);

        this.working = true;
    }

    public updateB(b: number, k: number) {
        // @ts-expect-error
        this.instance.exports.initTrans(b, k);
    }

    public resize(width: number, height: number) {
        // TODO: figure out how to get typescript to see exports
        // @ts-expect-error
        const pointer = this.instance.exports.point();
        console.log("pointer", pointer);
        // @ts-expect-error
        this.data = new Uint8ClampedArray(this.instance.exports.memory.buffer, pointer, width * height * 4);
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
        // @ts-expect-error
        const ret = this.instance.exports.draw(width, height, zoomW, leftX, topY);
        // console.log("ret", ret);
        // this.logPixels(2);
        context.putImageData(this.img, 0, 0);
    }

    // @ts-ignore
    private logPixels(count: number) {
        const tp: number[] = [];
        for (let i = 0; i < count * 4; ++i) {
            tp.push(this.data[i]);
        }
        console.log(tp);
    }
}

export default WADrawer;
  