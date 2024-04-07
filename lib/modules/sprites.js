//@ts-check

import {Vec2, Rect, Grid2D} from './geometry.js';
import {Widget, Resource, App, ScrollView} from './widgets.js';

/**@typedef {import('./geometry.js').VecLike} VecLike */

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
        app.requestFrameUpdate();
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
		for(let p of map._data.iterRect([pos[0], pos[1], this.shape[0], this.shape[1]])) {
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
		for(let p of map._data.iterRect(rect)) {
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
export class SpriteSheet extends Resource {
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
            App.get().emit('sheetLoaded', this.sheet);
            App.get()._needsLayout = true;
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
    /**@type {Resource['update']} */
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
         this.sheet.onload = (ev)=>{
            this.sw = Math.floor(this.sheet.width/this.spriteSize);
            this.sh = Math.floor(this.sheet.height/this.spriteSize);
            this.len = this.sw*this.sh;
            App.get().emit('sheetLoaded', this.sheet);
            App.get()._needsLayout = true;
        };
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
     * @param {number} ind  
     * @param {number} x 
     * @param {number} y 
     * @param {number} dx 
     * @param {number} dy 
     */
    drawIndexed(ctx, ind, x, y, extraAngle=0, dx=0, dy=0) {
        if(ind<-1) {
            ind = this.animations.get(ind)?.tileValue??-1;
        }
        if(ind>=0) {
            let [flipped, angle, indY, indX] = unpackSpriteInfo(ind, this.len, this.sw);
            angle = (angle+extraAngle)%4;
            if(!flipped && angle===0) {
                this.draw(ctx, [indX,indY], x+dx, y+dy);
            } else {
                this.drawRotated(ctx, [indX,indY], x+0.5, y+0.5, angle*90, flipped, [0.5-dx,0.5-dy]);
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

export class LayeredAnimationFrame extends Array {
    /**
     * 
     * @param {number[]} frames 
     * @param {[number, number][]} offsets 
     */
    constructor(frames, offsets) {
        super()
        for(let i=0; i<frames.length; ++i) {
            if(offsets[i]) {
                this.push(frames[i],offsets[i][0],offsets[i][1]);
            } else {
                this.push(frames[i],0,0);
            }
        }
    }
    /**
     * Yields [frame, x-offset, y-offset] tuples
     * @yields {[number, number, number]}
     */
    *iter() {
        for(let i=0; i<this.length/3; i++) {
            yield this.slice(i*3, i*3+3);
        }
    }
}


export function laf(frames=[], offsets=[]) {
    return new LayeredAnimationFrame(frames, offsets);
}

export class SpriteWidget extends Widget {
    /** @type {SpriteSheet|null} */
    spriteSheet = null;
    /** @type {number[]|LayeredAnimationFrame[]} */
	frames = [];
	timePerFrame = 30;
	timeLeft = 0;
	activeFrame = 0;
	id = '';
    facing = 0;
    flipX = false;
    flipY = false;
    oneShot = false;
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
            if(this.oneShot && this.activeFrame===this.frames.length - 1) {
                this.timeLeft = Infinity;
                this.emit('animationComplete', this.activeFrame);
                return;
            }
            this.activeFrame++;
            if(this.activeFrame>=this.frames.length) {
                this.activeFrame=0;
            } 
			this.timeLeft += this.timePerFrame;
		}
        if(this.frames.length>0 && this.timeLeft!==Infinity) {
            app.requestFrameUpdate();
        }
	}
    restart() {
        this.activeFrame = 0;
        this.timeLeft = this.timePerFrame;
    }
    on_frames(e,o,v) {
        this.restart();
    }
	get frame() {
		return this.frames[this.activeFrame]??-1;
	}
	/**
	 * 
	 * @param {App} app 
	 * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx 
	 */
	draw(app, ctx) {
		if(this.spriteSheet===null || !this.spriteSheet.sheet.complete) return;
        const tx = Math.floor(this.x*app.tileSize)/(app.tileSize);
        const ty = Math.floor(this.y*app.tileSize)/(app.tileSize)
        ctx.translate(tx, ty);
        ctx.scale(this.w, this.h);
        if(this.frame instanceof LayeredAnimationFrame) {
            for(let [f, dx, dy] of this.frame.iter()) {
                this.spriteSheet.drawIndexed(ctx, f, 0, 0, this.facing, dx, dy);
            }
        } else {
            this.spriteSheet.drawIndexed(ctx, this.frame, 0, 0, this.facing);
        }
        ctx.scale(1/this.w, 1/this.h);
        ctx.translate(-tx, -ty);
    // if(this.w===1 && this.h===1) {
    //         this.spriteSheet.drawIndexed(ctx, this.tileValue, this.x, this.y, this.facing);
    //     } else {
    //     }
    }		
}

export class TileMap extends Widget {
    constructor(props={}) {
        super();
        this.defaultValue = -1;
        /**@type {Grid2D} */
        this._data = new Grid2D();
        /**@type {Grid2D|null} */
        this._vLayer = null;
        /**@type {Grid2D|null} */
        this._aLayer = null;
        /**width and height in tiles of the tilemap */
        this._cacheTileDim = new Vec2();
        /**width and height in tiles of the tilemap */
        this.tileDim = new Vec2();
        this.hints = {w:null, h:null}
        /** @type {SpriteSheet|null} */
        this.spriteSheet = null;
        /**@type {Rect|null} If set to a rectangle, only the portion within the rectangle will be drawn*/
        this.clipRegion = null;
        this.alphaValue = 0.5;
        this.useCache = true;
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
     * @param {VecLike} pos 
     * @returns 
     */
    get(pos) {
        return this._data.get(pos)
    }
    /**
     * 
     * @param {VecLike} pos 
     * @param {number} value 
     */
    set(pos, value) {
        this._data.set(pos, value);
        this._data._cacheData = null;
    }
    get data() {
        return this._data;
    }
    /**
     * 
     * @param {Object} data 
     */
    deserialize(data) {
        this.tileDim = new Vec2(data['tileDim']??[0,0])
        const _data = data['_data'];
        for(let i=0;i<_data.length;i++) {
            this._data[i] = _data[i];
        }
        this.spriteSheet = App.resources[data['spriteSheet']]??null;
        this._data._cacheData = null;
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
        this._data.tileDim = new Vec2(this.tileDim);
        this._data.length = this.tileDim[0]*this.tileDim[1];
        this._data.fill(this.defaultValue);
        let i=0;
        for(let y=0;y<this._cacheTileDim[1];y++) {
            for(let x=0;x<this._cacheTileDim[0];x++) {
                if(x<this.tileDim[0] && y<this.tileDim[1]) this.set([x,y],cacheData[i]);
                ++i;
            }
        }
        this._data._cacheData = null;
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
        if(this.useCache) {
            if(this._data._cacheData===null) this.cacheCanvas();
            if(this._data._cacheData===null) return;
            const s = this.spriteSheet.spriteSize;
            ctx.drawImage(this._data._cacheData, s*x0, s*y0, s*(x1-x0), s*(y1-y0),
                this.x+x0, this.y+y0, x1-x0, y1-y0);
            if(this._aLayer===null && this._vLayer===null) {
                for(let x=x0;x<x1;x++) {
                    for(let y=y0;y<y1;y++) {
                        let p = x+y*this.tileDim[0];
                        let ind = this._data[p];
                        if(ind<-1) this.spriteSheet.drawIndexed(ctx, ind, x+this.x, y+this.y);
                    }
                }    
            } else if (this._aLayer && this._vLayer) {
                const aL = this._aLayer;
                const vL = this._vLayer;
                const origAlpha = ctx.globalAlpha;
                const dat = this._data;
                for(let x=x0;x<x1;x++) {
                    for(let y=y0;y<y1;y++) {
                        let p = x+y*this.tileDim[0];
                        let ind = dat[p]; //this.get([x,y]);
                        if(ind<-1 && vL[p]>0) {
                            if(aL[p]===0) {
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
        } else {
            if(this._aLayer===null && this._vLayer===null) {
                for(let x=x0;x<x1;x++) {
                    for(let y=y0;y<y1;y++) {
                        let p = x+y*this.tileDim[0];
                        let ind = this._data[p];
                        this.spriteSheet.drawIndexed(ctx, ind, x+this.x, y+this.y);
                    }
                }    
            } else if (this._aLayer && this._vLayer) {
                const aL = this._aLayer;
                const vL = this._vLayer;
                const origAlpha = ctx.globalAlpha;
                const dat = this._data;
                for(let x=x0;x<x1;x++) {
                    for(let y=y0;y<y1;y++) {
                        let p = x+y*this.tileDim[0];
                        let ind = dat[p]; //this.get([x,y]);
                        if(ind!==-1 && vL[p]>0) {
                            if(aL[p]===0) {
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
    clearCache() {
        this.data._cacheData = null;
    }
    cacheCanvas() {
        this._data._cacheData = null;
        if(!this.spriteSheet || !this.spriteSheet.sheet || this.tileDim[0]<=0 || this.tileDim[1]<=0) return;
        const _cacheData = new OffscreenCanvas(this.tileDim[0]*this.spriteSheet.spriteSize, this.tileDim[1]*this.spriteSheet.spriteSize);
        const cacheCtx = _cacheData.getContext('2d');
        if(!cacheCtx) return;
        cacheCtx.scale(this.spriteSheet.spriteSize, this.spriteSheet.spriteSize);
        let [x0,y0] = [0,0];
        let [x1,y1] = this.tileDim;
        if(this._aLayer===null && this._vLayer===null) {
            for(let x=x0;x<x1;x++) {
                for(let y=y0;y<y1;y++) {
                    let p = x+y*this.tileDim[0];
                    let ind = this._data[p];
                    if(ind>=0) {
                        this.spriteSheet.drawIndexed(cacheCtx, ind, x, y);
                    }
                }
            }    
        } else if (this._aLayer && this._vLayer) {
            const aL = this._aLayer;
            const vL = this._vLayer;
            const origAlpha = cacheCtx.globalAlpha;
            const dat = this._data;
            for(let x=x0;x<x1;x++) {
                for(let y=y0;y<y1;y++) {
                    let p = x+y*this.tileDim[0];
                    let ind = dat[p]; //this.get([x,y]);
                    if(ind>=0 && vL[p]>0) {
                        if(aL[p]===0) {
                            cacheCtx.globalAlpha = this.alphaValue;
                            this.spriteSheet.drawIndexed(cacheCtx, ind, x, y);
                            cacheCtx.globalAlpha = origAlpha;    
                        } else {
                            this.spriteSheet.drawIndexed(cacheCtx, ind, x, y);
                        }    
                    } 
                }
            }
        }
        this._data._cacheData = _cacheData;
    }
}

export class LayeredTileMap extends TileMap {
    constructor(props={}) {
        super();
        /**@type {Grid2D[]} */
        this._layerData = [this._data];
        this.numLayers = 1;
        this.activeLayer = 0;
        this.visibilityLayer = -1;
        this.alphaLayer = -1;
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
        const layerCopy = [];
        this.numLayers = data['numLayers'];
        this.activeLayer = data['activeLayer'];
        this.tileDim = new Vec2(data['tileDim']??[0,0]);
        const n = data['_layerData'].length
        this._layerData.length = n;
        for(let i=0;i<n;i++) {
            const lout = this._layerData[i];
            const lin = data['_layerData'][i];
            for(let j=0; j<lin.lenth;j++) {
                lout[j] = lin[j];
            }
        }
        this.spriteSheet = App.resources[data['spriteSheet']]??null;
        this.clearCache()
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
        for(let i=oldLen;i<this.numLayers;i++) {
            const layer = new Grid2D(this.tileDim).fill(this.defaultValue);
            this._layerData[i] = layer;
        }
        if(this.activeLayer>=this.numLayers) this.activeLayer=this.numLayers-1;
    }
    /**@type {import('./widgets.js').EventCallbackNullable} */
    on_activeLayer(evt, obj, val) {
        this._data = this._layerData[this.activeLayer];
    }
    get layer() {
        return this._layerData;
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
        this._layerData[layer]._cacheData = null;
    }
    clearCache() {
        for(let l of this._layerData) l._cacheData = null;
    }
    /**@type {Widget['draw']} */
    draw(app, ctx) {
        for(let l of this._layerData) {
            if(!l.hidden) {
                this._data = l;
                super.draw(app, ctx);
            }
        }
        this._data = this._layerData[this.activeLayer];
    }
}