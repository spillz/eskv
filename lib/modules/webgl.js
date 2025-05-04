//@ts-check

import { App, Widget } from './widgets.js';

/**
 * WebGLTileRender is a simple render for drawing tiles from 2D textures onto a canvas. Multiple textures
 * are supported (at the performance penalty of needing to rebind the texture each time you change it)
 * as is a color tint argument per tile or per vertex. Draw calls are batched in blocks of this.numQuads and flushed
 */
export class WebGLTileRenderer {
    /**
     * 
     * @param {HTMLCanvasElement|OffscreenCanvas} canvas 
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = /**@type {WebGLRenderingContext|null}*/(canvas.getContext("webgl", {alpha:true}));
        if (this.gl===null) throw Error(`WebGL context could not be retrieved from ${canvas}`)
        const shaderData = this.initShaders();
        this.shaderProgram = shaderData.program;
        this.aPosition = shaderData.aPosition;
        this.aTexCoord = shaderData.aTexCoord;
        this.aColor = shaderData.aColor;
        const gl = this.gl;

        this.vertexBuffer = gl.createBuffer();
        gl.disable(gl.DEPTH_TEST);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        // gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);

        this.numQuads = 1000;

        this.indexBuffer = gl.createBuffer();
        this.vertexData = new Float32Array(this.numQuads * 6 * (2 + 2 + 4)); // this.numQuads quads max, 6 vertices each, (pos + texCoord + color)
        this.indexData = new Uint16Array(this.numQuads * 6);
        for (let i = 0, j = 0; i < this.indexData.length; i += 6, j += 4) {
            this.indexData.set([j, j + 1, j + 2, j + 2, j + 3, j], i);
        }

        // Bind buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexData, gl.STATIC_DRAW);

        this.textures = new Map();
        this.vertexCount = 0;
        /**@type {WebGLTexture|null} */
        this.activeTexture = null;
    }
    initShaders() {
        const gl = this.gl;
        const vertSrc = `
            attribute vec2 aPosition;
            attribute vec2 aTexCoord;
            attribute vec4 aColor;
            uniform mat4 uProjectionMatrix;
            uniform mat4 uModelMatrix;
            varying vec2 vTexCoord;
            varying vec4 vColor;
            void main() {
                gl_Position = uProjectionMatrix * uModelMatrix * vec4(aPosition, 0.0, 1.0);
                vTexCoord = aTexCoord;
                vColor = aColor;
            }
        `;
        const fragSrc = `
            precision mediump float;
            varying vec2 vTexCoord;
            varying vec4 vColor;
            uniform sampler2D uTexture;
            void main() {
                gl_FragColor = texture2D(uTexture, vTexCoord) * vColor;
            }
        `;
        // void main() {
        //     gl_FragColor = texture2D(uTexture, vTexCoord) * vec4(vColor;
        // }
        const program = this.compileShaderProgram(vertSrc, fragSrc);
        // Get attribute locations
        const aPosition = gl.getAttribLocation(program, "aPosition");
        const aTexCoord = gl.getAttribLocation(program, "aTexCoord");
        const aColor = gl.getAttribLocation(program, "aColor");
        if (aPosition===undefined) throw Error('Could not bind aPosition');
        if (aTexCoord===undefined) throw Error('Could not bind aTexCoord');
        if (aColor===undefined) throw Error('Could not bind aColor');
        return {program, aPosition, aTexCoord, aColor};
    }
    /**
     * Compiles the vertex and fragement shader source into a webGL program
     * @param {string} vertSrc vertex shader source
     * @param {string} fragSrc fragmenet shader source
     * @returns 
     */
    compileShaderProgram(vertSrc, fragSrc) {
        const gl = this.gl;
        const vertShader = this.compileShader(gl.VERTEX_SHADER, vertSrc);
        const fragShader = this.compileShader(gl.FRAGMENT_SHADER, fragSrc);
        if (vertShader===null) throw Error(`Error in vertShader ${vertShader}`);
        if (fragShader===null) throw Error(`Error in fragShader ${fragShader}`);
        const program = gl.createProgram();
        gl.attachShader(program, vertShader);
        gl.attachShader(program, fragShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Shader link error:", gl.getProgramInfoLog(program));
        }
        gl.useProgram(program);

        return program;
    }
    /**
     * Handles the compilation of a single shader part (VERTEX or FRAGMENT)
     * @param {number} type Should be one of gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
     * @param {string} src Source code of the shader
     * @returns 
     */
    compileShader(type, src) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        if (shader===null) throw Error(`Invalid shader type ${type}`);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw Error(`Shader compile error: ${gl.getShaderInfoLog(shader)}`);
        }
        return shader;
    }
    /**
     * Registers the texture with assigned `name` to a specified `image`
     * @param {string} name 
     * @param {HTMLImageElement|OffscreenCanvas} image 
     * @param {number|[number, number]} [tileDim=1] 
     * @param {WebGLRenderingContextBase['NEAREST']|WebGLRenderingContextBase['LINEAR']|null} [interp=null]
     */
    registerTexture(name, image, tileDim=1, interp=null, padding=0) {
        const gl = this.gl;
        const texture = gl.createTexture();
        const [tw, th] = tileDim instanceof Array? tileDim : [tileDim, tileDim];
        if (interp===null) interp = gl.NEAREST;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        const isPowerOfTwo = (value) => (value & (value - 1)) === 0;
        const pot = isPowerOfTwo(image.width) && isPowerOfTwo(image.height);
    
        if (pot) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, interp);
        }
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, interp);
        gl.bindTexture(gl.TEXTURE_2D, null); // Unbind texture

        this.textures.set(name, {texture, width:image.width / (tw+padding), height: image.height / (th+padding), fracW:tw/(tw+padding), fracH:th/(th+padding)});
    }
    /**
     * Start rendering configured for a particular tileScale (fix in each direction)
     * @param {number} tileScale 
     */
    start(tileScale) {
        const gl = this.gl;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        const uProjectionMatrixLoc = gl.getUniformLocation(this.shaderProgram, "uProjectionMatrix");
        const projectionMatrix = new Float32Array([
            2 / this.canvas.width * tileScale, 0, 0, 0,
            0, -2 / this.canvas.height * tileScale, 0, 0, // Flip Y so (0,0) is top-left
            0, 0, 1, 0,
            -1, 1, 0, 1,
        ]);
        gl.uniformMatrix4fv(uProjectionMatrixLoc, false, projectionMatrix);        
        this.setRotation(0, 0, 0);
    }
    /**
     * 
     * @param {number} angle to rotate counter clockwise in radians
     * @param {number} cx x position of the center 
     * @param {number} cy y position of the center  
     * @returns 
     */
    getRotationMatrix(angle, cx, cy) {
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
    
        return new Float32Array([
            cosA,   sinA,   0,  0,
            -sinA,  cosA,   0,  0,
            0,      0,      1,  0,
            cx,     cy,     0,  1,        
        ]);
    }
    /**
     * 
     * @param {number} angle to rotate counter clockwise in radians
     * @param {number} cx x position of the center 
     * @param {number} cy y position of the center  
     * @returns 
     */
    setRotation(angle, cx, cy) {
        const gl = this.gl;
        const uModelMatrixLoc = gl.getUniformLocation(this.shaderProgram, "uModelMatrix");
        const rotationMatrix = this.getRotationMatrix(angle, cx, cy);
        gl.uniformMatrix4fv(uModelMatrixLoc, false, rotationMatrix);        
    }
    /**
     * Draws the texture segment into the `glCanvas`
     * @param {string} name Name of texture to draw
     * @param {number} sx source x position (left) in `tileScale` units specified in `start`
     * @param {number} sy source y position (top) in `tileScale` units specified in `start`
     * @param {number} sw source width in `tileScale` units specified in `start`
     * @param {number} sh source height in `tileScale` units specified in `start`
     * @param {number} dx destination x position (left) in the `tileDim[0]` units registered for the texture
     * @param {number} dy destination y position (top) in the `tileDim[1]` units registered for the texture
     * @param {number} dw destination width in the `tileDim[0]` units registered for the texture
     * @param {number} dh destination height in the `tileDim[1]` units registered for the texture
     * @param {[number, number, number, number]} tint the rgba values (between 0 and 1) to tint the region with
     * @returns 
     */
    drawTexture(name, sx, sy, sw, sh, dx, dy, dw, dh, tint) {
        //TODO: If the active texture changes we should flush
        if (!this.textures.has(name)) return;
        const {texture, width, height, fracW, fracH} = this.textures.get(name);
        if (this.activeTexture!==texture) {
            if (this.activeTexture!==null) this.flush();
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            this.activeTexture = texture;
            // gl.uniform1i(this.u_texture, 0); // Ensure uniform is set
        } 

        const x1 = dx;
        const y1 = dy;
        const x2 = dx + dw;
        const y2 = dy + dh;

        const u1 = sx / width;
        const v1 = sy / height;
        const u2 = (sx + sw*fracW) / width;
        const v2 = (sy + sh*fracH) / height;

        const color = tint ?? [1, 1, 1, 1];

        const baseIndex = this.vertexCount * 8;
        const arr = this.vertexData;
        arr.set([x1, y1, u1, v1, ...color], baseIndex);
        arr.set([x2, y1, u2, v1, ...color], baseIndex + 8);
        arr.set([x2, y2, u2, v2, ...color], baseIndex + 16);
        arr.set([x1, y2, u1, v2, ...color], baseIndex + 24);

        this.vertexCount += 4;
        if (this.vertexCount >= this.numQuads * 4) this.flush();
    }
    /**
     * Draws the texture segment into the `glCanvas` with a tint per vertex
     * @param {string} name Name of texture to draw
     * @param {number} sx source x position (left) in `tileScale` units specified in `start`
     * @param {number} sy source y position (top) in `tileScale` units specified in `start`
     * @param {number} sw source width in `tileScale` units specified in `start`
     * @param {number} sh source height in `tileScale` units specified in `start`
     * @param {number} dx destination x position (left) in the `tileDim[0]` units registered for the texture
     * @param {number} dy destination y position (top) in the `tileDim[1]` units registered for the texture
     * @param {number} dw destination width in the `tileDim[0]` units registered for the texture
     * @param {number} dh destination height in the `tileDim[1]` units registered for the texture
     * @param {[number, number, number, number][]} tints the rgba values (between 0 and 1) to tint each vertex from top-left clockwise
     * @returns 
     */
    drawTextureTintedPerVertex(name, sx, sy, sw, sh, dx, dy, dw, dh, tints) {
        //TODO: If the active texture changes we should flush
        if (!this.textures.has(name)) return;
        const {texture, width, height, fracW, fracH} = this.textures.get(name);
        if (this.activeTexture!==texture) {
            if (this.activeTexture!==null) this.flush();
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            this.activeTexture = texture;
            // gl.uniform1i(this.u_texture, 0); // Ensure uniform is set
        } 

        const x1 = dx;
        const y1 = dy;
        const x2 = dx + dw;
        const y2 = dy + dh;

        const u1 = sx / width;
        const v1 = sy / height;
        const u2 = (sx + sw*fracW) / width;
        const v2 = (sy + sh*fracH) / height;

        const color = tints;

        const baseIndex = this.vertexCount * 8;
        const arr = this.vertexData;
        arr.set([x1, y1, u1, v1, ...color[0]], baseIndex);
        arr.set([x2, y1, u2, v1, ...color[1]], baseIndex + 8);
        arr.set([x2, y2, u2, v2, ...color[2]], baseIndex + 16);
        arr.set([x1, y2, u1, v2, ...color[3]], baseIndex + 24);

        this.vertexCount += 4;
        if (this.vertexCount >= this.numQuads * 4) this.flush();
    }
    /**
     * Called internally or by the user to render out the current set of vertices
     */
    flush() {
        if (this.vertexCount === 0) return;
        const gl = this.gl;

        // Bind and upload vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexData.subarray(0, this.vertexCount * 8));

        // Enable and set attributes
        gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, 8 * 4, 0);
        gl.enableVertexAttribArray(this.aPosition);
        gl.vertexAttribPointer(this.aTexCoord, 2, gl.FLOAT, false, 8 * 4, 2 * 4);
        gl.enableVertexAttribArray(this.aTexCoord);
        gl.vertexAttribPointer(this.aColor, 4, gl.FLOAT, false, 8 * 4, 4 * 4);
        gl.enableVertexAttribArray(this.aColor);

        // Bind index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        // Draw batched quads
        gl.drawElements(gl.TRIANGLES, this.vertexCount * 6 / 4, gl.UNSIGNED_SHORT, 0);

        this.vertexCount = 0; // Reset count
    }

    /**
     * Clears out the client region of the glCanvas to the specified rgba values
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     * @param {number} a 
     */
    clear(r = 0, g = 0, b = 0, a = 1) {
        const gl = this.gl;
        gl.clearColor(r, g, b, a);
        gl.clear(gl.COLOR_BUFFER_BIT);
        this.vertexCount = 0;
    }
    
}

/**
 * A widget derived class to render tinted rectangular segments of a source image txImage 
 * to a webGL background canvas `bgCanvas` then draws the contents of the bgCanvas into the 
 * Widget pane in the main application canvas during the draw phase. This provides the speed 
 * benefits of webGL rendering with the flexibility of being able to use the convenience of 
 * ESKV's widgets. The background canvas is automatically sized to match the dimensions of 
 * widget's bounding rect scaled by the `txTileDim` parameter. Child widgets added to this 
 * widget will be drawn over the top of this widget as normal.
 */
export class WebGLTileWidget extends Widget {
    constructor(props = {}) {
        super();
        /**@type {{sx:number, sy:number, sw:number; sh:number, dx:number, dy:number, dw:number; dh:number, tint: [number, number, number, number], angle?: number}[]} */
        this.drawBatch = [];
        // Create the background WebGL canvas (offscreen) and renderer
        const bgCanvas = document.createElement("canvas");
        this.webglRenderer = new WebGLTileRenderer(bgCanvas);

        this.txTileDim = props['tileDim']??1;
        // Load an image and register it as a texture
        this.txImage = new Image();
        this.txImage.src = props['src']??'';
        this.txImage.onload = () => {
            this.webglRenderer.registerTexture("texture", this.txImage, this.txTileDim);
            App.get().requestFrameUpdate();
        }

        this.updateProperties(props);
    }
    on_drawBatch(e, o, v) {
        App.get().requestFrameUpdate();
    }
    set src(val) {
        this.txImage.src = val;
    }
    get src() {
        return this.txImage.src;
    }
    /**
     * Adds a tile to the batch of tiles to be drawn by the renderer during the `draw` call.
     * @param {number} sx source x position (left)
     * @param {number} sy source y position (top)
     * @param {number} sw source width
     * @param {number} sh source height
     * @param {number} dx destination x position (left)
     * @param {number} dy destination y position (top)
     * @param {number} dw destination width
     * @param {number} dh destination height
     * @param {[number, number, number, number]} tint rgba values (all between 0 and 1) to write
     * @param {number|undefined} angle angle in radians
     */
    addTile(sx, sy, sw, sh, dx, dy, dw, dh, tint, angle=undefined) {
        if (angle!==undefined) {
            this.drawBatch.push({sx, sy, sw, sh, dx, dy, dw, dh, tint, angle});
        } else {
            this.drawBatch.push({sx, sy, sw, sh, dx, dy, dw, dh, tint});
        }
        App.get().requestFrameUpdate();
    }
    /**@type {Widget['draw']} */
    draw(app, ctx) {
        console.log('draw');
        const glRend = this.webglRenderer
        glRend.canvas.width = this.w * this.txTileDim;
        glRend.canvas.height = this.h * this.txTileDim;
        glRend.start(this.txTileDim);
        glRend.clear(0, 0, 0, 1);
        // Draw textures with different tints
        for (let {sx, sy, sw, sh, dx, dy, dw, dh, tint, angle} of this.drawBatch) {
            if (angle!==undefined) {
                glRend.flush();
                glRend.setRotation(angle, dx+dw/2, dy+dh/2);
                glRend.drawTexture("texture", sx, sy, sw, sh, dx, dy, dw, dh, tint);
                glRend.flush();
                glRend.setRotation(0, 0, 0);
            } else {
                glRend.drawTexture("texture", sx, sy, sw, sh, dx, dy, dw, dh, tint);
            }
        }
        glRend.flush(); // Render the batch    

        ctx.drawImage(glRend.canvas, 0, 0, glRend.canvas.width, glRend.canvas.height, this.x, this.y, this.w, this.h);
    }
}

