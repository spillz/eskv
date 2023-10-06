//@ts-check

/**
 * @module geometry
 */

import { getRandomPos } from "./random.js";

/**
 * A 2-dimension vector object with named x and y properties derived from the standard Array class
 */
export class Vec2 extends Array {
    /**
     * Creates a 2D vector from an array type
     * @param {Array<number>} vec -- array like to construct vector from (uses first two numeric elements)
     */
    constructor(vec){
        super();
        this[0] = vec[0];
        this[1] = vec[1];
    }
    /**
     * 
     * @param {Array<number>} vec 
     * @returns {Vec2}
     */
    static random(vec) {
        return new Vec2(getRandomPos(vec[0],vec[1]));
    }
    /**
     * Adds a vector to this vector
     * @param {Array<number>} vec - vector to add
     * @returns {Vec2}
     */
    add(vec) {
        return new Vec2([this[0]+vec[0],this[1]+vec[1]]);
    }
    /**
     * Subtracts a vector from this vector
     * @param {Array<number>} vec - vector to subtract
     * @returns {Vec2}
     */
    sub(vec) {
        return new Vec2([this[0]-vec[0],this[1]-vec[1]]);
    }
    /**
     * Scales elements of this vector
     * @param {number} scalar - amount to scale this vector
     * @returns {Vec2}
     */
    scale(scalar) {
        return new Vec2([this[0]*scalar,this[1]*scalar]);
    }
    /**
     * Element-wise multiplication
     * @param {Array<number>} vec - array like to element-wise multiply with this vector
     * @returns {Vec2}
     */
    mul(vec) {
        return new Vec2([this[0]*vec[0],this[1]*vec[1]]);
    }
    /**
     * Element-wise division
     * @param {Array<number>} vec - array like to element-wise divided this vector by
     * @returns {Vec2}
     */
    div(vec) {
        return new Vec2([this[0]/vec[0],this[1]/vec[1]]);
    }
    /**
     * Dot-product
     * @param {*} vec - array-like to element-wise dot product with this vector
     * @returns {number}
     */
    dot(vec) {
        return this[0]*vec[0]+this[1]*vec[1];
    }
    /**
     * Euclidean distance a vector and this vector
     * @param {Array<number>} vec - array-like to calculate distance from
     * @returns 
     */
    dist(vec) {
        return Math.hypot(this[0]-vec[0],this[1]-vec[1]);
    }
    /**
     * Absolute value of elements
     * @returns  {Vec2}
     */
    abs() {
        return new Vec2([Math.abs(this[0]),Math.abs(this[1])]);
    }
    /**
     * Sum of the elements
     * @returns {number}
     */
    sum() {
        return this[0] + this[1];
    }
    /**
     * Expresses a vector as a proportional position within a rectangle
     * @param {Rect} rect 
     * @returns {Vec2}
     */
    relativeTo(rect) {
        return this.sub(rect.pos).div(rect.size);
    }
    /**
     * Scales a vector in proportional coordinates relative to the rect to absolute coordinates
     * @param {Rect} rect 
     * @returns {Vec2}
     */
    absoluteFrom(rect) {
        return this.mul(rect.size).add(rect.pos);
    }
    /**
     * Expresses a vector as a proportional position within a rectangle
     * @param {Vec2} pos 
     * @param {number} sz 
     * @returns {Vec2}
     */
    relativeToPS(pos, sz) {
        return this.sub(pos).scale(1/sz);
    }
    /**
     * Scales a vector in proportional coordinates relative to the rect to absolute coordinates
     * @param {Vec2} pos 
     * @param {number} sz 
     * @returns {Vec2}
     */
    absoluteFromPS(pos, sz) {
        return this.scale(sz).add(pos);
    }
    /**
     * First element of vector
     * @type {number}
     */
    set x(val) {
        this[0] = val;
    }
    /**
     * Second element of vector
     * @type {number}
     */
    set y(val) {
        this[1] = val;
    }
    get x() {
        return this[0];
    }
    get y() {
        return this[1];
    }
}

/**
 * Array-like representation of a rectangle with properties
 * x = 0 element, left 
 * y = 1 element, right
 * w = 2 element, width
 * h = 3 element, height
 */
export class Rect extends Array {
    /**
     * Creates a rectangle from an array type specify left, top, width, and heigh parameters.
     * Initialized to zero if rect is null or missing
     * @param {Array<number>|null} rect 
     * @returns 
     */
    constructor(rect=null){
        super();
        if(rect===null) {
            this[0] = 0;
            this[1] = 0;
            this[2] = 0;
            this[3] = 0;
            return;
        }
        this[0] = rect[0];
        this[1] = rect[1];
        this[2] = rect[2];
        this[3] = rect[3];
    }
    /**
     * @type {number}
     */
    set x(val) {
        this[0] = val;
    }
    /**
     * @type {number}
     */
    set y(val) {
        this[1] = val;
    }
    /**
     * @type {number}
     */
    set w(val) {
        this[2] = val;
    }
    /**
     * @type {number}
     */
    set h(val) {
        this[3] = val;
    }
    /**
     * @type {[number, number]} [x, y] positional coordinates of the rectangle
     */
    set pos(vec) {
        this[0] = vec[0];
        this[1] = vec[1];
    }
    /**
     * @type {[number, number]} [widget, height] of the rectangle
     */
    set size(vec) {
        this[2] = vec[2];
        this[3] = vec[3];
    }
    get size() {
        return new Vec2([this[2],this[3]]);
    }
    get pos() {
        return new Vec2([this[0],this[1]]);
    }
    get x() {
        return this[0];
    }
    get y() {
        return this[1];
    }
    get w() {
        return this[2];
    }
    get h() {
        return this[3];
    }
    /**
     * Rightmost position of rectangle 
     * @type {number}
     * @readonly
     */
    get right() {
        return this[0]+this[2];        
    }    
    /**
     * Bottom-most position of rectangle 
     * @type {number}
     * @readonly
     */
    get bottom() {
        return this[1]+this[3];
    }
    /**
     * Center position of widget on the x-axis
     * @readonly
     */
    get center_x() {
        return this[0]+this[2]/2;        
    }
    /**
     * Center position of widget on the y-axis
     * @readonly
     */
    get center_y() {
        return this[1]+this[3]/2;        
    }
    /**
     * Vector repesenting of the center position of the widget
     * @type {Vec2}
     * @readonly
     */
    get center() {
        return new Vec2([this.center_x, this.center_y]);
    }
    /**
     * Shift the rectangle in 2D space
     * @param {[number, number]} pos - array-like representing the amount to shift the rect by in XY space
     * @returns {Rect}
     */
    translate(pos) {
        return new Rect([this.x+pos[0],this.y+pos[1],this.w,this.h]);
    }
    /**
     * Creates a new rectangle with borders shrunk by the fixed amount value
     * @param {number} value 
     * @returns {Rect}
     */
    shrinkBorders(value) {
        return new Rect([this.x+value, this.y+value, this.w-value*2, this.h-value*2]);
    }
    /**
     * Creates a new rectangle with borders shrunk by the fixed amount value
     * @param {number} scale
     * @returns {Rect}
     */
    scaleBorders(scale) {
        return new Rect([this.x+this.w*(1-scale)/2, this.y+this.h*(1-scale)/2, this.w*scale, this.h*scale]);
    }
    /**
     * Returns a new rectangle that scales each element of rectangle by a fixed amount 
     * @param {number} scalar - amount to scale each element by 
     * @returns {Rect}
     */
    mult(scalar) {
        return new Rect([
            this[0]*scalar,
            this[1]*scalar,
            this[2]*scalar,
            this[3]*scalar,
        ])        
    }
    /**
     * Returns a new rectangle that scales each element of rectangle by a fixed amount 
     * @param {[number,number]} vec - amount to scale X and Y dimensions
     * @returns {Rect}
     */
    multXY(vec) {
        return new Rect([
            this[0]*vec[0],
            this[1]*vec[1],
            this[2]*vec[0],
            this[3]*vec[1],
        ])        
    }
    /**
     * Returns a rectangle that scales the width and height of this rectangle, optionally repositioning to retain the position of the center
     * @param {number} scalar - amount to multiple the width and height by
     * @param {boolean} centered - if true, repositions to keep the center position unchanged
     * @returns {Rect}
     */
    scale(scalar, centered=true) {
        if(centered){
            let news = [this[2]*scalar, this[3]*scalar];
            return new Rect([
                    this[0] + 0.5*(this[2]-news[0]), 
                    this[1] + 0.5*(this[3]-news[1]),
                    news[0],
                    news[1]
                ]);
        } else {
            let news = [this[2]*scalar, this[3]*scalar];
            return new Rect([
                    this[0],
                    this[1],
                    news[0],
                    news[1]
                ]);

        }
    }
    /**
     * Returns true if the center of rect and this Rect have a Euclidean distance less than radius.
     * If radius is missing using the smallest value of the width or height of the two rectangles divided by two.
     * @param {Rect} rect 
     * @param {number|null} radius 
     * @returns {boolean}
     */
    collideRadius(rect, radius=null) {
        let d = [this.center_x-rect.center_x, this.center_y-rect.center_y];
        if(radius===null) {
            radius = Math.min(this.w,this.h,rect.w,rect.h)/2;
        }
        return d[0]*d[0] + d[1]*d[1] < radius*radius;
    }
    /**
     * Return true if rect and this Rect overlap.
     * @param {*} rect 
     * @returns {boolean}
     */
    collide(rect) {
        if(this.x < rect.x + rect.w &&
            this.x + this.w > rect.x &&
            this.y < rect.y + rect.h &&
            this.h + this.y > rect.y)
            return true;
        return false;
    }
    /**
     * Return true if this Rect fully encloses rect.
     * @param {Rect} rect 
     * @returns {boolean}
     */
    contains(rect) {
        return this.x <= rect.x && this.y<= rect.y && this.x+this.w>=rect.x+rect.w && this.y+this.h>=rect.y+rect.h;
    }
    /**
     * Return true if rect and this Rect overlap or touch.
     * @param {*} rect 
     * @returns {boolean}
     */
    contact(rect) {
        if(this.x <= rect.x + rect.w &&
            this.x + this.w >= rect.x &&
            this.y <= rect.y + rect.h &&
            this.h + this.y >= rect.y)
            return true;
        return false;
    }
    /**
     * Returns true if the center of rect and this Rect have a Euclidean distance less than of equal to radius.
     * If radius is missing using the smallest value of the width or height of the two rectangles divided by two.
     * @param {Rect} rect 
     * @param {number|null} radius 
     * @returns {boolean}
     */
    contactRadius(rect, radius=null) {
        let d = [this.center_x-rect.center_x, this.center_y-rect.center_y];
        if(radius===null) {
            radius = Math.min(this.w,this.h,rect.w,rect.h);
        }
        return d[0]*d[0] + d[1]*d[1] <= radius*radius;
    }
}

