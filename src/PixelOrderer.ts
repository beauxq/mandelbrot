interface PixelOrderer {
    get rgba(): ImageData;
    updateZoom(context: CanvasRenderingContext2D): void;
    writePixels(width: number,
                height: number,
                callback: (x: number, y: number) => [number, number, number]): boolean;
}

export default PixelOrderer;
