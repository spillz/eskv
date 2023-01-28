export function rightPad(textArray){
    let finalText = "";
    textArray.forEach(text => {
        text+="";
        for(let i=text.length;i<10;i++){
            text+=" ";
        }
        finalText += text;
    });
    return finalText;
}


export function sizeText(ctx, text, size, centered, rect, color) {
    return 2*size;
}

export function drawText(ctx, text, size, halign, valign, rect, color){
    let scale = 1;
    if(size<1) {
        scale = 0.01;
        ctx.save();
        ctx.scale(scale,scale);
    }
    ctx.fillStyle = color;
    ctx.font = (size>=1? size : Math.ceil(size/scale)) + "px monospace";
    let textX = rect.x;
    let metrics = ctx.measureText(text);
    let textY = rect.y;
    switch(halign){
        case 'left':
            break;
        case 'center':
            textX += (rect.w-scale*metrics.width)/2;
            break;
        case 'right':
            textX += (rect.w-scale*metrics.width);
            break;
    }
    switch(valign) {
        case 'top':
            ctx.textBaseline = 'top';
            textY += 0;
            break;
        case 'middle':
            ctx.textBaseline = 'middle';
            textY += rect.h/2;
            break;
        case 'bottom':
            ctx.textBaseline = 'bottom';
            textY += rect.h;
            break;
    }
    ctx.fillText(text, textX/scale, textY/scale)
    if(size<1) ctx.restore();
}


export function sizeWrappedText(ctx, text, size, centered, rect, color){
    let scale = 1;
    if(size<1) {
        scale = 0.01;
        ctx.save();
        ctx.scale(scale,scale);
    }
    ctx.font = (size>=1? size : Math.ceil(size/scale)) + "px monospace";

    let h = 0;
    while(text!="") {
        let x = rect.x;
        let rowsNeeded = scale*ctx.measureText(text).width / rect.w;
        let maxletters = Math.floor(text.length/rowsNeeded);
        let substr = text.substring(0,maxletters);
        let lastIndex = substr.lastIndexOf(" ");
        if(lastIndex<0 || substr.length==text.length) {
            lastIndex = substr.length;
        }
        substr = substr.substring(0, lastIndex);
        text = text.substring(lastIndex+1);

        h += size;
    }
    if(size<1) ctx.restore();
    return h;
//    return h+size;
}


export function drawWrappedText(ctx, text, size, halign, valign, rect, color){
    //TODO: handle explicit newlines in text
    let scale = 1;
    if(size<1) {
        scale = 0.01;
        ctx.save();
        ctx.scale(scale,scale);
    }
    ctx.fillStyle = color;
    ctx.font = (size>=1? size : Math.ceil(size/scale)) + "px monospace";

    let y = rect.y;

    out_text = [];
    while(text!="") {
        let x = rect.x;
        let rowsNeeded = scale*ctx.measureText(text).width / rect.w;
        let maxletters = Math.floor(text.length/rowsNeeded);
        let substr = text.substring(0,maxletters);
        let lastIndex = substr.lastIndexOf(" ");
        if(lastIndex<0 || substr.length==text.length) {
            lastIndex = substr.length;
        }
        substr = substr.substring(0, lastIndex);
        text = text.substring(lastIndex+1);

        let w = scale*ctx.measureText(substr).width;
        switch(halign){
            case 'left':
                break;
            case 'center':
                x += (rect.w-w)/2;
                break;
            case 'right':
                x += (rect.w-w);
                break;
        }
        out_text.push([substr, x/scale, y/scale]);
        y += size;
    }
    //TODO: Optionally cache this data instead of drawing immediately 
    //(or draw to a backbuffer and cache that instead)
    let h = y-rect.y;
    let off = 0;
    switch(valign) {
        case 'top':
            ctx.textBaseline = 'top';
            off = 0
            break;
        case 'middle':
            ctx.textBaseline = 'middle';
            off = (rect.h-h)/2 + size/2;
            break;
        case 'bottom':
            ctx.textBaseline = 'bottom';
            off = (rect.h-h) + size;
    }
    for(let tdat of out_text) {
        ctx.fillText(tdat[0],tdat[1],tdat[2]+off/scale);
    }
    if(size<1) {
        ctx.restore();
    }
}
