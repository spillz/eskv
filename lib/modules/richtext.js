//@ts-check
import { Rect } from './geometry.js';

const minFontSize = 8;
const scaleFactor = 48 * (1.0 / window.devicePixelRatio || 1);

// ===== Typedefs =====

/**
 * @typedef {{ fg: string|null, bg: string|null, s: number, a: number }} Style
 * Style stack frame:
 *   fg: foreground color (CSS or null = inherit)
 *   bg: background color (CSS or null = none)
 *   s : size multiplier (relative to base)
 *   a : opacity multiplier (0..1, multiplied through nesting)
 */

/** @typedef {{ type:'text', text:string }} TextToken */
/** @typedef {{ type:'tagOpen', attrs: Partial<Record<'fg'|'bg'|'s'|'a', string>> }} TagOpenToken */
/** @typedef {{ type:'tagClose' }} TagCloseToken */
/** @typedef {TextToken | TagOpenToken | TagCloseToken} Token */

/**
 * A renderable text run with a resolved style at that position.
 * @typedef {{ text:string, style:Style }} Run
 */

// ===== Tokenizer =====

/**
 * Tokenize input string into rich-text tokens.
 * @param {string} text
 * @returns {Token[]}
 */
function tokenizeRich(text) {
    const tokens = [];
    const re = /\[(?:\s*(fg|bg|s|a)\s*=\s*([^\]\s]+)\s*)+\]|\[\/\]|\[\[|\]\]/g;
    let i = 0, m;
    while ((m = re.exec(text))) {
        const j = m.index;
        if (j > i) tokens.push({ type: 'text', text: text.slice(i, j) });
        const tag = m[0];
        if (tag === '[[') tokens.push({ type: 'text', text: '[' });
        else if (tag === ']]') tokens.push({ type: 'text', text: ']' });
        else if (tag === '[/]') tokens.push({ type: 'tagClose' });
        else {
            /** @type {TagOpenToken['attrs']} */
            const attrs = {};
            const inner = tag.slice(1, -1);
            for (const kv of inner.trim().split(/\s+/)) {
                const mm = /^(fg|bg|s|a)\s*=\s*(.+)$/.exec(kv);
                if (mm) attrs[/** @type {'fg'|'bg'|'s'|'a'} */(mm[1])] = mm[2];
            }
            tokens.push({ type: 'tagOpen', attrs });
        }
        i = re.lastIndex;
    }
    if (i < text.length) tokens.push({ type: 'text', text: text.slice(i) });
    return /** @type {Token[]} */ (tokens);
}

// ===== Build runs (this is where your error was) =====

/**
 * Build styled runs from tokens (applies the style stack).
 * @param {Token[]} tokens
 * @returns {Run[]}
 */
function buildRuns(tokens) {
    /** @type {Style[]} */
    const stack = [{ fg: null, bg: null, s: 1, a: 1 }];
    /** @type {Run[]} */
    const runs = [];

    for (const t of tokens) {
        if (t.type === 'text') {
            if (t.text) runs.push({ text: t.text, style: { ...stack[stack.length - 1] } });
            continue;
        }
        if (t.type === 'tagOpen') {
            /** @type {Style} */
            const top = { ...stack[stack.length - 1] };
            if (t.attrs.fg) top.fg = t.attrs.fg;
            if (t.attrs.bg) top.bg = t.attrs.bg;
            if (t.attrs.s) {
                const mult = parseFloat(t.attrs.s);
                if (isFinite(mult) && mult > 0) top.s *= mult;
            }
            if (t.attrs.a) {
                const alpha = parseFloat(t.attrs.a);
                if (isFinite(alpha)) top.a *= Math.max(0, Math.min(1, alpha));
            }
            stack.push(top);
            continue;
        }
        // tagClose
        if (stack.length > 1) stack.pop();
    }

    return runs;
}

/**
 * Splits runs into word/space atoms for wrapping while preserving style.
 * @param {Run[]} runs
 * @returns {Run[]} atoms
 */
function atomizeRuns(runs) {
    const atoms = [];
    for (const r of runs) {
        const parts = r.text.split(/(\n|\s+)/); // keep delimiters
        for (const p of parts) {
            if (p === '') continue;
            atoms.push({ text: p, style: r.style });
        }
    }
    return atoms;
}

/**
 * Measures width and effective pixel size of an atom.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{text:string, style:{s:number}}} atom
 * @param {number} baseSize Base font size in px
 * @param {string} fontName Font family name
 * @returns {{width:number, sizePx:number}}
 */
function measureAtom(ctx, atom, baseSize, fontName) {
    const s = baseSize * (atom.style?.s || 1);
    const fontPx = Math.max(1, Math.round(s));
    const oldFont = ctx.font;
    ctx.font = `${fontPx}px ${fontName}`;
    const w = ctx.measureText(atom.text).width;
    ctx.font = oldFont;
    return { width: w, sizePx: fontPx };
}

/**
 * Wraps atoms into lines that fit within maxWidth.
 * Each line is an array of merged segments with identical style.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{text:string, style:{fg:string|null, bg:string|null, s:number, a:number}}[]} atoms
 * @param {number} baseSize Base font size in px
 * @param {string} fontName Font family
 * @param {number} maxWidth Maximum line width
 * @returns {{text:string, width:number, sizePx:number, fg:string|null, bg:string|null, a:number}[][]}
 *          Lines → segments
 */
function wrapRich(ctx, atoms, baseSize, fontName, maxWidth) {
    const lines = []; // each line: [{text, fg,bg,a, sizePx, width}]
    let line = [];
    let lineWidth = 0;

    const flush = () => {
        // merge adjacent same-style segments for fewer draws
        const merged = [];
        for (const seg of line) {
            const last = merged[merged.length - 1];
            if (last &&
                last.fg === seg.fg &&
                last.bg === seg.bg &&
                last.a === seg.a &&
                last.sizePx === seg.sizePx) {
                last.text += seg.text;
                last.width += seg.width;
            } else {
                merged.push({ ...seg });
            }
        }
        lines.push(merged);
        line = [];
        lineWidth = 0;
    };

    for (const atom of atoms) {
        if (atom.text === '\n') { flush(); continue; }
        const { width, sizePx } = measureAtom(ctx, atom, baseSize, fontName);
        const isSpace = /^\s+$/.test(atom.text);

        if (lineWidth + width > maxWidth && line.length > 0) {
            // don’t start a new line with pure spaces
            flush();
            if (!isSpace) {
                line.push({
                    text: atom.text, width, sizePx,
                    fg: atom.style.fg ?? null,
                    bg: atom.style.bg ?? null,
                    a: atom.style.a ?? 1
                });
                lineWidth += width;
            }
        } else {
            line.push({
                text: atom.text, width, sizePx,
                fg: atom.style.fg ?? null,
                bg: atom.style.bg ?? null,
                a: atom.style.a ?? 1
            });
            lineWidth += width;
        }
    }
    flush();
    return lines; // array of lines, each line is array of merged segments
}


/**
 * Fallback ascent/descent metrics when measureText doesn’t provide them.
 * @param {number} sizePx Pixel size of font
 * @returns {{ascent:number, descent:number, lineHeight:number}}
 */
function fallbackMetrics(sizePx) {
    const ascent = sizePx * 0.8;
    const descent = sizePx * 0.2;
    return { ascent, descent, lineHeight: ascent + descent };
}


/**
 * Sets ctx.font to `${px}px ${fontName}`.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} px Font size in pixels
 * @param {string} fontName Font family
 * @returns {string} Previous ctx.font string
 */
function setFont(ctx, px, fontName) {
    const prev = ctx.font;
    ctx.font = `${px}px ${fontName}`;
    return prev;
}

// ----------- Public API -----------

/**
 * Compute the width and height needed to render rich text at given font size.
 * @param {CanvasRenderingContext2D} ctx Canvas 2D context
 * @param {string} text Rich text with markup
 * @param {number} size Base font size in px
 * @param {string} fontName Font family
 * @param {Rect} rect Rectangle region for label widget ({x,y,w,h})
 * @param {string} color Default text color (CSS)
 * @param {boolean} [wordwrap=true] Whether to wrap by words or allow overflow
 * @returns {[number, number]} [width, height] required to render
 */
export function sizeRichText(ctx, text, size, fontName, rect, color, wordwrap = true) {
    let scale = 1;
    if (size < minFontSize) {
        scale = 1.0 / scaleFactor;
        ctx.save(); ctx.scale(scale, scale);
    }
    setFont(ctx, size >= minFontSize ? size : Math.ceil(size / scale), fontName);

    const runs = buildRuns(tokenizeRich(text));
    const atoms = wordwrap ? atomizeRuns(runs) : runs.map(r => ({ ...r })); // if no wrap, keep runs whole
    const lines = wordwrap
        ? wrapRich(ctx, atoms, size / scale, fontName, rect.w / scale)
        : [wrapRich(ctx, atoms, size / scale, fontName, 1e9)[0] || []];

    // Height is sum of max line heights
    let totalH = 0;
    for (const segs of lines) {
        let lineH = 0;
        for (const seg of segs) {
            // const { ascent, descent } = fallbackMetrics(seg.sizePx);
            lineH = Math.max(lineH, seg.sizePx);
        }
        totalH += lineH || size;
    }
    totalH += (lines.length ? 0 : size); // empty text: at least one line

    if (size < minFontSize) ctx.restore();
    return [rect.w, totalH * scale];
}

/**
 * Precompute layout data for rich text rendering.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text Rich text with markup
 * @param {number} size Base font size
 * @param {string} fontName Font family
 * @param {"left"|"center"|"right"} halign Horizontal alignment
 * @param {"top"|"middle"|"bottom"} valign Vertical alignment
 * @param {Rect} rect Rectangle bounds
 * @param {string} color Default text color
 * @param {boolean} [wordwrap=true] Wrap words to fit rect.w
 * @returns {{
 *   fontName:string,
 *   lines:{x:number,y:number,lineH:number,
 *          segments:{text:string,fg:string|null,bg:string|null,
 *                    a:number,sizePx:number,width:number}[]}[],
 *   off:number,
 *   valign:"top"|"middle"|"bottom",
 *   baseColor:string,
 *   baseSizePx:number,
 *   size: number
 * }} RichTextData for drawing
 */
export function getRichText(ctx, text, size, fontName, halign, valign, rect, color, wordwrap = true) {
    let scale = 1;
    if (size < minFontSize) {
        scale = 1.0 / scaleFactor;
        ctx.save(); 
        ctx.scale(scale, scale);
    }
    const basePx = size >= minFontSize ? size : Math.ceil(size / scale);
    setFont(ctx, basePx, fontName);

    const runs = buildRuns(tokenizeRich(text));
    const atoms = wordwrap ? atomizeRuns(runs) : runs.map(r => ({ ...r }));
    const lines = wordwrap
        ? wrapRich(ctx, atoms, basePx, fontName, rect.w / scale)
        : [wrapRich(ctx, atoms, basePx, fontName, 1e9)[0] || []];

    // Compute vertical layout
    const laid = [];
    let y = rect.y / scale;
    let maxLineHeights = [];
    for (const segs of lines) {
        let lineW = 0, lineH = 0;
        for (const seg of segs) {
            lineW += seg.width;
            // const { ascent, descent } = fallbackMetrics(seg.sizePx);
            lineH = Math.max(lineH, seg.sizePx);
        }
        // Horizontal alignment per line
        let x = rect.x / scale;
        if (halign === 'center') x += (rect.w / scale - lineW) / 2;
        else if (halign === 'right') x += (rect.w / scale - lineW);

        laid.push({ x, y, segs, lineH });
        maxLineHeights.push(lineH || basePx);
        y += (lineH || basePx);
    }

    // Vertical offset for valign
    const textH = maxLineHeights.reduce((a, b) => a + b, 0);
    let off = 0;
    switch (valign) {
        case 'middle': off = (rect.h / scale - textH) / 2; break;
        case 'bottom': off = (rect.h / scale - textH); break;
        // top: 0
    }

    const richData = {
        fontName,
        lines: laid.map(L => ({ x: L.x, y: L.y, lineH: L.lineH, segments: L.segs })),
        off,
        valign,
        baseColor: color,
        baseSizePx: basePx,
        size: size
    };

    if (size < minFontSize) ctx.restore();
    return richData;
}

/**
 * Render rich text data to a canvas context.
 * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx
 * @param {ReturnType<typeof getRichText>} richData Layout data from getRichText
 * @param {string|null} [overrideColor=null] If provided, overrides fg color for all segments
 * @returns {void}
 */
export function drawRichText(ctx, richData, overrideColor = null) {
    let scale = 1;
    const size = richData.size;
    if (size < minFontSize) {
        scale = 1.0 / scaleFactor;
        ctx.save(); 
        ctx.scale(scale, scale);
    }

    // Baseline by valign is handled via 'off' shifting; use top baseline for stable bg rects
    ctx.textBaseline = 'top';

    for (const L of richData.lines) {
        let x = L.x;
        const yTop = L.y + (richData.off ?? 0);

        for (const seg of L.segments) {
            if (!seg.text) continue;

            // Set font for this segment
            const prevFont = ctx.font;
            ctx.font = `${seg.sizePx}px ${richData.fontName}`;

            // Metrics for background & advance
            // const m = ctx.measureText(seg.text);
            // const ascent = m.actualBoundingBoxAscent ?? seg.sizePx * 0.8;
            // const descent = m.actualBoundingBoxDescent ?? seg.sizePx * 0.2;
            // const lineH = ascent + descent;
            const pad = Math.round(seg.sizePx * 0.15);

            // Background rect (if any)
            if (seg.bg) {
                const prevFill = ctx.fillStyle;
                ctx.fillStyle = seg.bg;
                const prevAlpha = ctx.globalAlpha;
                ctx.globalAlpha *= seg.a ?? 1;
                ctx.fillRect(x - pad, yTop - pad, seg.width + pad * 2, L.lineH + pad * 2);
                ctx.globalAlpha = prevAlpha;
                ctx.fillStyle = prevFill;
            }

            // Foreground text
            const fg = overrideColor ?? seg.fg ?? richData.baseColor;
            const prevFill = ctx.fillStyle;
            const prevAlpha = ctx.globalAlpha;
            ctx.fillStyle = fg;
            ctx.globalAlpha = prevAlpha * (seg.a ?? 1);
            ctx.fillText(seg.text, x, yTop);
            ctx.globalAlpha = prevAlpha;
            ctx.fillStyle = prevFill;

            x += seg.width;
            ctx.font = prevFont;
        }
    }

    if (size < minFontSize) ctx.restore();
}
