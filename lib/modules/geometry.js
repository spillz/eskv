//@ts-check
/**@typedef {Vec2|[number, number]} VecLike */
/**@typedef {Rect|[number, number, number, number]} RectLike */


/**
 * @module geometry
 */

import { getRandomPos } from "./random.js";

/**
 * Convenience function to create `Vec2` object from scalars
 * @param {number} x 
 * @param {number} y 
 */
export function vec2(x,y) {
    return new Vec2([x,y]);
}

/**
 * Convenience function to create `Vec2` object from tuples of numbers
 * @param {Array<number>} vecLike
 */
export function v2(vecLike) {
    return new Vec2(vecLike);
}

/**
 * A 2-dimension vector object with named x and y properties derived from the standard Array class
 */
export class Vec2 extends Array {
    /**
     * Creates a 2D vector from an array type
     * @param {Array<number>} vec -- array like to construct vector from (uses first two numeric elements)
     */
    constructor(vec = [0,0]){
        super();
        this[0] = vec[0];
        this[1] = vec[1];
    }
    /**
     * 
     * @param {number[]} vec 
     * @returns 
     */
    equals(vec) {
        return this.length===vec.length && this[0]===vec[0] && this[1]===vec[1];
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
     * Expresses a vector `pos` as a proportion of a length `sz`
     * @param {Vec2} pos 
     * @param {number} sz 
     * @returns {Vec2}
     */
    relativeToPS(pos, sz) {
        return this.sub(pos).scale(1/sz);
    }
    /**
     * Scales a vector `pos` in proportional to the length `sz`
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
     * Grow rectangle a fix amount in each direction
     * @param {number} amount 
     * @returns 
     */
    grow(amount) {
        return new Rect([this[0]-amount,this[1]-amount,this[2]+2*amount, this[3]+2*amount]);
    }
    /**
     * Retrieve the center position of the Rect in whole numbers (rounding down)
     */
    get flooredCenter() {
        return new Vec2([Math.floor(this[0]+this[2]/2), Math.floor(this[1]+this[3]/2)]);
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

/**
 * @extends {Array<number>}
 */
export class Grid2D extends Array {
    constructor(tileDim = [0,0]) {
        super(tileDim[0]*tileDim[1]);
        /**@type {Vec2} */
        this.tileDim = new Vec2(tileDim);
        /**@type {Boolean} */
        this.hidden = false;
        /**@type {any} */
        this._cacheData = null;
    }
    /**
     * Return the tile index value of the tilemap at position `pos`
     * @param {VecLike} pos 
     * @returns 
     */
	get(pos) {
        return this[pos[0]+pos[1]*this.tileDim[0]];
	}
    /**
     * Set the index value of the tilemap at position `pos`
     * @param {VecLike} pos 
     * @param {number} val 
     */
	set(pos, val) {
		this[pos[0]+pos[1]*this.tileDim[0]] = val;
	}
    /**
     * Iterate a cells in the line between `pos1` and `pos2`
     * @param {VecLike} pos1 
     * @param {VecLike} pos2
     * @yields {[number, number]}
     */
	*iterBetween(pos1, pos2, tol=0){
		var x1,y1,x2,y2;
		[x1,y1] = pos1;
		[x2,y2] = pos2;
		if(Math.abs(y2 - y1) == 0 && Math.abs(x2 - x1) == 0) {
			return ;
		}
		if(Math.abs(y2 - y1) > Math.abs(x2 - x1)) {
			var slope = (x2 - x1) / (y2 - y1);
			if(y1 > y2) {
                for(var y = y1; y >= y2; y--) {
                    var xa = (x1 + (y - y1) * slope);
                    yield /** @type {[number, number]}*/([xa, y]);
                    // var xa = Math.round((x1 + (y - y1) * slope - tol));
                    // var xb = Math.round((x1 + (y - y1) * slope + tol));
                    // if(xa!==xb) {
                    //     if(slope*(y1-y2)<0) [xa,xb] = [xb,xa];
                    //     yield /** @type {[number, number]}*/([xa, y]);
                    //     yield /** @type {[number, number]}*/([xb, y]);
                    // } else {
                    //     yield /** @type {[number, number]}*/([xa, y]);
                    // }
                }    
			} else {
                for(var y = y1; y <= y2; y++) {
                    var xa = (x1 + (y - y1) * slope);
                    yield /** @type {[number, number]}*/([xa, y]);
                    // var xa = Math.round((x1 + (y - y1) * slope - tol));
                    // var xb = Math.round((x1 + (y - y1) * slope + tol));
                    // if(xa!==xb) {
                    //     if(slope*(y2-y1)<0) [xa,xb] = [xb,xa];
                    //     yield /** @type {[number, number]}*/([xa, y]);
                    //     yield /** @type {[number, number]}*/([xb, y]);
                    // } else {
                    //     yield /** @type {[number, number]}*/([xa, y]);
                    // }
                }    
            }
		}
		else {
			var slope = (y2 - y1) / (x2 - x1);
			if(x1 > x2) {
                for(var x = x1; x >= x2; x--) {
                    var ya = y1 + (x - x1) * slope;
                    yield /** @type {[number, number]}*/([x, ya]);
                    // var ya = Math.round((y1 + (x - x1) * slope - tol));
                    // var yb = Math.round((y1 + (x - x1) * slope + tol));
                    // if(ya!==yb) {
                    //     if(slope*(x2-x1)>0) [ya,yb] = [yb,ya];
                    //     yield /** @type {[number, number]}*/([x, ya]);
                    //     yield /** @type {[number, number]}*/([x, yb]);
                    // } else {
                    //     yield /** @type {[number, number]}*/([x, ya]);
                    // }
                }
			} else {
                for(var x = x1; x <= x2; x++) {
                    var ya = y1 + (x - x1) * slope;
                    yield /** @type {[number, number]}*/([x, ya]);
                    // var ya = Math.round((y1 + (x - x1) * slope - tol));
                    // var yb = Math.round((y1 + (x - x1) * slope + tol));
                    // if(ya!==yb) {
                    //     if(slope*(x2-x1)<0) [ya,yb] = [yb,ya];
                    //     yield /** @type {[number, number]}*/([x, ya]);
                    //     yield /** @type {[number, number]}*/([x, yb]);
                    // } else {
                    //     yield /** @type {[number, number]}*/([x, ya]);
                    // }
                }
            }
		}
	}
    /**
     * Iterate a cells in the line between `pos1` and `pos2`
     * @param {VecLike} pos1 
     * @param {VecLike} pos2
     * @yields {[number, number]}
     */
	*iterInBetween(pos1, pos2){
		var x1,y1,x2,y2;
		[x1,y1] = pos1;
		[x2,y2] = pos2;
		if(Math.abs(y2 - y1) == 0 && Math.abs(x2 - x1) == 0) {
			return ;
		}
		if(Math.abs(y2 - y1) > Math.abs(x2 - x1)) {
			var slope = (x2 - x1) / (y2 - y1);
			if(y1 > y2) {
                for(var y = y1 - 1; y > y2; y--) {
                    var x = Math.round((x1 + (y - y1) * slope));
                    yield /** @type {[number, number]}*/([x, y]);
                }    
			} else {
                for(var y = y1 + 1; y < y2; y++) {
                    var x = Math.round((x1 + (y - y1) * slope));
                    yield /** @type {[number, number]}*/([x, y]);
                }    
            }
		}
		else {
			var slope = (y2 - y1) / (x2 - x1);
			if(x1 > x2) {
                for(var x = x1 - 1; x > x2; x--) {
                    var y = Math.round((y1 + (x - x1) * slope));
                    yield /** @type {[number, number]}*/([x, y]);
                }
			} else {
                for(var x = x1 + 1; x < x2; x++) {
                    var y = Math.round((y1 + (x - x1) * slope));
                    yield /** @type {[number, number]}*/([x, y]);
                }
            }
		}
	}
    /**
     * Iterate over cells in the line between `pos1` and `pos2` that match a tile index values in `types`
     * @param {VecLike} pos1 
     * @param {VecLike} pos2 
     * @param {number[]} types 
     */
	*iterTypesBetween(pos1, pos2, types) {
		for(var pos of this.iterBetween(pos1, pos2)) {
			if(types.includes(this.get(pos))) {
				yield pos;
			}
		}
	}
    /**
     * Iterate over cells in the line between `pos1` and `pos2` that match a tile index values in `types`
     * @param {VecLike} pos1 
     * @param {VecLike} pos2 
     * @param {number[]} types 
     */
	*iterTypesInBetween(pos1, pos2, types) {
		for(var pos of this.iterInBetween(pos1, pos2)) {
			if(types.includes(this.get(pos))) {
				yield pos;
			}
		}
	}
    /**
     * Returns true if the any of the index values in types are on the line between `pos1` and `pos2`
     * @param {VecLike} pos1 
     * @param {VecLike} pos2 
     * @param {number[]} types 
     */
	hasTypesBetween(pos1, pos2, types) {
		for(var pos of this.iterTypesBetween(pos1, pos2, types)) {
			return true;
		}
		return false;
	}
    /**
     * Returns true if the any of the index values in types are on the line between `pos1` and `pos2`
     * @param {VecLike} pos1 
     * @param {VecLike} pos2 
     * @param {number[]} types 
     */
	hasTypesInBetween(pos1, pos2, types) {
		for(var pos of this.iterTypesInBetween(pos1, pos2, types)) {
			return true;
		}
		return false;
	}
    /**
     * 
     * @param {RectLike|null} sub_rect 
     */
	*iterAll(sub_rect=null) {
        const [tw, th] = this.tileDim;
		if(sub_rect !== null) {
			for(var y = sub_rect [1]; y < Math.min(th, sub_rect [1] + sub_rect [3]); y++) {
				for(var x = sub_rect [0]; x < Math.min(tw, sub_rect [0] + sub_rect [2]); x++) {
                    yield /** @type {[number, number]}*/([x, y]);
				}
			}
		}
		else {
			for(var y = 0; y < th; y++) {
				for(var x = 0; x < tw; x++) {
                    yield /** @type {[number, number]}*/([x, y]);
				}
			}
		}
	}
    /**
     * 
     * @param {number[]} types 
     * @param {RectLike} sub_rect 
     */
	*iterTypes(types, sub_rect) {
		for(var pos of this.iterAll(sub_rect)) {
			if(types.includes(this.get(pos))) {
				yield pos;
			}
		}
	}
    /**
     * Iterate over the four orthogonally adjacent positions
     * @param {Vec2} pos 
     */
    *iterAdjacent(pos) {
        for(let dir of [[0,-1], [1,0], [0,1], [-1,0]]) {
            const npos = pos.add(dir);
            if( npos[0]>=0 && npos[0]<this.tileDim[0] && 
                npos[1]>=0 && npos[1]<this.tileDim[1]) yield npos;
        }
    }
    /**
     * Iterate over positions in the circular range of `radius`
     * @param {VecLike} pos 
     * @param {number} radius 
     */
	*iterInRange(pos, radius) {
		var x, y;
		[x, y] = pos;
        const [tw, th] = this.tileDim;
		if(radius == null) radius = 3;
		var rad = Math.ceil(radius);
		for(var yoff = -(rad); yoff < rad + 1; yoff++) {
			for(var xoff = -(rad); xoff < rad + 1; xoff++) {
				if(xoff * xoff + yoff * yoff <= radius * radius) {
					var x0 = x + xoff;
					var y0 = y + yoff;
					if((0 <= y0 && y0 < th) && (0 <= x0 && x0 < tw)) {
                        yield /** @type {[number, number]}*/([x0, y0]);
					}
				}
			}
		}
	}
    /**
     * 
     * @param {VecLike} pos 
     * @param {number[]} types 
     * @param {number} radius 
     * @param {number[]|null} blocker_types 
     */
	*iterTypesInRange(pos, types, radius, blocker_types=null) {
		for(var pos0 of this.iterInRange(pos, radius)){
			if(blocker_types !== null && this.hasTypesBetween(pos, pos0, blocker_types)) continue;
			if(types.includes(this.get(pos0))) yield pos0;
		}
	}
    /**
     * 
     * @param {VecLike} pos 
     * @param {number[]} types 
     * @param {number} radius 
     * @param {number[]|null} blocker_types 
     */
	numInRange(pos, types, radius, blocker_types=null) {
		var num = 0;
		for(var pos0 of this.iterTypesInRange(pos, types, radius, blocker_types)) {
			num++;
		}
		return num;
	}
    /**
     * 
     * @param {Rect} rect 
     * @returns 
     */
    *iterRectBoundary(rect) {
        const [tw,th] = this.tileDim;
		let xl = Math.min(Math.max(rect.x, 0), tw);
		let xu = Math.min(Math.max(rect.x + rect.w,0), tw);
		let yl = Math.min(Math.max(rect.y, 0), th);
		let yu = Math.min(Math.max(rect.y + rect.h,0), th);
        for(let x0 = xl; x0 < xu; x0++) {
            yield /** @type {[number, number]}*/([x0, yl]);
		}
        for(let x0 = xl; x0 < xu; x0++) {
            yield /** @type {[number, number]}*/([x0, yu]);
		}
        for(let y0 = yl; y0 < yu; y0++) {
            yield /** @type {[number, number]}*/([xl, y0]);
		}
        for(let y0 = yl; y0 < yu; y0++) {
            yield /** @type {[number, number]}*/([xu, y0]);
		}

    }
    /**
     * 
     * @param {RectLike} rect 
     * @param {boolean} mustFit 
     * @returns 
     */
	*iterRect(rect, mustFit=true) {
        const [tw, th] = this.tileDim;
        if(!(rect instanceof Rect)) rect = new Rect(rect);
		if(mustFit && (rect.x < 0 || rect.y < 0 || rect.right > tw || rect.bottom > th)) {
			return ;
		}
		let xl = Math.max(rect.x, 0);
		let xu = Math.min(rect.x + rect.w, tw);
		let yl = Math.max(rect.y, 0);
		let yu = Math.min(rect.y + rect.h, th);
		for(let y0 = yl; y0 < yu; y0++) {
			for(let x0 = xl; x0 < xu; x0++) {
                yield /** @type {[number, number]}*/([x0, y0]);
			}
		}
	}
    /**
     * 
     * @param {RectLike} rect 
     * @param {number[]} targets 
     * @param {boolean} mustFit 
     */
	numInRect(rect, targets, mustFit=true) {
		let num = 0;
		for(var pos of this.iterRect(rect, mustFit)) {
			if(targets.includes(this.get(pos))) num++;
		}
		return num;
	}

}