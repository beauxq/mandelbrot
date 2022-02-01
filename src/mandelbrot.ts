/**
 * `f_c(z) = z² + c`
 * 
 * `r` for real parts, `i` for imaginary parts
 * 
 * @returns [result (real), result (imaginary)]
 */
function f(cr: number, ci: number, zr: number, zi: number): [number, number] {
    const mr = zr * zr - zi * zi;
    const mi = zr * zi * 2;
    return [mr + cr, mi + ci];
}

/**
 * mandelbrot set membership test
 * 
 * For the given `c`, does `z`, starting at `0`, not diverge when `z = f(z)` is iterated infinite times?
 * 
 * (`z` diverges if its magnitude becomes > 2)
 */
export function inM(cr: number, ci: number) {
    console.log("testing c", cr, ci);
    let zr = 0;
    let zi = 0;
    for (let i = 512; i > 0; --i) {
        console.log(zr, zi);
        [zr, zi] = f(cr, ci, zr, zi);
        if (zr * zr + zi * zi > 8) {
            return false;
        }
    }
    console.log(zr, zi);
    return zr * zr + zi * zi <= 4;
}

// TODO: include same optimizations as C code
/** how many iterations to get above 2 */
export function countIter(cr: number, ci: number) {
    let zr = 0;
    let zi = 0;
    let i = 0;
    let mz2 = 0;
    while (mz2 <= 4 && i < 512) {
        [zr, zi] = f(cr, ci, zr, zi);
        mz2 = zr * zr + zi * zi;
        ++i;
    }
    return i + 1 / Math.max(mz2 - 4, 1);
}

export function test() {
    for (let i = 0; i < 32; ++i) {
        const cr = i / 32 + 0.000001;
        const ci = 0;
        console.log(cr, countIter(cr, ci));
    }
}
