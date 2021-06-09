/**
 * color code distribution
 * 
 * ```
 * f(0) = 0
 * f(k) = k
 * f(x) is continuous in [0, k]
 * if g(x) is 1st derivative of f(x)
 * g(0) = 1 / g(k)
 * ```
 */
class CodeTransformer {
    private _b: number;
    private k: number;

    private a!: number;
    private bma!: number;
    private kDivBmA!: number;

    /**
     * @param b how far to modify the input from f(x) = x, 1 means f(x) = x
     * @param k the non-zero value that needs to match f(x) = x
     */
    constructor(b: number, k: number) {
        if (k === 0) {
            throw new Error("k can't be zero");
        }
        this._b = b;
        this.k = k;
        this.calculate();
    }

    private calculate() {
        this.a = 1 / this._b;
        this.bma = this._b - this.a;
        this.kDivBmA = this.k / this.bma;
        console.log("calculate results:");
        console.log(this);
    }

    private unscaled(x: number) {
        return (-1 / (x + this.a)) + this._b;
    }

    public f(x: number) {
        return Number.isFinite(this.kDivBmA) ? this.unscaled(x / this.kDivBmA) * this.kDivBmA : x;
    }

    public get b() {
        return this._b;
    }

    public set b(value: number) {
        this._b = value;
        this.calculate();
    }
}

export default CodeTransformer;
