#include <emscripten/emscripten.h>
#include "mandelbrot.h"

// close to what I want:
// https://compile.fi/canvas-filled-three-ways-js-webassembly-and-webgl/

// 1980 x 1080
#define MAX_PIXEL_COUNT 2138400
#define INFINITY 307e42

double _b, a, kDivBmA;
// max canvas size allocated
int data[MAX_PIXEL_COUNT];

EMSCRIPTEN_KEEPALIVE int* point() {
    return &data[0];
}

/**
 * @param b how far to modify the input from f(x) = x, 1 means f(x) = x
 * @param k the non-zero value that needs to match f(x) = x
 */
EMSCRIPTEN_KEEPALIVE void initTrans(double b, double k) {
    if (b != 0.0) {
        _b = b;
        a = 1.0 / _b;
        if (b == 1.0) {
            kDivBmA = INFINITY;
        }
        else {
            kDivBmA = k / (b - a);
        }
    }
}

double unscaled(double x) {
    return (-1.0 / (x + a)) + _b;
}

double trans(double x) {
    return (kDivBmA == INFINITY)
        ? x
        : unscaled(x / kDivBmA) * kDivBmA;
}

/**
 * fill pixel data
 * 
 *  - width * height limited to MAX_PIXEL_COUNT
 * 
 * return for debugging
 */
EMSCRIPTEN_KEEPALIVE int draw(__INT32_TYPE__ width,
                               __INT32_TYPE__ height,
                               double zoomW,
                               double leftX,
                               double topY) {
    const double scale = zoomW / width;

    int i = 0;
    double sx, sy, code;
    int r, g, b, a, intcode;
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            sx = x * scale + leftX;
            sy = y * scale + topY;
            code = countIter(sx, sy);
            r = 0;
            g = 0;
            b = 0;
            a = 0;
            if (code < 512) {  // TODO: make this 512 refer to the same code as the transformation?
                a = 255;
                intcode = trans(code);
                if (intcode > 255) {
                    b  = intcode - 256;
                    g = 255 - b;
                    r = 0;
                }
                else {
                    r = 255 - intcode;
                    g = intcode;
                    b = 0;
                }
            }
            data[i++] = 
                // little endian
                (a << 24) |
                (b << 16) |
                (g << 8) |
                r;
        }
    }
    return data[0];
}
