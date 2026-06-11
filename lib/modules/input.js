//@ts-check

import {Rect} from './geometry.js'
import {Widget, App} from './widgets.js'

export class Touch {
    /**@type {number} */
    identifier = -1
    /**@type {import('./geometry').Vec2|number[]} */
    pos = [0,0];
    /**@type {string} */
    state = 'touch_up'; // one of 'touch_up', 'touch_down', 'touch_move', 'touch_cancel'
    /**@type {'touch'|'mouse'|'keyboard'} */
    device = 'touch' //source of touch: touch, mouse or keyboard
    /**@type {globalThis.Touch|MouseEvent|WheelEvent|null} */
    nativeObject = null;
    /**@type {MouseEvent|TouchEvent|null} */
    nativeEvent = null;
    /**
     * @param {Partial<Touch>} [props]
     */
    constructor(props = {}) {
        for(let p in props) {
            /** @type {any} */ (this)[p] = /** @type {any} */ (props)[p];
        }
    }
    copy() {
        return new Touch({pos:[...this.pos], 
            state:this.state, 
            device:this.device, 
            nativeObject:this.nativeObject, 
            nativeEvent:this.nativeEvent, 
            identifier:this.identifier
        });
    }
    /** @type {(widget:Widget)=>Touch} */
    asChildTouch(widget) {
        return new Touch({pos:[...widget.toChild(this.pos)], 
            state:this.state, device:this.device, 
            nativeObject:this.nativeObject, 
            nativeEvent:this.nativeEvent, 
            identifier:this.identifier
        });
    }
    /** @returns {Rect} */
    get rect() {
        return new Rect([...this.pos, 0, 0]);
    }
    /**@type {number} x-coordinate */
    set x(value) {
        this.pos[0] = value;
    }
    /**@type {number} y-coordinate */
    set y(value) {
        this.pos[1] = value;
    }
    get x() {
        return this.pos[0];
    }
    get y() {
        return this.pos[1];
    }
    /** 
     * Returns the widget that currently grabs all touch events or null if no widget is grabbed. 
     * @type {Widget|null} */
    get grabbed() {
        const app = /** @type {App & { inputHandler: InputHandler }} */ (App.get());
        return app.inputHandler.grabbed;
    }
    /**
     * Tells the framework that `widget` will be the exclusive target of all touch operations until ungrab is called
     * @param {Widget} widget 
     * @returns 
     */
    grab(widget) {
        const app = /** @type {App & { inputHandler: InputHandler }} */ (App.get());
        app.inputHandler.grab(widget);
    }
    /**Release the current widget target of all touches. Future touchs will bubble up through the widget tree. */
    ungrab() {
        const app = /** @type {App & { inputHandler: InputHandler }} */ (App.get());
        app.inputHandler.ungrab();
    }
}



export class InputHandler {
    /**@type {Widget|null} */
    grabbed = null;
    /**@type {App} */
    app;
    /**@type {HTMLCanvasElement|null} */
    canvas = null;
    mouseTouchEmulation = true;
    /**@type {MouseEvent|null} */
    mouseev = null;
    /**@type {Record<string, boolean>} */
    keyStates = {};
    /**@type {Widget|null} */
    focusedWidget = null;
    /**@type {Set<number>} */
    _connectedGamepads = new Set();
    /**@type {Map<string, boolean>} */
    _gamepadButtonState = new Map();
    /**@type {Map<string, {dir:number, holdStart:number, lastRepeat:number}>} */
    _gamepadAxisState = new Map();
    /**@type {Map<string, {active:boolean, holdStart:number, lastRepeat:number}>} */
    _gamepadDigitalState = new Map();
    /**@type {number} */
    gamepadRepeatDelay = 250;
    /**@type {number} */
    gamepadRepeatInterval = 150;
    /**@type {number} */
    gamepadAxisThreshold = 0.5;
    /**@type {boolean} */
    focusWrap = true;
    /**
     *
     * @param {App} app
     */
    constructor(app) {
        this.app = app;
        this.canvas = app.canvas;
        let canvas = /** @type {HTMLCanvasElement} */ (this.canvas);
        // Register touch event handlers
        let that = this;

        document.addEventListener('keydown', function(ev){that.process_key(ev, 'key_down');}, true);
        document.addEventListener('keyup', function(ev){that.process_key(ev, 'key_up');}, true);
        canvas.addEventListener('mousedown', function(ev){that.process_mouse(ev, 'mouse_down');}, true);
        canvas.addEventListener('mousemove', function(ev){that.process_mouse(ev, 'mouse_move');}, true);
        canvas.addEventListener('mouseout', function(ev){that.process_mouse(ev, 'mouse_cancel');}, true);
        canvas.addEventListener('mouseup', function(ev){that.process_mouse(ev, 'mouse_up');}, true);
        canvas.addEventListener('touchstart', function(ev){that.process_touch(ev, 'touch_down');}, false);
        canvas.addEventListener('touchmove', function(ev){that.process_touch(ev, 'touch_move');}, false);
        canvas.addEventListener('touchcancel', function(ev){that.process_touch(ev, 'touch_cancel');}, false);
        canvas.addEventListener('touchend', function(ev){that.process_touch(ev, 'touch_up');}, false);
        canvas.addEventListener('wheel', function(ev){that.process_wheel(ev, 'wheel');}, true);

        window.history.replaceState(null, document.title, location.pathname+"#!/backbutton");
        window.history.pushState(null, document.title, location.pathname);
        // location.href = location.href+"#!/backbutton";
        window.addEventListener("popstate", function(ev) {that.process_back(ev, 'back_button')}, false);
        window.addEventListener('gamepadconnected', /** @param {GamepadEvent} ev */ (ev) => {
            this._connectedGamepads.add(ev.gamepad.index);
            this.onFocusScopeChanged();
        });
        window.addEventListener('gamepaddisconnected', /** @param {GamepadEvent} ev */ (ev) => {
            this._connectedGamepads.delete(ev.gamepad.index);
        });
        if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
            const pads = navigator.getGamepads();
            if (pads) {
                for (const gp of pads) {
                    if (gp) this._connectedGamepads.add(gp.index);
                }
            }
        }
        this.onFocusScopeChanged();
    }
    /**
     * @param {Widget} widget
     */
    grab(widget) {
        this.grabbed = widget;
    }
    ungrab() {
        this.grabbed = null;
    }
    /**
     * @param {string} key
     */
    isKeyUp(key) {
        return (key in this.keyStates) && this.keyStates[key];
    }
    /**
     * @param {string} key
     */
    isKeyDown(key) {
        return (key in this.keyStates) && this.keyStates[key];
    }
    isActivateHeld() {
        if (this.isKeyDown('Enter') || this.isKeyDown(' ')) return true;
        for (const pressed of this._gamepadButtonState.values()) {
            if (pressed) return true;
        }
        return false;
    }
    /**
     * 
     * @param {KeyboardEvent} ev 
     * @param {'key_down'|'key_up'} name 
     */
    process_key(ev, name) {
        this.app.requestFrameUpdate();
        const oldKeyState = this.keyStates[ev.key];
        if(name==='key_up') this.keyStates[ev.key] = false;
        else if(name==='key_down') this.keyStates[ev.key] = true;
        let handled = false;
        if (name === 'key_down') {
            handled = this.handleKeyDown(ev);
        }
        if (handled) {
            ev.preventDefault();
        }
        //TODO: We emit only to the top level app, since we don't have a focus concept (yet)
        //for it to make sense to emit to specific widgets
        this.app.emit(name, {states:this.keyStates, oldState:oldKeyState, event:ev});
    }
    /**
     * @param {KeyboardEvent} ev
     * @returns {boolean}
     */
    handleKeyDown(ev) {
        const target = ev.target;
        const isTextTarget = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
        if (isTextTarget && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key)) {
            return false;
        }
        switch (ev.key) {
            case 'Tab':
                return this.moveFocusSequential(ev.shiftKey ? -1 : 1);
            case 'ArrowLeft':
                return this.handleFocusDirection('left');
            case 'ArrowRight':
                return this.handleFocusDirection('right');
            case 'ArrowUp':
                return this.handleFocusDirection('up');
            case 'ArrowDown':
                return this.handleFocusDirection('down');
            case 'Enter':
                if (isTextTarget) return false;
                return this.activateFocusedWidget();
            case 'Escape':
                return this.escapeFocusedWidget();
            default:
                return false;
        }
    }
    /**
     * @param {Widget|null} widget
     * @returns {boolean}
     */
    focusWidget(widget) {
        if (widget && !this.isWidgetFocusable(widget)) {
            widget = null;
        }
        if (widget) {
            const scope = this.getFocusScopeRoot();
            if (!this.isDescendantOf(widget, scope)) {
                return false;
            }
        }
        if (this.focusedWidget === widget) return true;
        if (this.focusedWidget) this.focusedWidget.focus = false;
        this.focusedWidget = widget ?? null;
        if (this.focusedWidget) {
            this.focusedWidget.focus = true;
            this.ensureWidgetVisible(this.focusedWidget);
        }
        this.app.requestFrameUpdate();
        return true;
    }
    /**
     * @param {Widget|null} widget
     */
    ensureWidgetVisible(widget) {
        if (!(widget instanceof Widget)) return;
        const appRect = this.getWidgetAppRect(widget);
        widget.bubbleEvent('focus_visible', { target: widget, appRect });
    }
    clearFocus() {
        return this.focusWidget(null);
    }
    getFocusScopeRoot() {
        const modals = this.app._modalWidgets ?? [];
        if (modals.length > 0) return modals[modals.length - 1];
        return this.app.baseWidget;
    }
    /**
     * @param {Widget} widget
     * @param {Widget} ancestor
     * @returns {boolean}
     */
    isDescendantOf(widget, ancestor) {
        if (widget === ancestor) return true;
        let current = widget.parent;
        while (current instanceof Widget) {
            if (current === ancestor) return true;
            current = current.parent;
        }
        return false;
    }
    /**
     * @param {Widget|null} widget
     * @returns {boolean}
     */
    isWidgetFocusable(widget) {
        if (!(widget instanceof Widget)) return false;
        if (!widget.canFocus) return false;
        if ('disable' in widget && widget.disable) return false;
        if ('disabled' in widget && widget.disabled) return false;
        if ('visible' in widget && widget.visible === false) return false;
        if (!Number.isFinite(widget.w) || !Number.isFinite(widget.h)) return false;
        if (widget.w <= 0 || widget.h <= 0) return false;
        let child = widget;
        for (const parent of widget.iterParents()) {
            if ('visible' in parent && parent.visible === false) return false;
            if (!this.isWidgetOnActiveNotebookPage(child, parent)) return false;
            if (this.isScrollContainer(parent) && !this.isWidgetVisibleInScrollContainer(widget, parent)) return false;
            child = parent;
        }
        return true;
    }
    /**
     * @param {Widget|null} widget
     * @returns {boolean}
     */
    isScrollContainer(widget) {
        if (!(widget instanceof Widget)) return false;
        const record = /** @type {Record<string, any>} */ (widget);
        return 'scrollX' in record && 'scrollY' in record && 'zoom' in record
            && typeof record.scrollableW === 'number' && typeof record.scrollableH === 'number';
    }
    /**
     * @param {Widget} widget
     * @param {Widget} scrollContainer
     * @returns {boolean}
     */
    isWidgetVisibleInScrollContainer(widget, scrollContainer) {
        return this.getWidgetAppRect(widget).collide(this.getWidgetAppRect(scrollContainer));
    }
    /**
     * Notebook-style widgets draw only one page from their public children list.
     * TabbedNotebook keeps its tab scroller in _children but outside children, so
     * direct children not present in children are treated as always visible chrome.
     * @param {Widget} child
     * @param {Widget} parent
     * @returns {boolean}
     */
    isWidgetOnActiveNotebookPage(child, parent) {
        const record = /** @type {Record<string, any>} */ (parent);
        if (!Number.isInteger(record.activePage) || !Array.isArray(record.children)) return true;
        const pageIndex = record.children.indexOf(child);
        return pageIndex === -1 || pageIndex === record.activePage;
    }
    /**
     * Focus traversal depends on current widget geometry, but key events can arrive before
     * the next frame applies pending layout changes.
     * @param {Widget} scope
     */
    ensureFocusLayoutCurrent(scope) {
        if (this.app._needsLayout) {
            this.app.layoutChildren();
            return;
        }
        for (const widget of scope.iter(true, false)) {
            if (widget._needsLayout) widget.layoutChildren();
        }
    }
    /**
     * @param {Widget} [scope]
     * @returns {Widget[]}
     */
    getFocusableWidgets(scope = this.getFocusScopeRoot()) {
        this.ensureFocusLayoutCurrent(scope);
        const focusables = [];
        for (let widget of scope.iter(true, false)) {
            if (this.isWidgetFocusable(widget)) focusables.push(widget);
        }
        return focusables;
    }
    ensureFocusValid() {
        const scope = this.getFocusScopeRoot();
        const focusables = this.getFocusableWidgets(scope);
        if (this.focusedWidget && !focusables.includes(this.focusedWidget)) {
            this.focusWidget(null);
        }
        return { scope, focusables };
    }
    onFocusScopeChanged() {
        const { focusables } = this.ensureFocusValid();
        if (!this.focusedWidget && focusables.length > 0) {
            this.focusWidget(focusables[0]);
        }
    }
    /**
     * @param {number} delta
     * @returns {boolean}
     */
    moveFocusSequential(delta) {
        const { focusables } = this.ensureFocusValid();
        if (focusables.length === 0) return false;
        let index = this.focusedWidget ? focusables.indexOf(this.focusedWidget) : -1;
        if (index === -1) {
            index = delta > 0 ? 0 : focusables.length - 1;
        } else {
            index = (index + delta + focusables.length) % focusables.length;
        }
        this.focusWidget(focusables[index]);
        return true;
    }
    /**
     * @param {Widget} widget
     * @returns {Rect}
     */
    getWidgetGlobalRect(widget) {
        return this.getWidgetAppRect(widget);
    }
    /**
     * @param {Widget|null} widget
     * @returns {Rect}
     */
    getWidgetAppRect(widget) {
        if (!(widget instanceof Widget)) return new Rect([0, 0, 0, 0]);
        const rect = widget.rect;
        const points = [
            new DOMPoint(rect[0], rect[1]),
            new DOMPoint(rect[0] + rect[2], rect[1]),
            new DOMPoint(rect[0] + rect[2], rect[1] + rect[3]),
            new DOMPoint(rect[0], rect[1] + rect[3]),
        ];
        const transform = widget.parent?.getTransformRecurse(true) ?? null;
        if (transform) {
            for (let i = 0; i < points.length; i++) {
                const transformed = transform.transformPoint(points[i]);
                points[i] = new DOMPoint(transformed.x, transformed.y);
            }
        }
        const xs = points.map(pt => pt.x);
        const ys = points.map(pt => pt.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return new Rect([minX, minY, maxX - minX, maxY - minY]);
    }
    /**
     * @param {Rect} currentRect
     * @param {Rect} candidateRect
     * @param {'left'|'right'|'up'|'down'} direction
     * @returns {{distance:number, primary:number, overlapRank:number, secondary:number}|null}
     */
    getDirectionalFocusScore(currentRect, candidateRect, direction) {
        const centerDx = candidateRect.center_x - currentRect.center_x;
        const centerDy = candidateRect.center_y - currentRect.center_y;
        let primary = 0;
        let secondary = 0;
        let overlapRank = 1;
        let perpendicularGap = 0;
        switch (direction) {
            case 'left':
                if (candidateRect.x >= currentRect.x) return null;
                perpendicularGap = this.getIntervalGap(currentRect.y, currentRect.bottom, candidateRect.y, candidateRect.bottom);
                overlapRank = perpendicularGap === 0 ? 0 : 1;
                primary = overlapRank === 0 ? Math.max(0, currentRect.x - candidateRect.right) : -centerDx + perpendicularGap;
                secondary = Math.abs(centerDy);
                break;
            case 'right':
                if (candidateRect.x <= currentRect.x) return null;
                perpendicularGap = this.getIntervalGap(currentRect.y, currentRect.bottom, candidateRect.y, candidateRect.bottom);
                overlapRank = perpendicularGap === 0 ? 0 : 1;
                primary = overlapRank === 0 ? Math.max(0, candidateRect.x - currentRect.right) : centerDx + perpendicularGap;
                secondary = Math.abs(centerDy);
                break;
            case 'up':
                if (candidateRect.y >= currentRect.y) return null;
                perpendicularGap = this.getIntervalGap(currentRect.x, currentRect.right, candidateRect.x, candidateRect.right);
                overlapRank = perpendicularGap === 0 ? 0 : 1;
                primary = overlapRank === 0 ? Math.max(0, currentRect.y - candidateRect.bottom) : -centerDy + perpendicularGap;
                secondary = Math.abs(centerDx);
                break;
            case 'down':
                if (candidateRect.y <= currentRect.y) return null;
                perpendicularGap = this.getIntervalGap(currentRect.x, currentRect.right, candidateRect.x, candidateRect.right);
                overlapRank = perpendicularGap === 0 ? 0 : 1;
                primary = overlapRank === 0 ? Math.max(0, candidateRect.y - currentRect.bottom) : centerDy + perpendicularGap;
                secondary = Math.abs(centerDx);
                break;
            default:
                return null;
        }
        return { primary, overlapRank, secondary, distance: this.getRectDistance(currentRect, candidateRect) };
    }
    /**
     * @param {{distance:number, primary:number, overlapRank:number, secondary:number}} a
     * @param {{distance:number, primary:number, overlapRank:number, secondary:number}} b
     * @returns {number}
     */
    compareDirectionalFocusScores(a, b) {
        if (a.distance !== b.distance) return a.distance - b.distance;
        if (a.primary !== b.primary) return a.primary - b.primary;
        if (a.overlapRank !== b.overlapRank) return a.overlapRank - b.overlapRank;
        return a.secondary - b.secondary;
    }
    /**
     * @param {{distance:number, primary:number, overlapRank:number, secondary:number}} a
     * @param {{distance:number, primary:number, overlapRank:number, secondary:number}} b
     * @returns {number}
     */
    compareWrappedReferenceFocusScores(a, b) {
        if (a.primary !== b.primary) return a.primary - b.primary;
        if (a.distance !== b.distance) return a.distance - b.distance;
        if (a.overlapRank !== b.overlapRank) return a.overlapRank - b.overlapRank;
        return a.secondary - b.secondary;
    }
    /**
     * @param {number} startA
     * @param {number} endA
     * @param {number} startB
     * @param {number} endB
     * @returns {number}
     */
    getIntervalGap(startA, endA, startB, endB) {
        if (endA < startB) return startB - endA;
        if (endB < startA) return startA - endB;
        return 0;
    }
    /**
     * @param {Rect} a
     * @param {Rect} b
     * @returns {number}
     */
    getRectDistance(a, b) {
        const gapX = this.getIntervalGap(a.x, a.right, b.x, b.right);
        const gapY = this.getIntervalGap(a.y, a.bottom, b.y, b.bottom);
        return Math.hypot(gapX, gapY);
    }
    /**
     * @param {Rect} currentRect
     * @param {Rect} scopeRect
     * @param {'left'|'right'|'up'|'down'} direction
     * @returns {Rect}
     */
    getWrappedReferenceRect(currentRect, scopeRect, direction) {
        switch (direction) {
            case 'left':
                return new Rect([scopeRect.right, currentRect.y, currentRect.w, currentRect.h]);
            case 'right':
                return new Rect([scopeRect.x - currentRect.w, currentRect.y, currentRect.w, currentRect.h]);
            case 'up':
                return new Rect([currentRect.x, scopeRect.bottom, currentRect.w, currentRect.h]);
            case 'down':
                return new Rect([currentRect.x, scopeRect.y - currentRect.h, currentRect.w, currentRect.h]);
        }
    }
    /**
     * @param {Widget|null} widget
     * @returns {boolean}
     */
    isFocusableScrollContainer(widget) {
        if (!(widget instanceof Widget) || !widget.canFocus) return false;
        const record = /** @type {Record<string, any>} */ (widget);
        return 'scrollX' in record && 'scrollY' in record && 'zoom' in record
            && typeof record.scrollableW === 'number' && typeof record.scrollableH === 'number';
    }
    /**
     * @param {Widget[]} focusables
     * @param {Widget} currentWidget
     * @param {'left'|'right'|'up'|'down'} direction
     * @param {Widget|null} [excludeDescendantsOf=null]
     * @returns {Widget|null}
     */
    getBestDirectionalFocusCandidate(focusables, currentWidget, direction, excludeDescendantsOf = null) {
        const currentRect = this.getWidgetGlobalRect(currentWidget);
        let best = null;
        let bestScore = null;
        for (const widget of focusables) {
            if (widget === currentWidget) continue;
            if (excludeDescendantsOf && this.isDescendantOf(widget, excludeDescendantsOf)) continue;
            const rect = this.getWidgetGlobalRect(widget);
            const score = this.getDirectionalFocusScore(currentRect, rect, direction);
            if (score && (bestScore === null || this.compareDirectionalFocusScores(score, bestScore) < 0)) {
                bestScore = score;
                best = widget;
            }
        }
        return best;
    }
    /**
     * @param {Widget[]} focusables
     * @param {Rect} currentRect
     * @param {Rect} scopeRect
     * @param {'left'|'right'|'up'|'down'} direction
     * @param {Widget|null} [excludeDescendantsOf=null]
     * @returns {Widget|null}
     */
    getBestWrappedFocusCandidate(focusables, currentRect, scopeRect, direction, excludeDescendantsOf = null) {
        const wrappedRect = this.getWrappedReferenceRect(currentRect, scopeRect, direction);
        let best = null;
        let bestScore = null;
        for (const widget of focusables) {
            if (excludeDescendantsOf && this.isDescendantOf(widget, excludeDescendantsOf)) continue;
            const rect = this.getWidgetGlobalRect(widget);
            const score = this.getDirectionalFocusScore(wrappedRect, rect, direction);
            if (score && (bestScore === null || this.compareWrappedReferenceFocusScores(score, bestScore) < 0)) {
                bestScore = score;
                best = widget;
            }
        }
        return best;
    }
    /**
     * @param {Widget} scope
     * @param {'left'|'right'|'up'|'down'} direction
     * @param {boolean} [wrap=this.focusWrap]
     * @returns {boolean}
     */
    moveFocusWithin(scope, direction, wrap = this.focusWrap) {
        if (!this.focusedWidget || !this.isDescendantOf(this.focusedWidget, scope)) return false;
        const focusables = this.getFocusableWidgets(scope).filter(widget => widget !== scope);
        let best = this.getBestDirectionalFocusCandidate(focusables, this.focusedWidget, direction);
        if (!best && wrap) {
            best = this.getBestWrappedFocusCandidate(
                focusables,
                this.getWidgetGlobalRect(this.focusedWidget),
                this.getWidgetGlobalRect(scope),
                direction,
            );
        }
        if (!best) return false;
        this.focusWidget(best);
        return true;
    }
    /**
     * @param {'left'|'right'|'up'|'down'} direction
     * @returns {boolean}
     */
    moveFocus(direction) {
        const { focusables } = this.ensureFocusValid();
        if (focusables.length === 0) return false;
        if (!this.focusedWidget) {
            this.focusWidget(focusables[0]);
            return true;
        }
        const excludeDescendantsOf = this.isFocusableScrollContainer(this.focusedWidget) ? this.focusedWidget : null;
        let best = this.getBestDirectionalFocusCandidate(focusables, this.focusedWidget, direction, excludeDescendantsOf);
        if (!best && this.focusWrap) {
            best = this.getBestWrappedFocusCandidate(
                focusables.filter(widget => widget !== this.focusedWidget),
                this.getWidgetGlobalRect(this.focusedWidget),
                this.getWidgetGlobalRect(this.getFocusScopeRoot()),
                direction,
                excludeDescendantsOf,
            );
        }
        if (best) {
            this.focusWidget(best);
            return true;
        }
        return false;
    }
    /**
     * @param {'left'|'right'|'up'|'down'} direction
     * @returns {boolean}
     */
    handleFocusDirection(direction) {
        this.ensureFocusValid();
        if (this.focusedWidget?.bubbleEvent('focus_direction', { direction, activateHeld: this.isActivateHeld() })) {
            return true;
        }
        return this.moveFocus(direction);
    }
    activateFocusedWidget() {
        const { focusables } = this.ensureFocusValid();
        if (!this.focusedWidget) {
            if (focusables.length === 0) return false;
            this.focusWidget(focusables[0]);
        }
        if (!this.focusedWidget) return false;
        return this.focusedWidget.bubbleEvent('activate', null);
    }
    escapeFocusedWidget() {
        const { scope } = this.ensureFocusValid();
        if (this.focusedWidget && this.focusedWidget.bubbleEvent('escape', null)) {
            return true;
        }
        return scope?.bubbleEvent('escape', null) ?? false;
    }
    pollGamepads() {
        if (this._connectedGamepads.size === 0) return;
        if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;
        const pads = navigator.getGamepads();
        if (!pads) return;
        const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now();
        for (const index of Array.from(this._connectedGamepads)) {
            const gp = pads[index];
            if (!gp) continue;
            this.handleAxis(index, 'x', gp.axes?.[0] ?? 0, 'left', 'right', now);
            this.handleAxis(index, 'y', gp.axes?.[1] ?? 0, 'up', 'down', now);
            this.handleDigitalDirection(index, 'left', gp.buttons?.[14]?.pressed ?? false, now);
            this.handleDigitalDirection(index, 'right', gp.buttons?.[15]?.pressed ?? false, now);
            this.handleDigitalDirection(index, 'up', gp.buttons?.[12]?.pressed ?? false, now);
            this.handleDigitalDirection(index, 'down', gp.buttons?.[13]?.pressed ?? false, now);
            this.handleGamepadButton(index, 0, gp.buttons?.[0]?.pressed ?? false, () => this.activateFocusedWidget());
            this.handleGamepadButton(index, 1, gp.buttons?.[1]?.pressed ?? false, () => this.escapeFocusedWidget());
        }
    }
    /**
     * @param {number} index
     * @param {number} buttonIndex
     * @param {boolean} pressed
     * @param {()=>boolean} callback
     */
    handleGamepadButton(index, buttonIndex, pressed, callback) {
        const key = `${index}:${buttonIndex}`;
        const wasPressed = this._gamepadButtonState.get(key) ?? false;
        if (pressed && !wasPressed) {
            if (callback()) this.app.requestFrameUpdate();
        }
        this._gamepadButtonState.set(key, pressed);
    }
    /**
     * @param {number} index
     * @param {'left'|'right'|'up'|'down'} direction
     * @param {boolean} pressed
     * @param {number} now
     */
    handleDigitalDirection(index, direction, pressed, now) {
        const key = `${index}:${direction}`;
        let state = this._gamepadDigitalState.get(key);
        if (!state) {
            state = { active: false, holdStart: 0, lastRepeat: 0 };
            this._gamepadDigitalState.set(key, state);
        }
        if (pressed) {
            if (!state.active) {
                state.active = true;
                state.holdStart = now;
                state.lastRepeat = 0;
                this.handleFocusDirection(direction);
            } else if (now - state.holdStart > this.gamepadRepeatDelay) {
                if (!state.lastRepeat || now - state.lastRepeat > this.gamepadRepeatInterval) {
                    this.handleFocusDirection(direction);
                    state.lastRepeat = now;
                }
            }
        } else if (state.active) {
            state.active = false;
            state.holdStart = 0;
            state.lastRepeat = 0;
        }
    }
    /**
     * @param {number} index
     * @param {'x'|'y'} axisName
     * @param {number} value
     * @param {'left'|'up'} negativeDir
     * @param {'right'|'down'} positiveDir
     * @param {number} now
     */
    handleAxis(index, axisName, value, negativeDir, positiveDir, now) {
        const key = `${index}:${axisName}`;
        let state = this._gamepadAxisState.get(key);
        if (!state) {
            state = { dir: 0, holdStart: 0, lastRepeat: 0 };
            this._gamepadAxisState.set(key, state);
        }
        let dir = 0;
        if (value <= -this.gamepadAxisThreshold) dir = -1;
        else if (value >= this.gamepadAxisThreshold) dir = 1;
        if (dir !== state.dir) {
            state.dir = dir;
            state.holdStart = dir ? now : 0;
            state.lastRepeat = 0;
            if (dir === -1) this.handleFocusDirection(negativeDir);
            else if (dir === 1) this.handleFocusDirection(positiveDir);
        } else if (dir !== 0) {
            if (now - state.holdStart > this.gamepadRepeatDelay) {
                if (!state.lastRepeat || now - state.lastRepeat > this.gamepadRepeatInterval) {
                    this.handleFocusDirection(dir === -1 ? negativeDir : positiveDir);
                    state.lastRepeat = now;
                }
            }
        }
    }
    /**
     * 
     * @param {TouchEvent} ev 
     * @param {'touch_up'|'touch_down'|'touch_move'|'touch_cancel'} name 
     */
    process_touch(ev, name) {
        this.app.requestFrameUpdate();
        if(this.grabbed !== null) {
            for(let to of ev.changedTouches) { 
                let pos = this.grabbed.appToWidget([to.clientX, to.clientY]);
                let t = new Touch({pos:pos, state:name, nativeObject:to, nativeEvent:ev, identifier:to.identifier});
                this.grabbed.emit(name, t);
            }
        } else {
            for(let to of ev.changedTouches) { 
                let t = new Touch({pos:this.app.toChild([to.clientX, to.clientY]), state:name, nativeObject:to, nativeEvent:ev, identifier:to.identifier});
                this.app.childEmit(name, t, true);
            }
        }
        ev.preventDefault();
    }
    /**
     * @param {PopStateEvent} ev
     * @param {string} name
     */
    process_back(ev, name) {
        if(location.hash === "#!/backbutton") {
            history.replaceState(null, document.title, location.pathname);
            this.app.childEmit('back_button', ev)
        }
    }
    /**
     * 
     * @param {MouseEvent} ev 
     * @param {'mouse_up'|'mouse_down'|'mouse_move'|'mouse_cancel'} name 
     */
    process_mouse(ev, name) {
        this.app.requestFrameUpdate();
        this.mouseev = ev;
        ev.preventDefault();
        if(this.mouseTouchEmulation) {
            /** @type {Record<'mouse_up'|'mouse_down'|'mouse_move'|'mouse_cancel', 'touch_up'|'touch_down'|'touch_move'|'touch_cancel'>} */
            const mapping = {'mouse_up':'touch_up','mouse_down':'touch_down','mouse_move':'touch_move','mouse_cancel':'touch_cancel'}
            if(ev.buttons!==1 && name!=='mouse_up') return;
            if(this.grabbed !== null) {
                let pos0 = [ev.clientX, ev.clientY];
                let pos = this.grabbed.appToWidget(pos0);
                let t = new Touch({pos:pos, state:mapping[name], nativeObject:ev, identifier:-1});
                this.grabbed.emit(mapping[name], t);
            } else {
                let t = new Touch({pos:this.app.toChild([ev.clientX, ev.clientY]), state:mapping[name], nativeObject:ev, identifier:-1});
                this.app.childEmit(mapping[name], t, true);
            }
        } else {
            if(this.grabbed !== null) {
                this.grabbed.emit(name, ev);
            } else {
                this.app.childEmit(name, ev, true);
            }
        }
    }
    /**
     * 
     * @param {WheelEvent} ev 
     * @param {'wheel'} name 
     * @returns {boolean|undefined}
     */
    process_wheel(ev, name) {
        // Use the event's data to call out to the appropriate gesture handlers
        if(this.mouseev==null) return;
        this.app.requestFrameUpdate();
        if(this.grabbed != null) {
            let pos = this.grabbed.appToWidget([this.mouseev.clientX, this.mouseev.clientY]);
            let t = new Touch({pos:pos, state:name, nativeObject:ev});
            return this.grabbed.emit(name, t);
        } else {
            let t = new Touch({pos:this.app.toChild([this.mouseev.clientX, this.mouseev.clientY]), state:name, nativeObject:ev});
            this.app.childEmit(name, t, true);
        }
        ev.preventDefault();
    }
    /**
     * @param {number} intensity1
     * @param {number} intensity2
     * @param {number} duration
     */
    vibrate(intensity1, intensity2, duration) {
        window.navigator.vibrate(duration); //default vibration does not support intensity -- could simulate by staggering pulses over the duration
    }
}
