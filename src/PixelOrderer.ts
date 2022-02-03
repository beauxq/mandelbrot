interface PixelOrderer {
    get rgba(): ImageData;
    updateZoom(context: CanvasRenderingContext2D): void;
    writePixels(callback: (x: number, y: number) => number): boolean;
}

export default PixelOrderer;
