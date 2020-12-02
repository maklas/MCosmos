/**
 * Creates new instance of Engine and start update function that's called every frame
 * @param canvas
 * @constructor
 * @code
 */
let Engine = function (canvas) {
    let engine = this;
    this._canvas = canvas;
    /** 2d context for rendering **/
    this.ctx = canvas.getContext(`2d`, { alpha: true });
    /** creates camera instance **/
    this.createCamera = function() {
        return new Camera(this._canvas);
    }
    /** Time passed since start in seconds **/
    this.timePassed = 0; //time passed since
    /** function that is called every frame. Has parameter dt **/
    this.updateFunction = null;
    /** time when last frame started in millis **/
    this._lastFrameStart = 0;
    /** frame count **/
    this.frame = 0;
    /** Last time fps was updated in millis **/
    this._lastFpsMeasure = 0;
    /** dt history **/
    this._dtHistory = [];
    /** history of frame times **/
    this._frameTimeHistory = [];
    /** current fps. Value is updated once every second **/
    this.fps = 30;
    /** how much time it takes to execute update. Value is updated once every second **/
    this.frameTime = 1/30;
    /** map of currently pressed buttons **/
    this.pressedButtons = [];
    /** Current mouse position **/
    this.mouse = new Vec(0, 0);
    /** Delta of mouse position from the last frame **/
    this.mouseDelta = new Vec(0, 0);
    /** position of mouse the last time it was down **/
    this.mouseDownPos = new Vec(0, 0);
    /**
     * The last time mouse was pressed down according to engine.timePassed
     * @type {number}
     */
    this.mouseDownTime = 0;

    window.addEventListener('keydown', function(e) {
        engine.pressedButtons[e.key] = true;
    });

    window.addEventListener('keyup', function(e) {
        engine.pressedButtons[e.key] = false;
    });

    window.addEventListener('mousemove', function(e) {
        engine.mouse.x = e.offsetX;
        engine.mouse.y = e.offsetY;
        engine.mouseDelta.x = e.movementX;
        engine.mouseDelta.y = e.movementY;
    });

    window.addEventListener('mousedown', function(e) {
        engine.mouseDownPos.set(e.offsetX, e.offsetY);
        engine.mouseDownTime = engine.timePassed;
    });

    this._update = function() {
        let frameStart = window.performance.now();
        let dt = (frameStart - engine._lastFrameStart) / 1000;
        if (dt > 1/10) {
            dt = 1.0/20; //slowing shit down if it lags
        } else if (dt <= 0) {
            dt = 1.0/144;
        }
        if (engine.updateFunction) {
            try {
                engine.updateFunction(dt);
            } catch (e) {
                console.log(e);
            }
            engine.timePassed += dt;
        }
        engine._lastFrameStart = frameStart;
        engine.frame++;
        engine._updateFps(frameStart, dt);
        window.requestAnimationFrame(engine._update);
    }

    this._updateFps = function(now, dt) {
        engine._frameTimeHistory.push(window.performance.now() - now);
        engine._dtHistory.push(dt);
        if (now - engine._lastFpsMeasure > 1000) {
            let sumDt = 0;
            for (let i = 0; i < engine._dtHistory.length; i++) {
                sumDt += engine._dtHistory[i];
            }
            engine.fps = 1 / (sumDt / engine._dtHistory.length);
            engine._dtHistory = [];

            let sumFt = 0;
            for (let i = 0; i < engine._frameTimeHistory.length; i++) {
                sumFt += engine._frameTimeHistory[i];
            }
            engine.frameTime = (sumFt / engine._frameTimeHistory.length) / 1000;
            engine._frameTimeHistory = [];

            engine._lastFpsMeasure = now;
        }
    }
    /**
     * whether or not any kind of input tag is selected. This might trigger action on
     * @returns {boolean}
     */
    this.isInputSelected = function () {
        return document.activeElement && document.activeElement.tagName.toUpperCase() === 'INPUT';
    }
    /** Diselects current element **/
    this.unselect = function () {
        if (document.activeElement) {
            document.activeElement.blur();
        }
    }

    console.log('Engine created');
    window.requestAnimationFrame(this._update);
};

/** Non-literal keys **/
const Keys = {
    arrowLeft: 'ArrowLeft',
    arrowRight: 'ArrowRight',
    arrowUp: 'ArrowUp',
    arrowDown: 'ArrowDown',
    shift: 'Shift',
    capsLock: 'CapsLock',
    control: 'Control',
    backspace: 'Backspace',
    enter: 'Enter',
    numLock: 'NumLock',
    home: 'Home',
    pageUp: 'PageUp',
    pageDown: 'PageDown',
    end: 'End',
    delete: 'Delete',
    space: ' ',
    insert: 'Insert',
};

/** Button ids **/
const Buttons = {
    left: 0,
    right: 2,
    middle: 1,
};

/**
 * 2d orthographic camera
 * @param canvas {HTMLCanvasElement}
 * @constructor
 */
let Camera = function (canvas) {
    this.canvas = canvas;
    this.x = 0;
    this.y = 0;
    this.zoom = 1; //the bigger, the further away we are from bodies

    /**
     * world to camera cordinates
     * @param x {number}
     * @param y {number}
     * @return {Vec}
     */
    this.toCamPoint = function(x, y) {
        return new Vec(((x - this.x) / this.zoom) + (this.baseWidth / 2), ((y - this.y) / this.zoom) + (this.baseHeight / 2));
    }
    /**
     * World to camera X
     * @param x {number}
     * @return {number}
     */
    this.toCamPointX = function(x) {
        return ((x - this.x) / this.zoom) + (this.baseWidth / 2);
    }
    /**
     * World to camera Y
     * @param y {number}
     * @return {number}
     */
    this.toCamPointY = function(y) {
        return ((y - this.y) / this.zoom) + (this.baseHeight / 2);
    }
    /**
     * World to cam point
     * @param v {Vec}
     * @param v.x {number}
     * @param v.y {number}
     * @return {Vec}
     */
    this.toCamPointV = function(v) {
        return this.toCamPoint(v.x, v.y);
    }
    /**
     * Camera to World point
     * @param x {number}
     * @param y {number}
     * @return {Vec}
     */
    this.toWorldPoint = function(x, y) {
        return new Vec(((x - this.baseWidth / 2) * this.zoom) + this.x, ((y - this.baseHeight / 2) * this.zoom) + this.y);
    }

    /**
     * Camera to World point
     * @param v {Vec}
     * @return {Vec}
     */
    this.toWorldPointV = function(v) {
        return new Vec(((v.x - this.baseWidth / 2) * this.zoom) + this.x, ((v.y - this.baseHeight / 2) * this.zoom) + this.y);
    }

    /**
     * returns true if this point is on screen using world cordinates
     * @param v {Vec}
     * @return {boolean}
     */
    this.inScreenWorld = function(v) {
        return this.x - this.width / 2 < v.x && this.x + this.width / 2 > v.x && this.y - this.height / 2 < v.y && this.y + this.height / 2 > v.y
    }
}

Camera.prototype = {
    /**
     * Canvas width
     * @return {number}
     */
    get baseWidth() {
        return this.canvas.width;
    },
    /**
     * Canvas height
     * @return {number}
     */
    get baseHeight() {
        return this.canvas.height;
    },
    /**
     * World width
     * @return {number}
     */
    get width() {
        return this.baseWidth * cam.zoom;
    },
    /**
     * World height
     * @return {number}
     */
    get height() {
        return this.baseHeight * cam.zoom;
    }
}

/**
 * Helps to render stuff through camera
 * @param cam {Camera}
 * @constructor
 */
let Renderer = function (cam) {
    this.ctx = cam.canvas.getContext('2d');

    this.beginPath = function () {this.ctx.beginPath()};
    this.stroke = function () {this.ctx.stroke()};
    this.fill = function () {this.ctx.fill()};

    this.moveTo = function(x, y) {
        x = cam.toCamPointX(x);
        y = cam.toCamPointY(y);
        this.ctx.moveTo(x, y);
    }

    this.lineTo = function(x, y) {
        x = cam.toCamPointX(x);
        y = cam.toCamPointY(y);
        this.ctx.lineTo(x, y);
    }

    this.arc = function(x, y, radius, startAngle, endAngle, anticlockwise) {
        x = cam.toCamPointX(x);
        y = cam.toCamPointY(y);
        radius = radius / cam.zoom;
        this.ctx.arc(x, y, radius, startAngle, endAngle, anticlockwise);
    }

    this.circle = function(x, y, radius) {
        radius = radius / cam.zoom;
        this.ctx.arc(cam.toCamPointX(x), cam.toCamPointY(y), radius, 0, Math.PI * 2);
    }

    this.rect = function(x1, y1, w, h) {
        x1 = cam.toCamPointX(x1);
        y1 = cam.toCamPointY(y1);
        w /= cam.zoom;
        h /= cam.zoom;
        this.ctx.rect(x1, y1, w, h);
    }

    this.point = function(x, y) {
        x = cam.toCamPointX(x);
        y = cam.toCamPointY(y);
        this.ctx.rect(x, y, 1, 1);
    }

    this.fillText = function(text, x, y, maxWidth) {
        x = cam.toCamPointX(x);
        y = cam.toCamPointY(y);
        this.ctx.fillText(text, x, y, maxWidth);
    }

    this.clearRect = function () {
        this.ctx.clearRect(0, 0, cam.baseWidth, cam.baseHeight);
    }

}

Renderer.prototype = {
    get lineWidth() {
        return this.ctx.lineWidth;
    },
    set lineWidth(lineWidth) {
        ctx.lineWidth = lineWidth;
    },
    get strokeStyle() {
        return this.ctx.strokeStyle;
    },
    set strokeStyle(strokeStyle) {
        ctx.strokeStyle = strokeStyle;
    },
    get fillStyle() {
        return this.ctx.fillStyle;
    },
    set fillStyle(fillStyle) {
        ctx.fillStyle = fillStyle;
    },
    get font() {
        return this.ctx.font;
    },
    set font(font) {
        ctx.font = font;
    }
}