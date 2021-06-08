function f(cr: number, ci: number, zr: number, zi: number) {
    const mr = zr * zr - zi * zi;
    const mi = zr * zi * 2
    return [mr + cr, mi + ci];
}

/** membership test */
function inM(cr: number, ci: number) {
    console.log("testing c", cr, ci);
    let zr = 0;
    let zi = 0;
    for (let i = 256; i > 0; --i) {
        console.log(zr, zi);
        [zr, zi] = f(cr, ci, zr, zi);
        if (zr * zr + zi * zi > 8) {
            return false;
        }
    }
    console.log(zr, zi);
    return zr * zr + zi * zi <= 8;
}

/** how many iterations to get above 2 */
function countIter(cr: number, ci: number) {
    let zr = 0;
    let zi = 0;
    let i = 0;
    let mz2 = zr * zr + zi * zi;
    while (mz2 <= 8 && i < 256) {
        [zr, zi] = f(cr, ci, zr, zi);
        mz2 = zr * zr + zi * zi;
        ++i;
    }
    return i;
    // this number could be the amount of one color component (blue)
    // and 255 - the amount of another component (red)
    // unless it's 256, where it's black
}

function main() {
    for (let i = 0; i < 32; ++i) {
        const cr = i / 32 + 0.000001;
        const ci = 0;
        console.log(cr, countIter(cr, ci));
    }
}

main();
