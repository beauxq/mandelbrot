interface PixelOrderer {
    get rgba(): ImageData;
    /**
     * abort the current ordering and start over from the beginning
     */
    reset(context: CanvasRenderingContext2D): void;
    /**
     * write some arbitrary number of pixels that need to be written
     * @param callback function that takes coords returns code
     * @returns whether there are any more pixels to write
     */
    writePixels(callback: (x: number, y: number) => number): boolean;
}

export default PixelOrderer;
