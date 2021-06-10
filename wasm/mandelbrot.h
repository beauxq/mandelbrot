#include <emscripten/emscripten.h>

#define MAX_ITERATION 512

void f(double cr, double ci, double zr, double zi, double* outR, double* outI) {
    const double mr = zr * zr - zi * zi;
    const double mi = zr * zi * 2;
    *outR = mr + cr;
    *outI = mi + ci;
}

/** how many iterations to get above 2 */
double countIterOld(double cr, double ci) {
    double zr = 0;
    double zi = 0;
    int i = 0;
    double mz2 = 0;
    while (mz2 <= 4 && i < MAX_ITERATION) {
        f(cr, ci, zr, zi, &zr, &zi);
        mz2 = zr * zr + zi * zi;
        ++i;
    }
    return i + 1 / ((mz2 < 5) ? 1 : mz2 - 4);
}

// optimization from https://en.wikipedia.org/wiki/Plotting_algorithms_for_the_Mandelbrot_set
double countIter(double cr, double ci) {
    double zr = 0;
    double zi = 0;
    double zr2 = 0;
    double zi2 = 0;
    int i = 0;
    while (zr2 + zi2 <= 4 && i < MAX_ITERATION) {
        zi = 2.0 * zr * zi + ci;
        zr = zr2 - zi2 + cr;
        zr2 = zr * zr;
        zi2 = zi * zi;
        ++i;
    }
    double mz2 = zr2 + zi2;
    return i + 1 / ((mz2 < 5) ? 1 : mz2 - 4);
}

// with period checking
// I think this is not worth it
// not deleting because I didn't do any precise performance tests
double countIterPeriod(double cr, double ci) {
    double zr = 0;
    double zi = 0;
    double zr2 = 0;
    double zi2 = 0;
    double zrp = 0;
    double zip = 0;
    int period = 0;
    int i = 0;
    while (zr2 + zi2 <= 4 && i < MAX_ITERATION) {
        zi = 2.0 * zr * zi + ci;
        zr = zr2 - zi2 + cr;
        zr2 = zr * zr;
        zi2 = zi * zi;

        if (zr == zrp && zi == zip) {
            i = MAX_ITERATION;
            break;
        }

        ++period;
        if (period > 20) {
            period = 0;
            zrp = zr;
            zip = zi;
        }

        ++i;
    }
    double mz2 = zr2 + zi2;
    return i + 1 / ((mz2 < 5) ? 1 : mz2 - 4);
}
