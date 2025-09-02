//@ts-check
import { Rect } from './geometry.js';


/**
 * @typedef {[string,number,number]} TextLine
 */

/**
 * @typedef {Object} TextRenderingData
 * @property {TextLine[]} outText
 * @property {string} color
 * @property {string} fontName
 * @property {number} size
 * @property {'top'|'middle'|'bottom'} valign
 * @property {number} [off]
 */

/**
 * 
 * @param {string} url URL/URI to read file from
 * @param {boolean} trim trim trailing/leading whitespace from each line
 * @returns 
 */
export async function fetchLinesFromTextfile(url, trim = false) {
    const response = await fetch(url);
    const text = await response.text();
    const lines = trim ? text.split('\n').map(line => line.trim()) : text.split('\n');
    return lines;
}


export function rightPad(textArray) {
    let finalText = "";
    textArray.forEach(text => {
        text += "";
        for (let i = text.length; i < 10; i++) {
            text += " ";
        }
        finalText += text;
    });
    return finalText;
}


const minFontSize = 8;
const scaleFactor = 48 * (1.0 / window.devicePixelRatio || 1);

/**
 * Returns the size [width, height] needed to render text for given parameters
 * @param {CanvasRenderingContext2D} ctx 
 * @param {string} text text to be rendered
 * @param {number} size size of font
 * @param {string} fontName name of font
 * @param {boolean} centered name of font
 * @param {Rect} rect rectangular region for label widget
 * @param {string} color color of widget
 * @returns {[number, number]} width and height needed to render the text at given font size
 */
export function sizeText(ctx, text, size, fontName, centered, rect, color) {
    let scale = 1;
    if (size < minFontSize) {
        scale = 1.0 / scaleFactor;
        ctx.save();
        ctx.scale(scale, scale);
    }
    ctx.fillStyle = color;
    ctx.font = (size >= minFontSize ? size : Math.ceil(size / scale)) + "px " + fontName;
    let textX = rect.x;
    let w = scale * ctx.measureText(text).width;
    if (size < minFontSize) ctx.restore();
    return [w, 2 * size];
}

/**
 * Constructs the text rendering data to save recalculating before rendering every update
 * @param {CanvasRenderingContext2D} ctx 
 * @param {string} text 
 * @param {number} size 
 * @param {string} fontName 
 * @param {"left"|"right"|"center"} halign 
 * @param {"bottom"|"middle"|"top"} valign 
 * @param {Rect} rect 
 * @param {string} color 
 * @returns {TextRenderingData}
 */
export function getTextData(ctx, text, size, fontName, halign, valign, rect, color) {
    let scale = 1;
    if (size < minFontSize) {
        scale = 1.0 / scaleFactor;
        ctx.save();
        ctx.scale(scale, scale);
    }
    ctx.fillStyle = color;
    ctx.font = (size >= minFontSize ? size : Math.ceil(size / scale)) + "px " + fontName;
    let textX = rect.x;
    let metrics = ctx.measureText(text);
    let textY = rect.y;
    switch (halign) {
        case 'left':
            break;
        case 'center':
            textX += (rect.w - scale * metrics.width) / 2;
            break;
        case 'right':
            textX += (rect.w - scale * metrics.width);
            break;
    }
    switch (valign) {
        case 'top':
            //            textY += 0;
            break;
        case 'middle':
            textY += rect.h / 2;
            break;
        case 'bottom':
            textY += rect.h;
            break;
    }
    /**@type {TextLine} */
    let outText = [text, textX / scale, textY / scale];
    let textData = { outText: [outText], color: color, fontName: fontName, size: size, valign: valign };
    if (size < minFontSize) ctx.restore();
    return textData;
}

/**
 * Draws single-line text to the canvas rendering context
 * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx 
 * @param {TextRenderingData} textData 
 * @param {string|null} color 
 */
export function drawText(ctx, textData, color = null) {
    let scale = 1;
    let size = textData.size;
    if (color == null) color = textData.color;
    if (size < minFontSize) {
        scale = 1.0 / scaleFactor;
        ctx.save();
        ctx.scale(scale, scale);
    }
    switch (textData.valign) {
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
    ctx.font = (size >= minFontSize ? size : Math.ceil(size / scale)) + "px " + textData.fontName;
    let [t, x, y] = textData.outText[0];
    ctx.fillText(t, x, y);
    if (size < minFontSize) ctx.restore();

}


/**
 * Returns the size [width, height] needed to render text for given parameters
 * @param {CanvasRenderingContext2D} ctx 
 * @param {string} text text to be rendered
 * @param {number} size size of font
 * @param {string} fontName name of font
 * @param {boolean} centered flag to indicate centered text (does not affect calculation)
 * @param {Rect} rect rectangular region for label widget
 * @param {string} color color of widget
 * @param {boolean} wordwrap flag for word wrap (true) vs character wrap (false)
 * @returns {[number, number]} width and height needed to render the text at given font size
 */
export function sizeWrappedText(ctx, text, size, fontName, centered, rect, color, wordwrap = true) {
    if (!text) return [rect.w, size]; // fast path

    let scale = 1;
    if (size < minFontSize) {
        scale = 1.0 / scaleFactor;
        ctx.save();
        ctx.scale(scale, scale);
    }
    ctx.font = (size >= minFontSize ? size : Math.ceil(size / scale)) + "px " + fontName;

    let h = 0;
    let paraText = "";
    // Initial guess proportional to width; clamp to [1, text.length]
    let guess = Math.min(
        Math.max(1, Math.ceil(text.length * (rect.w / (ctx.measureText(text).width || 1)) / scale)),
        text.length
    );

    while (text !== "" || paraText !== "") {
        if (paraText === "") {
            const n = text.indexOf('\n');
            if (n >= 0) {
                paraText = text.slice(0, n);
                text = text.slice(n + 1);
            } else {
                paraText = text;
                text = '';
            }
        }

        guess = Math.max(1, Math.min(guess, paraText.length)); // keep sane
        let nextLine = paraText.slice(0, guess);
        let w = scale * ctx.measureText(nextLine).width;

        // shrink to fit
        if (w > rect.w && guess > 1) {
            while (w > rect.w && guess > 1) {
                guess--;
                nextLine = paraText.slice(0, guess);
                w = scale * ctx.measureText(nextLine).width;
            }
        }

        // grow to fill
        if (w < rect.w && guess < paraText.length) {
            while (w < rect.w && guess < paraText.length) {
                guess++;
                nextLine = paraText.slice(0, guess);
                w = scale * ctx.measureText(nextLine).width;
            }
            if (w > rect.w) guess--;
        }

        // --- word wrap adjustment (fixes) ---
        if (wordwrap && guess > 0) {
            const lastChar = nextLine.at ? (nextLine.at(-1) ?? "") : (nextLine[nextLine.length - 1] ?? "");
            const nextChar = (guess < paraText.length) ? paraText[guess] : " ";
            const isSpace = (c) => c === " " || c === "\t";

            // We split mid-word iff: lastChar not space AND nextChar not space
            if (!isSpace(lastChar) && !isSpace(nextChar)) {
                const lastSpace = Math.max(nextLine.lastIndexOf(" "), nextLine.lastIndexOf("\t"));
                if (lastSpace >= 0) {
                    guess -= (nextLine.length - lastSpace - 1);
                }
            }
        }
        // -------------------------------------

        guess = Math.max(1, guess);
        nextLine = paraText.slice(0, guess);
        paraText = paraText.slice(guess);

        if (wordwrap) paraText = paraText.trimStart();

        h += size;
        // Carry forward a reasonable next guess for the next loop iteration
        guess = Math.min(guess, Math.max(1, paraText.length));
    }

    h += size; // bottom padding (as in your original)
    if (size < minFontSize) ctx.restore();
    return [rect.w, h];
}

/**
 * Constructs the multiline text rendering data to save recalculating before rendering every update
 * @param {CanvasRenderingContext2D} ctx 
 * @param {string} text 
 * @param {number} size 
 * @param {string} fontName 
 * @param {"left"|"right"|"center"} halign 
 * @param {"bottom"|"middle"|"top"} valign 
 * @param {Rect} rect 
 * @param {string} color 
 * @param {boolean} wordwrap
 * @returns {TextRenderingData}
 */
export function getWrappedTextData(ctx, text, size, fontName, halign, valign, rect, color, wordwrap = true) {
    let scale = 1;
    if (size < minFontSize) {
        scale = 1.0 / scaleFactor;
        ctx.save();
        ctx.scale(scale, scale);
    }
    ctx.fillStyle = color;
    ctx.font = (size >= minFontSize ? size : Math.ceil(size / scale)) + "px " + fontName;

    let y = rect.y;

    /** @type {TextLine[]} */
    const outText = [];

    let paraText = "";
    const totalW = ctx.measureText(text).width || 1; // avoid div-by-zero
    let guess = Math.min(
        Math.max(1, Math.ceil(text.length * ((rect.w / totalW) / scale))),
        Math.max(1, text.length)
    );

    while (text !== "" || paraText !== "") {
        if (paraText === "") {
            const n = text.indexOf('\n');
            if (n >= 0) {
                paraText = text.slice(0, n);
                text = text.slice(n + 1);
            } else {
                paraText = text;
                text = '';
            }
        }

        // keep guess sane for current paragraph
        guess = Math.max(1, Math.min(guess, paraText.length));

        let nextLine = paraText.slice(0, guess);
        let w = scale * ctx.measureText(nextLine).width;

        // shrink to fit
        if (w > rect.w && guess > 1) {
            while (w > rect.w && guess > 1) {
                guess--;
                nextLine = paraText.slice(0, guess);
                w = scale * ctx.measureText(nextLine).width;
            }
        }

        // grow to fill (then step back if we overflowed)
        if (w < rect.w && guess < paraText.length) {
            while (w < rect.w && guess < paraText.length) {
                guess++;
                nextLine = paraText.slice(0, guess);
                w = scale * ctx.measureText(nextLine).width;
            }
            if (w > rect.w) guess--;
        }

        // --- word-wrap backtrack at whitespace (fixed) ---
        if (wordwrap && guess < paraText.length && guess > 0) {
            const lastChar = nextLine.at ? (nextLine.at(-1) ?? "") : (nextLine[nextLine.length - 1] ?? "");
            const nextChar = (guess < paraText.length) ? paraText[guess] : " ";
            const isSpace = (c) => c === " " || c === "\t";

            // Only backtrack if we're splitting mid-word
            if (!isSpace(lastChar) && !isSpace(nextChar)) {
                const lastSpace = Math.max(nextLine.lastIndexOf(" "), nextLine.lastIndexOf("\t"));
                if (lastSpace >= 0) {
                    guess -= (nextLine.length - lastSpace - 1);
                }
            }
        }
        // -----------------------------------------------

        guess = Math.max(1, Math.min(guess, paraText.length));
        nextLine = paraText.slice(0, guess);
        paraText = paraText.slice(guess);
        if (wordwrap) paraText = paraText.trimStart();

        // measure final line width for alignment
        w = scale * ctx.measureText(nextLine).width;

        let x = rect.x;
        switch (halign) {
            case 'center': x += (rect.w - w) / 2; break;
            case 'right': x += (rect.w - w); break;
            case 'left':
            default: break;
        }

        outText.push([nextLine, x / scale, y / scale]);
        y += size;

        // seed next guess roughly where we left off
        guess = Math.min(guess, Math.max(1, paraText.length));
    }

    // vertical offset for valign
    const h = y - rect.y;
    let off = 0;
    switch (valign) {
        case 'middle': off = (rect.h - h) / 2 + size / 2; break;
        case 'bottom': off = (rect.h - h) + size; break;
        case 'top':
        default: off = 0; break;
    }

    const textData = {
        size,
        fontName,
        outText,
        off: off / scale,
        color,
        valign
    };

    if (size < minFontSize) ctx.restore();
    return textData;
}

/**
 * Draws wrapped text to the canvas rendering context
 * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx 
 * @param {TextRenderingData} textData 
 * @param {string|null} color 
 */
export function drawWrappedText(ctx, textData, color = null) {
    //TODO: handle explicit newlines in text
    let scale = 1;
    let size = textData.size;
    if (color === null) color = textData.color;
    if (size < minFontSize) {
        scale = 1.0 / scaleFactor;
        ctx.save();
        ctx.scale(scale, scale);
    }
    switch (textData.valign) {
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
    ctx.font = (size >= minFontSize ? size : Math.ceil(size / scale)) + "px " + textData.fontName;
    for (let tdat of textData.outText) {
        ctx.fillText(tdat[0], tdat[1], tdat[2] + (textData.off ?? 0));
    }
    if (size < minFontSize) {
        ctx.restore();
    }
}

