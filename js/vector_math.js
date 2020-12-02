/* ALL SORTS OF OPERATIONS WITH VECTORS */
const radToDeg = 180.0 / Math.PI;
const degToRad = Math.PI / 180.0;

function _len(x, y) {
    return Math.sqrt(x * x + y * y);
}

function _len2(x, y) {
    return x * x + y * y;
}
/**
 * @param x {?number}
 * @param y {?number}
 * @constructor
 */
let Vec = function(x, y) {
    this.x = x || 0;
    this.y = y || 0;
}

Vec.prototype = {
    /**
     * Angle of vector in radians
     * @returns {number}
     */
    get angle() {
        return Math.atan2(this.y, this.x)
    },
    /**
     * @returns {number}
     */
    get len() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    },
    /**
     * length of a vector squared
     * @returns {number}
     */
    get len2() {
        return this.x * this.x + this.y * this.y;
    }
}

/**
 * sets new values for vector
 * @param x {number}
 * @param y {number}
 * @returns {Vec}
 */
Vec.prototype.set = function(x, y) {
    this.x = x || 0;
    this.y = y || 0;
    return this;
}

/**
 * adds other's vectors values
 * @param v {Vec}
 * @param v.x {number}
 * @param v.y {number}
 * @returns {Vec}
 */
Vec.prototype.add = function(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
}

/**
 * adds other's vectors values
 * @param x {number}
 * @param y {number}
 * @returns {Vec}
 */
Vec.prototype.addXY = function(x, y) {
    this.x += x;
    this.y += y;
    return this;
}

/**
 * subtracts other's vectors values
 * @param v {Vec}
 * @param v.x {number}
 * @param v.y {number}
 * @returns {Vec}
 */
Vec.prototype.sub = function(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
}

/**
 * subtracts other's vectors values
 * @param x {number}
 * @param y {number}
 * @returns {Vec}
 */
Vec.prototype.subXY = function(x, y) {
    this.x -= x;
    this.y -= y;
    return this;
}

/**
 * multiplies vector by an amount
 * @param scale {number}
 * @returns {Vec}
 */
Vec.prototype.mul = function(scale) {
    this.x *= scale;
    this.y *= scale;
    return this;
}

/**
 * divides vector by an amount
 * @param scale {number}
 * @returns {Vec}
 */
Vec.prototype.div = function(scale) {
    this.x /= scale;
    this.y /= scale;
    return this;
}

/** Calculates the 2D cross product between this and the given vector.
 * @param v {Vec}
 * @return {number} the cross product
 * */
Vec.prototype.crs = function (v) {
    return this.x * v.y - this.y * v.x;
}

/**
 * Dot product
 * @param v {Vec}
 * @return {number}
 */
Vec.prototype.dot = function (v) {
    return this.x * v.x + this.y * v.y;
}

/**
 * Angle relative to the other vector
 * @param reference {Vec}
 * @returns {number}
 */
Vec.prototype.angleRel = function(reference) {
    return Math.atan2(this.crs(reference), this.dot(reference));
}

/**
 * Sets length for the vector
 * @param l {number}
 * @return {Vec}
 */
Vec.prototype.setLen = function(l) {
    let currLen = this.len;
    let multiplier = l / currLen;
    this.x *= multiplier;
    this.y *= multiplier;
    return this;
}

/**
 * distance between vectors
 * @param v
 * @return {number}
 */
Vec.prototype.dst = function(v) {
    return _len(v.x - this.x, v.y - this.y);
}

/**
 * distance between vectors
 * @param x {number}
 * @param y {number}
 * @return {number}
 */
Vec.prototype.dstXY = function(x, y) {
    return _len(x - this.x, y - this.y);
}

/**
 * distance between vectors squared
 * @param v
 * @return {number}
 */
Vec.prototype.dst2 = function(v) {
    return _len2(v.x - this.x, v.y - this.y);
}

/**
 * distance between vectors squared
 * @param x {number}
 * @param y {number}
 * @return {number}
 */
Vec.prototype.dst2XY = function(x, y) {
    return _len2(x - this.x, y - this.y);
}

/**
 * Normalizes vector, making it's length == 1
 * @return {Vec}
 */
Vec.prototype.nor = function() {
    let l = this.len;
    this.x /= l;
    this.y /= l;
    return this;
}

/**
 * Rotates vector by amount of radians. Counterclockwise, assuming Y points up
 * @param rad {number}
 * @return {Vec}
 */
Vec.prototype.rotate = function(rad) {
    let cos = Math.cos(rad);
    let sin = Math.sin(rad);
    let x = this.x * cos - this.y * sin;
    let y = this.x * sin + this.y * cos;
    this.x = x;
    this.y = y;
    return this;
}

/**
 * Sets angle for vector in radians. Starts at {1, 0}. goes counterclockwise, assuming Y points up
 * @param rad {number}
 * @return {Vec}
 */
Vec.prototype.setAngle = function(rad) {
    this.x = this.len;
    this.y = 0;
    return this.rotate(rad);
}

/**
 * Makes a copy
 * @return {Vec}
 */
Vec.prototype.cpy = function () {
    return new Vec(this.x, this.y);
}
