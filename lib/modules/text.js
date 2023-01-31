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


export function sizeText(ctx, text, size, fontName, centered, rect, color) {
    let scale = 1;
    if(size<1) {
        scale = 0.01;
        ctx.save();
        ctx.scale(scale,scale);
    }
    ctx.fillStyle = color;
    ctx.font = (size>=1? size : Math.ceil(size/scale)) + "px "+fontName;
    let textX = rect.x;
    let w = scale*ctx.measureText(text).width;
    if(size<1) ctx.restore();
    return [w, 2*size];
}

export function getTextData(ctx, text, size, fontName, halign, valign, rect, color){
    let scale = 1;
    if(size<1) {
        scale = 0.01;
        ctx.save();
        ctx.scale(scale,scale);
    }
    ctx.fillStyle = color;
    ctx.font = (size>=1? size : Math.ceil(size/scale)) + "px "+fontName;
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
//            textY += 0;
            break;
        case 'middle':
            textY += rect.h/2;
            break;
        case 'bottom':
            textY += rect.h;
            break;
    }
    let textData = {text:text, x:textX/scale, y:textY/scale, color:color, fontName:fontName, size:size, valign:valign};
    if(size<1) ctx.restore();
    return textData;
}

export function drawText(ctx, textData, color=null) {
    let scale = 1;
    let size = textData.size;
    if(color==null) color=textData.color;
    if(size<1) {
        scale = 0.01;
        ctx.save();
        ctx.scale(scale,scale);
    }
    switch(textData.valign) {
        case 'top':
            ctx.textBaseline = 'top';
            break;
        case 'middle':
            ctx.textBaseline = 'middle';
            break;
        case 'bottom':
            ctx.textBaseline = 'bottom';
            break;
    }
    ctx.fillStyle = color;
    ctx.font = (size>=1? size : Math.ceil(size/scale)) + "px "+textData.fontName;
    ctx.fillText(textData.text, textData.x, textData.y);
    if(size<1) ctx.restore();

}


export function sizeWrappedText(ctx, text, size, fontName, centered, rect, color, wordwrap=true){
    let scale = 1;
    if(size<1) {
        scale = 0.01;
        ctx.save();
        ctx.scale(scale,scale);
    }
    ctx.font = (size>=1? size : Math.ceil(size/scale)) + "px " + fontName;

    let h = 0;
    let paraText = "";
    let guess=Math.min(Math.max(1,Math.floor(text.length * rect.w/ctx.measureText(text).width/scale)),text.length);
    // if(wordwrap) {
    //     text=text.trimStart();
    // }
    while(text!="" || paraText!="") {
        if(paraText=="") {
            let n = text.indexOf('\n');
            if(n>=0) {
                paraText = text.slice(0,n);
                text = text.slice(n+1);    
            } else {
                paraText = text;
                text = '';
            }
        }
        let nextLine = paraText.slice(0,guess);
        let w = scale*ctx.measureText(nextLine).width;
        if(w>rect.w && guess>1) {
            while(w>rect.w && guess>1) {
                guess--;
                nextLine=paraText.slice(0,guess);
                w = scale*ctx.measureText(nextLine).width;
            }    
        }
        if(w<rect.w && guess<paraText.length) {
            while(w<rect.w && guess<paraText.length) {
                guess++;
                nextLine=paraText.slice(0,guess);
                w = scale*ctx.measureText(nextLine).width;
            }
            guess--;
        }
        if(wordwrap) {
            if(nextLine[-1]!="" && paraText[guess]!=" "  && paraText[guess]!="\t") {
                let lastIndex = Math.max(nextLine.lastIndexOf(" "),nextLine.lastIndexOf("\t"));
                if(lastIndex>=0) {
                    guess -= nextLine.length-lastIndex-1;
                }
            }  
        }
        guess = Math.max(1,guess);
        nextLine = paraText.slice(0,guess);
        paraText = paraText.slice(guess);
        if(wordwrap) {
            paraText=paraText.trimStart();
        }
        h += size;
    }
    if(size<1) ctx.restore();
    return [rect.w, h];
}

export function getWrappedTextData(ctx, text, size, fontName, halign, valign, rect, color, wordwrap=true){
    //TODO: handle explicit newlines in text
    let scale = 1;
    if(size<1) {
        scale = 0.01;
        ctx.save();
        ctx.scale(scale,scale);
    }
    ctx.fillStyle = color;
    ctx.font = (size>=1? size : Math.ceil(size/scale)) + "px " + fontName;

    let y = rect.y;

    let outText = [];
    // if(wordwrap) {
    //     text=text.trimStart();
    // }
    let paraText = "";
    let guess=Math.min(Math.max(1,Math.floor(text.length * (rect.w/ctx.measureText(text).width)/scale)),text.length);
    while(text!="" || paraText!="") {
        if(paraText=="") {
            let n = text.indexOf('\n');
            if(n>=0) {
                paraText = text.slice(0,n);
                text = text.slice(n+1);    
            } else {
                paraText = text;
                text = '';
            }
        }
        let x = rect.x;
        let nextLine = paraText.slice(0,guess);
        let w = scale*ctx.measureText(nextLine).width;
        if(w>rect.w && guess>1) {
            while(w>rect.w && guess>1) {
                guess--;
                nextLine=paraText.slice(0,guess);
                w = scale*ctx.measureText(nextLine).width;
            }    
        }
        if(w<rect.w && guess<paraText.length) {
            while(w<rect.w && guess<paraText.length) {
                guess++;
                nextLine=paraText.slice(0,guess);
                w = scale*ctx.measureText(nextLine).width;
            }
            guess--;
        }
        if(wordwrap && guess<paraText.length) {
            if(nextLine[-1]!="" && paraText[guess]!=" "  && paraText[guess]!="\t") {
                let lastIndex = Math.max(nextLine.lastIndexOf(" "),nextLine.lastIndexOf("\t"));
                if(lastIndex>=0) {
                    guess -= nextLine.length-lastIndex-1;
                }
            }  
        }
        guess = Math.max(1,guess);
        nextLine = paraText.slice(0,guess);
        paraText = paraText.slice(guess);
        if(wordwrap) {
            paraText=paraText.trimStart();
        }
    
        w = scale*ctx.measureText(nextLine).width;
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
        outText.push([nextLine, x/scale, y/scale]);
        y += size;
    }
    //TODO: Optionally cache this data instead of drawing immediately 
    //(or draw to a backbuffer and cache that instead)
    let h = y-rect.y;
    let off = 0;
    switch(valign) {
        case 'top':
            off = 0
            break;
        case 'middle':
            off = (rect.h-h)/2 + size/2;
            break;
        case 'bottom':
            off = (rect.h-h) + size;
    }
    let textData = {size:size, fontName:fontName, outText:outText, off:off/scale, color:color, valign:valign}
    if(size<1) {
        ctx.restore();
    }
    return textData;
}

export function drawWrappedText(ctx, textData, color=null){
    //TODO: handle explicit newlines in text
    let scale = 1;
    let size = textData.size;
    if(color==null) color=textData.color;
    if(size<1) {
        scale = 0.01;
        ctx.save();
        ctx.scale(scale,scale);
    }
    switch(textData.valign) {
        case 'top':
            ctx.textBaseline = 'top';
            break;
        case 'middle':
            ctx.textBaseline = 'middle';
            break;
        case 'bottom':
            ctx.textBaseline = 'bottom';
            break;
    }
    ctx.fillStyle = color;
    ctx.font = (size>=1? size : Math.ceil(size/scale)) + "px "+textData.fontName;
    for(let tdat of textData.outText) {
        ctx.fillText(tdat[0],tdat[1],tdat[2]+textData.off);
    }
    if(size<1) {
        ctx.restore();
    }
}

