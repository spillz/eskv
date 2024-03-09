//@ts-check

import {App} from './app.js'
import {Vec2, Rect} from './geometry.js'
import {Widget, EventSink} from './widgets.js'

/**@typedef {Vec2|[number, number]} VecLike */
/**@typedef {Rect|[number, number, number, number]} RectLike */

/**
 * 
 * @param {number} ind 
 * @param {number} len 
 * @param {number} sw 
 * @returns {[boolean, number, number, number]}
 */
export function unpackSpriteInfo(ind, len, sw) {
	const flipped = Math.floor(ind/len/4)>0;
	ind = ind%(len*4);
	const angle = Math.floor(ind/len);
	ind = ind%len;
	const indY = Math.floor(ind/sw);
	const indX = ind%sw;
	return [flipped, angle, indY, indX]
}

/**
 * 
 * @param {Vec2} spriteIndex 2D reference
 * @param {boolean} flipped horizontally flipped
 * @param {number} angle rotate angle (0-3, 90 degree increments)
 * @param {number} len total sheet area in tiles
 * @param {number} sw sheet width in tiles
 * @returns 
 */
export function packSpriteInfo2D(spriteIndex, flipped, angle, len, sw) {
	return spriteIndex[0] + spriteIndex[1]*sw + angle*len + (flipped?4*len:0);
}


/**
 * 
 * @param {number} spriteIndex 
 * @param {boolean} flipped 
 * @param {number} angle 
 * @param {number} len 
 * @returns 
 */
export function packSpriteInfo(spriteIndex, flipped, angle, len) {
	return spriteIndex + angle*len + (flipped?4*len:0);
}


/**
 * 
 * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx 
 * @param {[number, number]} p1 arrow origin
 * @param {[number, number]} p2 arrow destination
 * @param {number} size arrowhead size
 * @param {number} apos fractional position of the arrowhead on the line
 */
export function drawArrow(ctx,p1,p2,size,apos=0){
    ctx.save();

    // var points = edges(ctx,p1,p2);
    // if (points.length < 2) return 
    // p1 = points[0], p2=points[points.length-1];

    // Rotate the context to point along the path
    var dx = p2[0]-p1[0], dy=p2[1]-p1[1], len=Math.sqrt(dx*dx+dy*dy);
    ctx.translate(p2[0],p2[1]);
    ctx.rotate(Math.atan2(dy,dx));

    // line
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(-len,0);
    ctx.closePath();
    ctx.stroke();

    // arrowhead
    ctx.beginPath();
    ctx.moveTo(-apos*len+size/2,0);
    ctx.lineTo(-apos*len-size/2,-size/2);
    ctx.lineTo(-apos*len-size/2, size/2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

export class SpriteAnimation {
	/**@type {number[]} */
	frames = [];
	timePerFrame = 30;
	timeLeft = 0;
	activeFrame = 0;
	id = '';
	/**
	 * 
	 * @param {App} app 
	 * @param {number} millis
	 */
	update(app, millis) {
		this.timeLeft -= millis;
		if(this.timeLeft<=0) {
			this.activeFrame++;
            if(this.activeFrame>=this.frames.length) this.activeFrame=0;
			this.timeLeft += this.timePerFrame;
		}
        App.get().requestFrameUpdate();
	}
	get tileValue() {
		return this.frames[this.activeFrame]??-1;
	}
}

/**
 * A tilestamp is a rectangular region of sprites that can be position on a map
 */
export class TileStamp {
	id = '';
	shape = new Vec2([0,0]);
	/**@type {number[]} */
	_data = [];
	/**
	 * 
	 * @param {Vec2} pos 
	 * @param {TileMap} map 
	 */
	place(pos, map) {
		let i = 0;
		for(let p of map.iterRect([pos[0], pos[1], this.shape[0], this.shape[1]])) {
			map.set(p, this._data[i]);
			i++;
		}
	}
	/**
	 * 
	 * @param {Rect} rect 
	 * @param {TileMap} map 
	 */
	set(rect, map) {
		this.shape = new Vec2([rect.w, rect.h]);
		this._data.length = 0;
		for(let p of map.iterRect(rect)) {
			this._data.push(map.get(p));
		}
	}
}

/**
 * An AutoTiler is a collection of sprite vertices for drawing connected
 * sprites of a certain type (Walls, Roads etc) onto a `TileMap`
 */
export class AutoTiler {
    /**
     * Constructs an autotiler
     * @param {string} id The name of the autotiler (optional)
     * @param {number[]} matchTiles The list of valid tile indexes that can be autotiled
     * @param {number[]} matchAdjTiles The list of valid adjacent tile indexes that can be autotiled
     * @param {Object<number, number>} autos The mapping from adjacency bits to autotiled indexes
     */
	constructor(id='', matchTiles=[], matchAdjTiles=[], autos={}) {
        /**@type {string} */
		this.id = id;
        /**@type {Set<number>} */
        this.matchTiles = new Set(matchTiles);
        /**@type {Set<number>} */
        this.matchAdjTiles = new Set(matchAdjTiles);
        /**@type {Object<number, number>} */
        this.autos = autos;
	}
	/**
	 * Autotile at position `pos` using `testMap` to check for valid values and setting 
     * the replacement tile in `destMap`. `testMap` and `destMap` should be the same size.
	 * @param {Vec2} pos 
	 * @param {TileMap} testMap 
	 * @param {TileMap} destMap 
	 */
	autoTile(pos, testMap, destMap) {
		let auto = 0;
		let level = 1;
        const tile = testMap.get(pos);
        if(this.matchTiles.has(tile)) {
            for(let delta of [[0,-1],[1,0],[0,1],[-1,0]]) {
                const aPos = pos.add(delta);
                const aTile = testMap.get(aPos);
                if(this.matchAdjTiles.has(aTile)) {
                    auto += level;
                }
                level *= 2;
            }
            const ind = this.autos[auto]??undefined;
            if(ind) {
                destMap.set(pos, ind);
            }    
        }
	}
	get length() {
		return this.matchTiles.size;
	}
}



/**A sprite sheet represents a collection of fixed size (square) sprites
 * on a single `sheet` of type `Image`. A sprite sheet can contain maps
 * of
 * - `animations`: indexed collection of animations
 * - `autoTiles`: named collection of autoTiles
 * - `tileStamps`: named collection of tileStamps
 * - `aliases`: named aliases for cell index values (including animations)
 */
export class SpriteSheet extends EventSink {
	/**@type {Map<number, SpriteAnimation>} */
	animations = new Map();
	/**@type {Map<string, AutoTiler>} */
	autoTiles = new Map();
	/**@type {Map<string, TileStamp>} */
	tileStamps = new Map();
    /**@type {Map<string, number>} */
    aliases = new Map();
    /**
     * 
     * @param {string} srcFile 
     * @param {number} spriteSize 
     */
    constructor(srcFile, spriteSize=16) {
        super();
        this.spriteSize = spriteSize;
        this.sw = 0;
        this.sh = 0;
        this.len = 0;
        this.sheet = new Image();
        this.sheet.src = srcFile;
        this.sheet.onload = (ev)=>{
            this.sw = Math.floor(this.sheet.width/this.spriteSize);
            this.sh = Math.floor(this.sheet.height/this.spriteSize);
            this.len = this.sw*this.sh;
            this.emit('sheetLoaded', this.sheet);
        };
    }
    /**
     * Retrieves the alias for a given cell index value
     * @param {number|undefined} index 
     */
    getAlias(index) {
        for(let k of this.aliases.keys()) {
            if(this.aliases.get(k)===index) return k;
        }
    }
    /**@type {EventSink['update']} */
    update(app, millis) {
        super.update(app, millis);
        for(let a of this.animations.values()) {
            a.update(app, millis);
        }
    }
    sheetToDataURL() {
        // Convert the canvas to a data URL (Base64 string)
        const canvas = document.createElement("canvas");
        canvas.width = this.sheet.width;
        canvas.height = this.sheet.height;
        const ctx = canvas.getContext("2d");
        if(!ctx) return;
        ctx.drawImage(this.sheet, 0, 0);
        const imageDataUrl = canvas.toDataURL('image/png'); // You can use 'image/jpeg' or other formats    
        return imageDataUrl;
    }
    serialize() {
        const data = {};
        data['spriteSize'] = this.spriteSize;
        data['src'] = this.sheetToDataURL(); //this.sheet.src;
        const animations = {}
        for(let k of this.animations.keys()) animations[String(k)] = this.animations.get(k);
        data['animations'] = animations;
        const aliases = {}
        for(let k of this.aliases.keys()) aliases[k] = this.aliases.get(k);
        data['aliases'] = aliases;
        return data;
        //TODO: To support tileStamps and autoTiles we need serialization methods for the AutoTile and TileStamp classes
        // data['tileStamps'] = new Map(this.tileStamps);
        // data['autoTiles'] = new Map(this.autoTiles);
    }
    /**
     * 
     * @param {Object} data 
     */
    deserialize(data) {
         this.spriteSize = data['spriteSize'];
         this.sheet = new Image();
         this.sheet.src = data['src'];
         this.animations = new Map();
         for(let k in data['animations']) this.animations.set(parseInt(k), data['animations'][k]);
         this.aliases = new Map();
         for(let k in data['aliases']) this.aliases.set(k, data['aliases'][k]);
        //TODO: To support tileStamps and autoTiles we need serialization methods for the AutoTile and TileStamp classes
        // this.tileStamps = new Map(data['tileStamps']);
        // this.autoTiles = new Map(data['autoTiles']);
    }
    /**
     * Draw an indexed tilemap reference to a specified x,y position on the canvas
     * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx
     * @param {*} ind  
     * @param {*} x 
     * @param {*} y 
     */
    drawIndexed(ctx, ind, x, y, extraAngle=0) {
        if(ind<-1) {
            ind = this.animations.get(ind)?.tileValue??-1;
        }
        if(ind>=0) {
            let [flipped, angle, indY, indX] = unpackSpriteInfo(ind, this.len, this.sw);
            angle = (angle+extraAngle)%4;
            if(!flipped && angle===0) {
                this.draw(ctx, [indX,indY], x, y);
            } else {
                this.drawRotated(ctx, [indX,indY], x+0.5, y+0.5, angle*90, flipped, "center");
            }	
        }
    }
    /**
     * 
     * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx
     * @param {[number, number]} spriteLoc 
     * @param {number} x 
     * @param {number} y 
     * @param {boolean} flipX
     */
    draw(ctx, spriteLoc, x, y, flipX=false){
        let flipped = flipX?-1:1;
        if(flipX) {
            ctx.scale(-1,1);
        }
        ctx.drawImage(
            this.sheet,
            spriteLoc[0]*this.spriteSize,
            spriteLoc[1]*this.spriteSize,
            this.spriteSize,
            this.spriteSize,
            flipped*x,
            y,
            flipped,
            1
        );
        if(flipX) {
            ctx.scale(-1,1);
        }
    }
    /**
     * 
     * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx
     * @param {[number, number]} spriteLoc 
     * @param {number} x 
     * @param {number} y 
     * @param {number} scale 
     * @param {boolean} flipX 
     */
    drawScaled(ctx, spriteLoc, x, y, scale, flipX=false){
        let flipped = flipX?-1:1;
        if(flipX) {
            ctx.scale(-1,1);
        }
        ctx.drawImage(
            this.sheet,
            spriteLoc[0]*this.spriteSize,
            spriteLoc[1]*this.spriteSize,
            this.spriteSize,
            this.spriteSize,
            flipped*(x),
            y,
            flipped*scale,
            scale
        );
        if(flipX) {
            ctx.scale(-1,1);
        }
    }
    /**
     * 
     * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx
     * @param {[number, number]} spriteLoc 
     * @param {number} x 
     * @param {number} y 
     * @param {number} angle 
     * @param {boolean} flipx 
     * @param {[number, number]|'center'} anchor 
     */
    drawRotated(ctx, spriteLoc, x, y, angle, flipx=false, anchor='center'){
        ctx.save();
//        let flipped = 1 - 2*flipx;
        if(anchor == 'center') {
            anchor = [1/2,1/2];
        } else {
            anchor = [anchor[0], anchor[1]];
        }
        ctx.translate(x, y);
        ctx.rotate(angle * Math.PI / 180);
        if(flipx) {
            ctx.scale(-1,1);
        }
        ctx.translate(-anchor[0], -anchor[1]);
        ctx.drawImage(
            this.sheet,
            spriteLoc[0]*this.spriteSize,
            spriteLoc[1]*this.spriteSize,
            this.spriteSize,
            this.spriteSize,
            0, //-game.tileSize+anchor[0],
            0, //-game.tileSize+anchor[1],
            1,
            1
        );
        ctx.restore();
    }
    /**
     * 
     * @param {[number, number, number, number]} spriteLoc 
     * @param {number} x 
     * @param {number} y 
     * @param {number} angle 
     * @param {boolean} flipx 
     * @param {[number, number]|'center'} anchor 
     */
    drawRotatedMultitile(ctx, spriteLoc, x, y, angle, flipx=false, anchor='center'){ //same as drawRotated but spriteloc is 4-item array referencing the sprite location: [x,y,w,h]
        ctx.save();
        let tw = spriteLoc[2];
        let th = spriteLoc[3];
        if(anchor == 'center') {
            anchor = [tw*1/2,th*1/2];
        } else {
            anchor = [anchor[0], anchor[1]];
        }
        ctx.translate(x + anchor[0], 
                        y + anchor[1]);
        ctx.rotate(angle * Math.PI / 180);
        if(flipx) {
            ctx.scale(-1,1);
        }
        ctx.translate(-anchor[0], -anchor[1]);
        ctx.drawImage(
            this.sheet,
            spriteLoc[0]*this.spriteSize,
            spriteLoc[1]*this.spriteSize,
            this.spriteSize*tw,
            this.spriteSize*th,
            0,
            0,
            tw,
            th
        );
        ctx.restore();
    }
}

export class SpriteWidget extends Widget {
    /** @type {SpriteSheet|null} */
    spriteSheet = null;
	frames = [];
	timePerFrame = 30;
	timeLeft = 0;
	activeFrame = 0;
	id = '';
	index = -1;
    facing = 0;
    flipX = false;
    flipY = false;
    constructor(props={}) {
        super();
        if(props) this.updateProperties(props)
    }
	/**
	 * 
	 * @param {App} app 
	 * @param {number} millis
	 */
	update(app, millis) {
        super.update(app, millis);
		this.timeLeft -= millis;
		if(this.timeLeft<=0) {
			this.activeFrame++;
            if(this.activeFrame>=this.frames.length) this.activeFrame=0;
			this.timeLeft += this.timePerFrame;
		}
        if(this.frames.length>0) {
            App.get().requestFrameUpdate();
        }
	}
	get tileValue() {
		return this.frames[this.activeFrame]??-1;
	}
    layoutChildren() {
        super.layoutChildren();
    }
	/**
	 * 
	 * @param {App} app 
	 * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx 
	 */
	draw(app, ctx) {
		if(this.spriteSheet===null || !this.spriteSheet.sheet.complete) return;
        ctx.translate(this.x, this.y);
        ctx.scale(this.w, this.h);
        this.spriteSheet.drawIndexed(ctx, this.tileValue, 0, 0, this.facing);
        ctx.scale(1/this.w, 1/this.h);
        ctx.translate(-this.x, -this.y);    
    // if(this.w===1 && this.h===1) {
    //         this.spriteSheet.drawIndexed(ctx, this.tileValue, this.x, this.y, this.facing);
    //     } else {
    //     }
    }		
}

export class TileMap extends Widget {
    /**width and height in tiles of the tilemap */
    tileDim = new Vec2([1,1]);
    /**width and height in tiles of the tilemap */
    _cacheTileDim = new Vec2(this.tileDim);
    /** @type {SpriteSheet|null} */
    spriteSheet = null;
    /**@type {Rect|null} If set to a rectangle, only the portion within the rectangle will be drawn*/
    clipRegion = null;
    _data = [0];
    /**@type {number[]|null} */
    _vLayer = null;
    /**@type {number[]|null} */
    _aLayer = null;
    alphaValue = 0.5;
    constructor(props={}) {
        super();
        this.hints = {w:null, h:null}
        if(props) this.updateProperties(props)
    }
    /**
     * 
     * @returns {Object}
     */
    serialize() {
        const data = {};
        data['_data'] = this._data.slice();
        data['tileDim'] = this.tileDim.slice();
        data['spriteSheet'] = Array(...App.resources.keys()).find((k)=>App.resources[k]===this.spriteSheet)??null;
        return data;
    }
    /**
     * 
     * @param {Object} data 
     */
    deserialize(data) {
        this._data = data['_data'].slice()??[0];
        this.tileDim = new Vec2(data['tileDim']??[0,0])
        this.spriteSheet = App.resources[data['spriteSheet']]??null;
    }
    /**@type {import('./widgets.js').EventCallbackNullable} */
    on_tileDim(evt, obj, val) {
        this.resizeData();
        this.w = this.tileDim[0];
        this.h = this.tileDim[1];
        this._cacheTileDim = new Vec2(this.tileDim);
    }
    resizeData() {
        let cacheData = []
        for(let y=0;y<this._cacheTileDim[1];y++) {
            for(let x=0;x<this._cacheTileDim[0];x++) {
                cacheData.push(this.get([x,y]));
            }
        }
        this._data.length = this.tileDim[0]*this.tileDim[1];
        this._data.fill(0);
        let i=0;
        for(let y=0;y<this._cacheTileDim[1];y++) {
            for(let x=0;x<this._cacheTileDim[0];x++) {
                if(x<this.tileDim[0] && y<this.tileDim[1]) this.set([x,y],cacheData[i]);
                ++i;
            }
        }
    }
    /**
     * Return the tile index value of the tilemap at position `pos`
     * @param {VecLike} pos 
     * @returns 
     */
	get(pos) {
        return this._data[pos[0]+pos[1]*this.tileDim[0]];
	}
    /**
     * Set the index value of the tilemap at position `pos`
     * @param {VecLike} pos 
     * @param {number} val 
     */
	set(pos, val) {
		this._data[pos[0]+pos[1]*this.tileDim[0]] = val;
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
    /**@type {Widget['draw']} */
    draw(app, ctx) {
        super.draw(app,ctx);
		if(this.spriteSheet===null || !this.spriteSheet.sheet.complete) return;
        if (!this.spriteSheet.sheet.complete || this.spriteSheet.sheet.naturalHeight == 0) return;
        let [x0, y0] = [0,0];
        let [x1, y1] = this.tileDim;
        if(this.clipRegion) {
            [x0, y0] = this.clipRegion.pos;
            [x1, y1] = this.clipRegion.pos.add(this.clipRegion.size).add([1,1]);
            x0 = Math.min(Math.max(x0,0), this.tileDim[0]);
            x1 = Math.min(Math.max(x1,0), this.tileDim[0]);
            y0 = Math.min(Math.max(y0,0), this.tileDim[1]);
            y1 = Math.min(Math.max(y1,0), this.tileDim[1]);
        }
        const sw = Math.floor(this.spriteSheet.sheet.width/this.spriteSheet.spriteSize);
		const sh = Math.floor(this.spriteSheet.sheet.height/this.spriteSheet.spriteSize);
		const len = sw*sh;
        if(this._aLayer===null && this._vLayer===null) {
            for(let x=x0;x<x1;x++) {
                for(let y=y0;y<y1;y++) {
                    let ind = this.get([x,y]);
                    this.spriteSheet.drawIndexed(ctx, ind, x+this.x, y+this.y);
                }
            }    
        } else {
            // if(this._aLayer===null) this._aLayer=this._vLayer;
            // if(this._vLayer===null) this._vLayer=this._aLayer;
            const origAlpha = ctx.globalAlpha;
            for(let x=x0;x<x1;x++) {
                for(let y=y0;y<y1;y++) {
                    let ind = this.get([x,y]);
                    if(!this._vLayer || this._vLayer[x+y*this.tileDim[0]]>0) {
                        if(this._aLayer && this._aLayer[x+y*this.tileDim[0]]===0) {
                            ctx.globalAlpha = this.alphaValue;
                            this.spriteSheet.drawIndexed(ctx, ind, x+this.x, y+this.y);
                            ctx.globalAlpha = origAlpha;    
                        } else {
                            this.spriteSheet.drawIndexed(ctx, ind, x+this.x, y+this.y);
                        }    
                    }
                }
            }    

        }
    }
}

export class LayeredTileMap extends TileMap {
    _data = [0];
    /**@type {number[][]} */
    _layerData = [this._data];
    /**@type {boolean[]} */
    _hiddenLayers = [false];
    activeLayer = 0;
    numLayers = 1;
    visibilityLayer = -1;
    alphaLayer = -1;
    constructor(props={}) {
        super();
        if(props) this.updateProperties(props)
    }
    on_alphaLayer(e,o,v) {
        this._aLayer = this.alphaLayer>=0? this._layerData[this.alphaLayer]: null;
    }
    on_visibilityLayer(e,o,v) {
        this._vLayer = this.visibilityLayer>=0? this._layerData[this.visibilityLayer]: null;
    }
    serialize() {
        const data = {};
        const layerCopy = [];
        for(let l of this._layerData) {
            layerCopy.push(l.slice())
        }
        data['_layerData'] = layerCopy;
        data['activeLayer'] = this.activeLayer;
        data['numLayers'] = this.numLayers;
        data['tileDim'] = this.tileDim.slice();
        data['spriteSheet'] = Array(...App.resources.keys()).find((k)=>App.resources[k]===this.spriteSheet)??null;
        return data;
    }
    /**
     * 
     * @param {Object} data 
     */
    deserialize(data) {
        const layerCopy = []
        for(let l of data['_layerData']) {
            layerCopy.push(l.slice())
        }
        this._layerData = layerCopy;
        this.numLayers = data['numLayers'];
        this.activeLayer = data['acitveLayer'];
        this.tileDim = new Vec2(data['tileDim']??[0,0]);
        this.spriteSheet = App.resources[data['spriteSheet']]??null;
    }
    /**@type {import('./widgets.js').EventCallbackNullable} */
    on_tileDim(evt, obj, val) {
        if(!('_layerData' in this)) return;
        for(let l of this._layerData) {
            this._data = l;
            this.resizeData();
        }
        if(this.activeLayer>=0) this._data = this._layerData[this.activeLayer];
        this.w = this.tileDim[0];
        this.h = this.tileDim[1];
        this._cacheTileDim = new Vec2(this.tileDim);
    }
    /**@type {import('./widgets.js').EventCallbackNullable} */
    on_numLayers(evt, obj, val) {
        const oldLen = this._layerData.length;
        this._layerData.length = this.numLayers;
        this._hiddenLayers.length = this.numLayers;
        for(let i=oldLen;i<this.numLayers;i++) {
            const layer = new Array(this.tileDim[0]*this.tileDim[1]).fill(0);
            this._layerData[i] = layer;
            this._hiddenLayers[i] = false;
        }
        if(this.activeLayer>=this.numLayers) this.activeLayer=this.numLayers-1;
    }
    /**@type {import('./widgets.js').EventCallbackNullable} */
    on_activeLayer(evt, obj, val) {
        this._data = this._layerData[this.activeLayer];
    }
    /**
     * Returns the value at position `pos` of layer `layer`
     * @param {number} layer 
     * @param {VecLike} pos 
     */
    getFromLayer(layer, pos) {
        return this._layerData[layer][pos[0]+pos[1]*this.tileDim[0]]
    }
    /**
     * Sets value `val` at position `pos` of layer `layer`
     * @param {number} layer 
     * @param {VecLike} pos 
     * @param {number} val
     */
    setInLayer(layer, pos, val) {
        this._layerData[layer][pos[0]+pos[1]*this.tileDim[0]] = val;
    }
    /**@type {Widget['draw']} */
    draw(app, ctx) {
        for(let i=0;i<this._layerData.length;i++) {
            if(!this._hiddenLayers[i]) {
                this._data = this._layerData[i];
                super.draw(app, ctx);
            }
        }
        this._data = this._layerData[this.activeLayer];
    }
}