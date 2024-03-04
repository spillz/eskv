//@ts-check

import {App} from './app.js'
import {Vec2, Rect} from './geometry.js'
import {Widget, Resource} from './widgets.js'

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
			this.timeLeft += this.timePerFrame;
		}
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
	id = '';
	/**@type {Set<number>} */
	tiles = new Set();
	/**@type {Map<number, number>} */
	autos = new Map();
	/**
	 * 
	 * @param {string} id 
	 * @param {number} tileCount 
	 */
	constructor(id, tileCount) {
		this.id = id;
	}
	/**
	 * 
	 * @param {Vec2} pos 
	 * @param {TileMap} map 
	 */
	autoTile(pos, map) {
		let auto = 0;
		let level = 1;
		for(let delta of [[0,1],[0,-1],[1,0],[-1,0]]) {
			const aPos = pos.add(delta);
			const aTile = map.get(aPos);
			if(this.tiles.has(aTile)) {
				auto += level;
			}
			level *= 2;
		}
		const ind = this.autos.get(auto);
		if(ind) {
			map.set(pos, ind);
		}
	}
	get length() {
		return this.tiles.size;
	}
}



/**A sprite sheet represents a collection of fixed size (square) sprites
 * on a single `sheet` of type `Image`. A sprite sheet can contain maps
 * of
 * - `animations`: indexed collection of animations
 * - `autoTiles`: named collection of autoTiles
 * - `tileStamps`: named collection of tileStamps
 */
export class SpriteSheet extends Resource {
	/**@type {Map<number, SpriteAnimation>} */
	animations = new Map();
	/**@type {Map<string, AutoTiler>} */
	autoTiles = new Map();
	/**@type {Map<string, TileStamp>} */
	tileStamps = new Map();
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
        };
    }
    /**@pp.type {Resource['update']} */
    update(app, millis) {
        for(let a of this.animations.values()) {
            a.update(app, millis);
        }
    }
    /**
     * Draw an indexed tilemap reference to a specified x,y position on the canvas
     * @param {*} ind  
     * @param {*} x 
     * @param {*} y 
     */
    drawIndexed(ind, x, y) {
        if(ind<-1) {
            ind = this.animations.get(ind)?.tileValue??-1;
        }
        if(ind>=0) {
            const [flipped, angle, indY, indX] = unpackSpriteInfo(ind, this.len, this.sw);
            if(!flipped && angle===0) {
                this.draw([indX,indY], x, y);
            } else {
                this.drawRotated([indX,indY], x+0.5, y+0.5, angle*90, flipped, "center");
            }	
        }
    }
    /**
     * 
     * @param {[number, number]} spriteLoc 
     * @param {number} x 
     * @param {number} y 
     * @param {boolean} flipX
     */
    draw(spriteLoc, x, y, flipX=false){
        const ctx = /**@type {CanvasRenderingContext2D}*/(App.get().ctx)
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
     * @param {[number, number]} spriteLoc 
     * @param {number} x 
     * @param {number} y 
     * @param {number} scale 
     * @param {boolean} flipX 
     */
    drawScaled(spriteLoc, x, y, scale, flipX=false){
        const ctx = /**@type {CanvasRenderingContext2D}*/(App.get().ctx)
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
     * @param {[number, number]} spriteLoc 
     * @param {number} x 
     * @param {number} y 
     * @param {number} angle 
     * @param {boolean} flipx 
     * @param {[number, number]|'center'} anchor 
     */
    drawRotated(spriteLoc, x, y, angle, flipx=false, anchor='center'){
        const ctx = /**@type {CanvasRenderingContext2D}*/(App.get().ctx)
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
    drawRotatedMultitile(spriteLoc, x, y, angle, flipx=false, anchor='center'){ //same as drawRotated but spriteloc is 4-item array referencing the sprite location: [x,y,w,h]
        const ctx = /**@type {CanvasRenderingContext2D}*/(App.get().ctx)
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
	/**
	 * 
	 * @param {App} app 
	 * @param {number} millis
	 */
	update(app, millis) {
		this.timeLeft -= millis;
		if(this.timeLeft<=0) {
			this.activeFrame++;
			this.timeLeft += this.timePerFrame;
		}
	}
	get tileValue() {
		return this.frames[this.activeFrame]??-1;
	}
	/**
	 * 
	 * @param {App} app 
	 * @param {CanvasRenderingContext2D} ctx 
	 */
	draw(app, ctx) {
		if(this.spriteSheet===null) return;
        this.spriteSheet.drawIndexed(this.tileValue, this.x, this.y);
    }		
}

export class TileMap extends Widget {
    /**width and height in tiles of the tilemap */
    tileDim = new Vec2([1,1]);
    /** @type {SpriteSheet|null} */
    spriteSheet = null;
    _data = [0];
    /**@type {import('./widgets.js').EventCallbackNullable} */
    on_tileDim(evt, obj, val) {
        this._data.length = this.tileDim[0]*this.tileDim[1]
        this._data.fill(0);
    }
    /**
     * Return the index value of the tilemap at position `pos`
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
	*iterBetween(pos1, pos2){
		var x1,y1,x2,y2;
		[x1,y1] = pos1;
		[x2,y2] = pos2;
		if(Math.abs(y2 - y1) == 0 && Math.abs(x2 - x1) == 0) {
			return ;
		}
		if(Math.abs(y2 - y1) > Math.abs(x2 - x1)) {
			var slope = (x2 - x1) / (y2 - y1);
			if(y1 > y2) {
				[y1,y2] = [y2, y1];
				[x1,x2] = [x2, x1];
			}
			for(var y = y1 + 1; y < y2; y++) {
				var x = Math.round((x1 + (y - y1) * slope));
				yield /** @type {[number, number]}*/([x, y]);
			}
		}
		else {
			var slope = (y2 - y1) / (x2 - x1);
			if(x1 > x2) {
				[y1,y2] = [y2, y1];
				[x1,x2] = [x2, x1];
			}
			for(var x = x1 + 1; x < x2; x++) {
				var y = Math.round((y1 + (x - x1) * slope));
				yield /** @type {[number, number]}*/([x, y]);
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
		for(var yoff = -(rad); yoff < rad + 1; yoff++) {Rect
			for(var xoff = -(rad); xoff < rad + 1; xoff++) {
				if(xoff * xoff + yoff * yoff <= radius * radius) {
					var x0 = x + xoff;
					var y0 = y + yoff;
					if((0 <= y0 && y0 < th) && (0 <= x0 && x0 < tw)) {
                        yield /** @type {[number, number]}*/([x, y]);
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
		var xl = Math.max(rect.x, 0);
		var xu = Math.min(rect.x + rect.w, tw);
		var yl = Math.max(rect.y, 0);
		var yu = Math.min(rect.y + rect.h, th);
		for(var y0 = yl; y0 < yu; y0++) {
			for(var x0 = xl; x0 < xu; x0++) {
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
        const [tw, th] = this.tileDim;
        if(this.spriteSheet===null) return;
        if (!this.spriteSheet.sheet.complete || this.spriteSheet.sheet.naturalHeight == 0) return;
		const sw = Math.floor(this.spriteSheet.sheet.width/this.spriteSheet.spriteSize);
		const sh = Math.floor(this.spriteSheet.sheet.height/this.spriteSheet.spriteSize);
		const len = sw*sh;
        for(let x=0;x<tw;x++) {
            for(let y=0;y<th;y++) {
                let ind = this.get([x,y]);
				this.spriteSheet.drawIndexed(ind, x+this.x, y+this.y);
            }
        }
    }
}

export class LayeredTileMap extends TileMap {
    activeLayer = 0;
    numLayers = 1;
    /**@type {number[][]} */
    _layerData = [];
    /**@type {Set<number>} */
    _hiddenLayers = new Set();
    /**@type {import('./widgets.js').EventCallbackNullable} */
    on_tileDim(evt, obj, val) {
        for(let l of this._layerData) {
            l.length = this.tileDim[0]*this.tileDim[1]
            l.fill(0);
        }
    }
    /**@type {import('./widgets.js').EventCallbackNullable} */
    on_numLayers(evt, obj, val) {
        const oldLen = this._layerData.length;
        this._layerData.length = this.numLayers;
        for(let i=oldLen;i<this.numLayers;i++) {
            const l = new Array(this.tileDim[0]*this.tileDim[1]).fill(0);
            this._layerData.push(l);
        }
    }
    /**@type {import('./widgets.js').EventCallbackNullable} */
    on_activeLayer(evt, obj, val) {
        this._data = this._layerData[this.activeLayer];
    }
    /**@type {Widget['draw']} */
    draw(app, ctx) {
        for(let i=0;i<this._layerData.length;i++) {
            if(!this._hiddenLayers.has(i)) {
                this._data = this._layerData[i];
                super.draw(app, ctx);
            }
        }
    }
}