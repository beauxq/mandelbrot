#include <emscripten/emscripten.h>

// TODO: optimize: zr squared and zi squared are calculated extra times

void f(double cr, double ci, double zr, double zi, double* outR, double* outI) {
    const double mr = zr * zr - zi * zi;
    const double mi = zr * zi * 2;
    *outR = mr + cr;
    *outI = mi + ci;
}

/** how many iterations to get above 2 */
double countIter(double cr, double ci) {
    double zr = 0;
    double zi = 0;
    int i = 0;
    double mz2 = 0;
    while (mz2 <= 8 && i < 512) {
        f(cr, ci, zr, zi, &zr, &zi);
        mz2 = zr * zr + zi * zi;
        ++i;
    }
    return i + 1 / ((mz2 < 9) ? 1 : mz2 - 8);
}
