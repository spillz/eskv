import {App} from './app.js'

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



export class SpriteSheet {
    constructor(src_file, spriteSize=16) {
        this.spriteSize = spriteSize;
        this.sheet = new Image()
        this.sheet.src = src_file;
    }
    draw(spriteLoc, x, y, flipx=false){
        let flipped = 1 - 2*flipx;
        if(flipx) {
            App.get().ctx.scale(-1,1);
        }
        App.get().ctx.drawImage(
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
        if(flipx) {
            App.get().ctx.scale(-1,1);
        }
    }
    drawScaled(spriteLoc, x, y, scale, flipx=false){
        let flipped = 1 - 2*flipx;
        if(flipx) {
            App.get().ctx.scale(-1,1);
        }
        App.get().ctx.drawImage(
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
        if(flipx) {
            App.get().ctx.scale(-1,1);
        }
    }
    drawRotated(spriteLoc, x, y, angle, flipx=false, anchor='center'){
        App.get().ctx.save();
//        let flipped = 1 - 2*flipx;
        if(anchor == 'center') {
            anchor = [1/2,1/2];
        } else {
            anchor = [anchor[0], anchor[1]];
        }
        App.get().ctx.translate(x, y);
        App.get().ctx.rotate(angle * Math.PI / 180);
        if(flipx) {
            App.get().ctx.scale(-1,1);
        }
        App.get().ctx.translate(-anchor[0], -anchor[1]);
        App.get().ctx.drawImage(
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
        App.get().ctx.restore();
    }
    drawRotatedMultitile(spriteLoc, x, y, angle, flipx=false, anchor='center'){ //same as drawRotated but spriteloc is 4-item array referencing the sprite location: [x,y,w,h]
        App.get().ctx.save();
        let tw = spriteLoc[2];
        let th = spriteLoc[3];
//        let flipped = 1 - 2*flipx;
        if(anchor == 'center') {
            anchor = [tw*1/2,th*1/2];
        } else {
            anchor = [anchor[0], anchor[1]];
        }
        App.get().ctx.translate(x + anchor[0], 
                        y + anchor[1]);
        App.get().ctx.rotate(angle * Math.PI / 180);
        if(flipx) {
            App.get().ctx.scale(-1,1);
        }
        App.get().ctx.translate(-anchor[0], -anchor[1]);
        App.get().ctx.drawImage(
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
        App.get().ctx.restore();
    }
}

