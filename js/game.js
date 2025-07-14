
const MAX_VELOCITY = C - 2;
const MAX_VELOCITY2 = MAX_VELOCITY * MAX_VELOCITY;

/* COLORS */
const COLOR_CENTER = 'rgba(255, 0, 0)';
const COLOR_TRACK = 'rgb(52,91,149)';
const COLOR_PREDICTION = 'rgba(200,0,255,0.5)';
const COLOR_NAMES = 'rgb(40,34,34)';
const COLOR_BLACK = 'rgba(0, 0, 0)';
const COLOR_BLACK_HOLE_SHADOW = 'rgb(35,35,35)';
const COLOR_INNER_STABLE_ORBIT = 'rgb(106,0,0)';
const COLOR_PHOTON_RING = 'rgba(255,167,0,0.39)';
const COLOR_VELOCITY = 'rgb(0, 0, 255)';
const COLOR_ACCELERATION = 'rgb(255, 0, 0)';
const COLOR_BODY_TO_BODY = 'rgb(128, 21, 21)';
const COLOR_GRAVITY_FIELD = 'rgb(200, 50, 50, 0.8)';

let canvas = document.getElementById('canvas');
let engine = new Engine(canvas);
let cam = engine.createCamera();
let renderer = new Renderer(cam);
let ctx = engine.ctx;
let timePassed = 0; //time passed in simulation since the beginning
let timeScale = 60 * 60 * 24; //1 day per second
let steps = 50; //steps per frame
let bodyTrackLength = 3000; //number of lines after each body to render
let photonTrackLength = 60; //number of lines after each body to render
let trackFrame = 5;
let bodies = new BodyBag();

let worldDt;
/** Currently selected body @type {Body} **/
let target = null;
let isSimulating = false;
let isDrawRelativeTracks = true; //when target is selected, draw tracks relative to selected body
let isDrawTracks = true;
let isDrawGField = false;
let moving = false; //is Moving camera right now

//Parameters of new launching body
let isLaunching = false;
/** world position @type {Vec} **/
let launchStart = null; //world vec
/** @type {Body} **/
let launchRelBody = null;


/* BODIES */
let sun = new Body('Sun', Type.STAR, 1.989e30, 696340000, new Vec(0, 0), new Vec(0, 0), true);
let mercury = new Body('Mercury', Type.PLANET, 0.33e24, 2.4395e6, new Vec(0, 5.79e10), new Vec(47.4e3, 0), true);
let venus = new Body('Venus', Type.PLANET, 4.87e24, 6052e3, new Vec(0, 1.082e11), new Vec(35.0e3, 0), true);
let earth = new Body('Earth', Type.PLANET, 5.972e24, 6371000, new Vec(0, 147.62e9), new Vec(30e3, 0), true);
let moon = new Body('Moon', Type.MOON, 7.348e22, 1737000, new Vec(0, earth.pos.y + 3.844e8), new Vec(earth.vel.x + 1023, 0), true);
let mars = new Body('Mars', Type.PLANET, 0.642e24, 3396e3, new Vec(0, 2.279e11), new Vec(24.1e3, 0), true);
let jupiter = new Body('Jupiter', Type.PLANET, 1.898e27, 6.991e7, new Vec(0, 7.786e11), new Vec(13.1e3, 0), true);
let saturn = new Body('Saturn', Type.PLANET, 568e24, 60268e3, new Vec(0, 1433.5e9), new Vec(9.7e3, 0), true);
let uranus = new Body('Uranus', Type.PLANET, 86.8e24, 25559e3, new Vec(0, 2872.5e9), new Vec(6.8e3, 0), true);
let neptune = new Body('Neptune', Type.PLANET, 102.0e24, 24764e3, new Vec(0, 4495.1e9), new Vec(5.4e3, 0), true);
let pluto = new Body('Pluto', Type.PLANET, 0.0146e24, 1185e3, new Vec(0, 5906.4e9), new Vec(4.7e3, 0), true);

bodies.push(sun, mercury, venus, earth, moon, mars, jupiter, saturn, uranus, neptune, pluto); target = earth; steps = 300;
/*
let bh = new Body('Super Massive', Type.BLACK_HOLE, sun.mass * 4e6, 1, new Vec(0, 0), new Vec(0, 0), true);
bodies.push(bh); timeScale = 1; steps = 1000;
let startX = bh.pos.x + bh.renderRadius * 6;
let startY = bh.pos.y;
let deltaY = -bh.renderRadius * 3 / 100;
for (let i = 0; i < 100; i++) {
    bodies.push(new Photon(new Vec(startX, startY), new Vec(-1, 0), 1e13));
    startY += deltaY;
}
*/


/* INITIALIZATION */

function setSimulating(b) {
    isSimulating = b;
}

function setDrawGField(b) {
    isDrawGField = b;
}

function setDrawTracks(b) {
    isDrawTracks = b;
}

function setDrawRelativeTracks(b) {
    isDrawRelativeTracks = b;
}

renderer.font = 'bold 18px serif';
canvas.addEventListener('mousedown', e => {
    if (engine.pressedButtons[Keys.shift]) {
        isLaunching = true;
        setSimulating(false);
        launchStart = cam.toWorldPoint(e.offsetX, e.offsetY);
        launchRelBody = target;
    } else {
        moving = true;
    }
});
window.addEventListener('mouseup', e => {
    moving = false;
    if (isLaunching) {
        let vel = getAbsoluteLaunchVelocity(launchStart, cam.toWorldPoint(e.offsetX, e.offsetY));
        let mass = 1;
        let radius = Math.sqrt(mass / Math.PI) / 216410; //earth density
        let body = new Body(null, Type.MOON, mass, radius, new Vec(launchStart.x, launchStart.y), new Vec(vel.x, vel.y), true);
        bodies.push(body);
        target = body;
    }
    isLaunching = false;
    launchRelBody = null;
    if (engine.timePassed - engine.mouseDownTime < 0.2 && engine.mouseDownPos.dst2XY(e.offsetX, e.offsetY) < 9) {
        let worldPos = cam.toWorldPoint(e.offsetX, e.offsetY);
        target = getBodyAt(worldPos.x, worldPos.y);
    }
});
canvas.addEventListener('mousemove', e => {
    if (moving) {
        cam.x -= e.movementX * cam.zoom;
        cam.y -= e.movementY * cam.zoom;
    }
});
canvas.addEventListener('wheel', function(e) {
    let zoomIn = e.wheelDelta > 0;
    let zoomMultiplier = 2;
    let oldZoom = cam.zoom;
    cam.zoom = zoomIn ? cam.zoom / zoomMultiplier : cam.zoom * zoomMultiplier;
    let mouseOnScreenFromCenter = {x: engine.mouse.x - cam.baseWidth / 2, y: engine.mouse.y - cam.baseHeight / 2}
    if (zoomIn) {
        cam.x += (mouseOnScreenFromCenter.x * oldZoom) - ((mouseOnScreenFromCenter.x * oldZoom) / zoomMultiplier);
        cam.y += (mouseOnScreenFromCenter.y * oldZoom) - ((mouseOnScreenFromCenter.y * oldZoom) / zoomMultiplier)
    } else {
        let tx = (mouseOnScreenFromCenter.x * oldZoom) * zoomMultiplier;
        let ty = (mouseOnScreenFromCenter.y * oldZoom) * zoomMultiplier;
        cam.x += (mouseOnScreenFromCenter.x * oldZoom) - tx;
        cam.y += (mouseOnScreenFromCenter.y * oldZoom) - ty;
    }
});
document.addEventListener('keydown', function(e){
    if (engine.isInputSelected()) {
        return;
    }
    let key = e.key.toLowerCase();
    if(key === 's' || key === 'ы') {
        setSimulating(!isSimulating);
    }
    if(key === 'p' || key === 'з') {
        bodies.photons = [];
    }
    if(key === 'g' || key === 'п') {
        setDrawGField(!isDrawGField);
    }
    if(key === 't' || key === 'е') {
        setDrawTracks(!isDrawTracks);
    }
    if(key === 'y' || key === 'н') {
        setDrawRelativeTracks(!isDrawRelativeTracks);
    }
    if (key > '0' && key < '9') {
        onNumberPressed(key);
    }
    if (e.key === Keys.delete) {
        if (isLaunching) {
            isLaunching = false;
        } else if (target) {
            bodies.remove(target);
            target = null;
        }
    }
    let iterableBodies = bodies.gravitationalBodies;
    if (e.key === Keys.arrowLeft) {
        if (target) {
            let i = iterableBodies.indexOf(target) - 1;
            if (i < 0) {
                i = iterableBodies.length - 1;
            }
            target = iterableBodies.length === 0 ? null : iterableBodies[i];
        } else if (bodies.length > 0) {
            target = iterableBodies[0];
        }
        if (target) {
            cam.x = target.pos.x;
            cam.y = target.pos.y;
        }
    } else if (e.key === Keys.arrowRight) {
        if (target) {
            let i = iterableBodies.indexOf(target) + 1;
            if (i >= iterableBodies.length) {
                i = 0;
            }
            target = iterableBodies.length === 0 ? null : iterableBodies[i];
        } else if (iterableBodies.length > 0) {
            target = iterableBodies[iterableBodies.length - 1];
        }
        if (target) {
            cam.x = target.pos.x;
            cam.y = target.pos.y;
        }
    }
})

cam.zoom = cam.zoom = 1e8;

// randomizing body positions
for (const body of bodies) {
    if (!body.name || (body.name !== 'Moon' && body.name !== 'Earth')) {
        let angle = random(0, Math.PI * 2);
        body.pos.rotate(angle);
        body.vel.rotate(angle);
    }
}

engine.updateFunction = function (dt) {
    worldDt = dt * timeScale;

    processInput();
    if (isSimulating) {
        let s = getActualNumberOfSteps();
        for (let i = 0; i < s; i++) {
            let stepDt = worldDt / s;
            updateGravitation(stepDt);
            updateBodies(stepDt);
            checkCollision();
        }
        if (engine.frame % trackFrame === 0) {
            updateTracks();
        }
        timePassed += worldDt;
    }
    updateCamera();
    render();
};

function processInput() {
    let scale = 1.015;
    if (engine.pressedButtons[Keys.shift]) {
        scale += 0.02;
    }
    if (engine.pressedButtons[Keys.arrowUp]) {
        timeScale *= scale;
    } else if (engine.pressedButtons[Keys.arrowDown]) {
        timeScale /= scale;
    }
}
function onNumberPressed(key) {
    if (key === '1') {
        bodies.push(new Photon(cam.toWorldPoint(engine.mouse.x, engine.mouse.y), new Vec(0, -1), 5.5e+14));
    }
    if (key === '2') {
        let dir = new Vec(1, 0);
        for (let i = 0; i < 180; i++) {
            bodies.push(new Photon(cam.toWorldPoint(engine.mouse.x, engine.mouse.y), dir, 5.5e+14)); //green light
            dir.rotate((360 / 179) * degToRad);
        }
    }
    if (key === '3') {
        let dir = new Vec(0, -1);
        let pos = cam.toWorldPoint(engine.mouse.x, engine.mouse.y).addXY(- 100 * cam.zoom, 0);
        for (let i = 0; i < 50; i++) {
            bodies.push(new Photon(pos, dir, 5.5e+14)); //green light
            pos.addXY(4 * cam.zoom, 0)
        }
    }
    if (key === '4') {
        let dir = new Vec(0, -1);
        let pos = cam.toWorldPoint(engine.mouse.x, engine.mouse.y);
        bodies.push(new Body('Super Massive Black Hole', Type.BLACK_HOLE, 1000 * sun.mass, 1, pos, new Vec(0, 0), false)); //green light
        //pos.addXY(4 * cam.zoom, 0)
    }
}

/* since can't allow too small step size */
function getActualNumberOfSteps() {
    const minStepSize = 1.0/1_000_000; //1 microsecond
    const desiredStepSize = ((1 / engine.fps) * timeScale) / steps;
    if (desiredStepSize > minStepSize) {
        return steps;
    } else {
        let s = Math.floor(((1 / engine.fps) * timeScale) / minStepSize);
        return s < 1 ? 1 : s;
    }
}

function updateGravitation(dt) {
    //reset accelerations
    for (const body of bodies) {
        body.ax = 0;
        body.ay = 0;
    }
    //first, update big bodies relative to themselves
    let gravitationalBodies = bodies.gravitationalBodies;
    let len = gravitationalBodies.length;
    for (let i = 0; i < len; i++) {
        const a = gravitationalBodies[i];
        for (let j = i + 1; j < len; j++) {
            let b = gravitationalBodies[j];
            applyGravitation(a, b, dt);
        }
    }
    //second, update bodies that do not apply gravitation to others
    let nonGravitationalBodies = bodies.nonGravitationalBodies;
    let ngLen = nonGravitationalBodies.length;
    for (let i = 0; i < ngLen; i++) {
        const a = nonGravitationalBodies[i];
        for (let j = 0; j < len; j++) {
            let b = gravitationalBodies[j];
            applyGravitationToA(a, b, dt);
        }
    }
    if (bodies.photons.length > 0) {
        let baseVec = new Vec(C * dt, 0);
        for (const photon of bodies.photons) {
            for (let i = 0; i < len; i++) {
                const b = gravitationalBodies[i];
                if (b.type !== Type.BLACK_HOLE) continue;
                let dstToBlackHole = photon.pos.dst(b.pos);
                dstToBlackHole = dstToBlackHole < b.renderRadius ? b.renderRadius : dstToBlackHole;
                //let spaceCurvatureForce = 1 - Math.sqrt(1 - (b.renderRadius / dstToBlackHole)); ???
                let gravitationalPull = getGravitationalForceForPhoton(b, photon);
                photon.angle = baseVec.set(C, 0).rotate(photon.angle).addXY(gravitationalPull.x * dt, gravitationalPull.y * dt).angle;
            }
        }
    }
}

/**
 * Calculates gravitational pull and saves it in body.ax, body.ay
 * @param a {Body}
 * @param b {Body}
 * @param dt {number}
 */
function applyGravitation(a, b, dt) {
    let dst2 = a.pos.dst2(b.pos);
    let dst = Math.sqrt(dst2);
    let f = (GRAVITATIONAL_CONSTANT * a.mass * b.mass) / (dst2);
    let fx = ((b.pos.x - a.pos.x) / dst) * f * dt;
    let fy = ((b.pos.y - a.pos.y) / dst) * f * dt;

    a.ax += fx / a.mass;
    a.ay += fy / a.mass;
    b.ax -= fx / b.mass;
    b.ay -= fy / b.mass;
}

/**
 * Calculates gravitational pull and saves it in body.ax, body.ay.
 * Gravitation is only calculated for body a
 * @param a {Body}
 * @param b {Body}
 * @param dt {number}
 */
function applyGravitationToA(a, b, dt) {
    let dst2 = a.pos.dst2(b.pos);
    let dst = Math.sqrt(dst2);
    let f = (GRAVITATIONAL_CONSTANT * b.mass) / (dst2);
    let fx = ((b.pos.x - a.pos.x) / dst) * f * dt;
    let fy = ((b.pos.y - a.pos.y) / dst) * f * dt;

    a.ax += fx;
    a.ay += fy;
}

/**
 * Update velocities and positions of bodies. Use one of:
 * Newtonian physics - for speed and predictability
 * Einstein's velocity addition formula for relativistic approach
 * @param dt {number}
 */
function updateBodies(dt) {
    for (const body of bodies) {
        //newtonian
        /*
        body.vel.addXY(body.ax, body.ay);
        if (body.vel.len2 >= C2) {
            body.vel.setLen(C);
        }
        body.pos.addXY(body.vel.x * dt, body.vel.y * dt);
        */

        //relativistic u = (v+w) /(1 + (v * w)/c²)
        let angle = body.vel.angle;
        let velChange = new Vec(body.ax, body.ay);
        body.vel.rotate(-angle);
        velChange.rotate(-angle);
        let lorentz = 1/Math.sqrt(1 - (body.vel.x * body.vel.x)/C2)
        let newVel = new Vec(
            (body.vel.x + velChange.x) / (1 + (body.vel.x * velChange.x) / C2),
            velChange.y / (1 + (body.vel.x * velChange.x / C2) * lorentz)
        );
        newVel.rotate(angle);
        if (newVel.len2 >= MAX_VELOCITY2) {
            newVel.setLen(MAX_VELOCITY);
        }
        body.vel.set(newVel.x, newVel.y);

        body.pos.addXY(body.vel.x * dt, body.vel.y * dt);
    }

    if (bodies.photons.length > 0) {
        let speed = C * dt;
        let velVec = new Vec(speed, 0);
        for (const photon of bodies.photons) {
            velVec.set(speed, 0);
            velVec.rotate(photon.angle);
            photon.pos.add(velVec);
        }
    }
}


function checkCollision() {
    let collidedPairs = [];
    let gravitationalBodies = bodies.gravitationalBodies;
    for (let i = 0; i < gravitationalBodies.length; i++) {
        let a = gravitationalBodies[i];
        for (let j = i + 1; j < gravitationalBodies.length; j++) {
            let b = gravitationalBodies[j];
            let maxDst2 = a.radius > b.radius ? a.radius * a.radius : b.radius * b.radius;
            if (a.pos.dst2(b.pos) < maxDst2) {
                collidedPairs.push({a: a, b: b});
            }
        }
    }
    let nonGravitationalBodies = bodies.nonGravitationalBodies;
    for (let i = 0; i < nonGravitationalBodies.length; i++) {
        let a = nonGravitationalBodies[i];
        for (let j = 0; j < gravitationalBodies.length; j++) {
            let b = gravitationalBodies[j];
            let maxDst2 = a.radius > b.radius ? a.radius * a.radius : b.radius * b.radius;
            if (a.pos.dst2(b.pos) < maxDst2) {
                collidedPairs.push({a: a, b: b});
            }
        }
    }
    for (const pair of collidedPairs) {
        if (!pair.a.removed && !pair.b.removed) {
            collided(pair.a, pair.b);
        }
    }
}

/**
 * Collision event
 * @param a {Body}
 * @param b {Body}
 */
function collided(a, b) {
    let gainer = a.mass >= b.mass ? a : b;
    let destroyedBody = a.mass >= b.mass ? b : a;

    if (destroyedBody === target) {
        target = gainer;
    }
    bodies.remove(destroyedBody);
    console.log(destroyedBody.name + ' (' + destroyedBody.type.name + ') was consumed by ' + gainer.name);
    gainer.applyImpulse(destroyedBody.impulse);
    let gainerArea = getCircleArea(gainer.radius);
    let destroyedArea = getCircleArea(destroyedBody.radius);
    gainer.radius = Math.sqrt((gainerArea + destroyedArea) / Math.PI);
    gainer.mass += destroyedBody.mass;
}

function updateTracks() {
    for (const body of bodies) {
        if (body.track) {
            body.track.push(body.pos.cpy());
            if (body.track.length > bodyTrackLength) {
                body.track.shift();
            }
        }
    }
    for (const photon of bodies.photons) {
        if (photon.track) {
            photon.track.push(photon.pos.cpy());
            if (photon.track.length > photonTrackLength) {
                photon.track.shift();
            }
        }
    }
}


 /* RENDERING */

function updateCamera() {
    if (engine.pressedButtons[Keys.space] && target) {
        cam.x = target.pos.x;
        cam.y = target.pos.y;
    }
}

function render() {
    renderer.clearRect(); //clear canvas
    drawBlackHoleBackground();
    if (isDrawTracks) {
        if (target && target.track && isDrawRelativeTracks) {
            drawRelativeTrackLines(target);
        } else {
            drawTrackLines();
        }
    }
    drawBodies();
    if (target) {
        drawForces(target);
    }
    if (isLaunching) {
        drawLaunch();
    }
    if (isDrawGField) {
        drawGravityField();
    }
    drawCenterOfMass();
    drawNames();
    drawStats();
}


function drawTrackLines() {
    renderer.strokeStyle = COLOR_TRACK; //line color
    renderer.lineWidth = 1; //width of lines

    renderer.beginPath();
    for (const body of bodies) {
        let track = body.track;
        if (!track || track.length === 0) continue;

        renderer.moveTo(track[0].x, track[0].y);
        for (let i = 1; i < track.length; i++) {
            let point = track[i];
            renderer.lineTo(point.x, point.y);
        }
        if (trackFrame > 1) {
            renderer.lineTo(body.pos.x, body.pos.y);
        }
    }
    for (const photon of bodies.photons) {
        let track = photon.track;
        if (!track || track.length === 0) continue;

        renderer.moveTo(track[0].x, track[0].y);
        for (let i = 1; i < track.length; i++) {
            let point = track[i];
            renderer.lineTo(point.x, point.y);
        }
        if (trackFrame > 1) {
            renderer.lineTo(photon.pos.x, photon.pos.y);
        }
    }
    renderer.stroke();
}

/**
 * @param relativeBody {Body}
 */
function drawRelativeTrackLines(relativeBody) {
    renderer.strokeStyle = COLOR_TRACK; //line color
    renderer.lineWidth = 1; //width of lines

    let relTrack = relativeBody.track;
    if (!relTrack || relTrack.length === 0) return;

    renderer.beginPath();
    for (const body of bodies) {
        if (body === relativeBody || !body.track) continue;
        let curTrack = body.track;
        let minLen = relTrack.length < curTrack.length ? relTrack.length : curTrack.length;
        if (minLen === 0) continue;

        renderer.moveTo(curTrack[curTrack.length - 1].x - relTrack[relTrack.length - 1].x + relativeBody.pos.x, curTrack[curTrack.length - 1].y - relTrack[relTrack.length - 1].y + relativeBody.pos.y);
        for (let i = 2; i < minLen; i++) {
            let point = curTrack[curTrack.length - i];
            let relPoint = relTrack[relTrack.length - i];
            renderer.lineTo(point.x - relPoint.x + relativeBody.pos.x, point.y - relPoint.y + relativeBody.pos.y);
        }
    }
    renderer.stroke();
}

function drawBodies() {
    renderer.lineWidth = 2;

    renderer.strokeStyle = COLOR_BLACK;
    for (const body of bodies) {
        renderer.fillStyle = body.type.color;
        renderer.beginPath();
        let width = body.renderRadius / cam.zoom < body.type.minRadius ? body.type.minRadius * cam.zoom : body.renderRadius;
        renderer.circle(body.pos.x, body.pos.y, width);
        renderer.fill();
        renderer.stroke();
    }
    if (bodies.photons.length > 0) {
        renderer.strokeStyle = Type.PHOTON.color;
        for (const photon of bodies.photons) {
            renderer.beginPath();
            let w = photon.type.minRadius * cam.zoom * 3;
            renderer.rect(photon.pos.x - w/2, photon.pos.y - w/2, w, w);
            renderer.stroke();
        }
    }
}

function drawBlackHoleBackground() {
    renderer.lineWidth = 2;
    for (const bh of bodies.gravitationalBodies) {
        if (bh.type !== Type.BLACK_HOLE) continue;

        renderer.fillStyle = COLOR_BLACK_HOLE_SHADOW;
        renderer.beginPath();
        let shadowRadius = bh.renderRadius * 2.6;
        renderer.circle(bh.pos.x, bh.pos.y, shadowRadius);
        renderer.fill();

        renderer.strokeStyle = COLOR_PHOTON_RING;
        renderer.beginPath();
        let photonRingRadius = bh.renderRadius * 1.5;
        renderer.circle(bh.pos.x, bh.pos.y, photonRingRadius);
        renderer.stroke();

        renderer.strokeStyle = COLOR_INNER_STABLE_ORBIT;
        renderer.beginPath();
        let innerStableOrbitRadius = bh.renderRadius * 3;
        renderer.circle(bh.pos.x, bh.pos.y, innerStableOrbitRadius);
        renderer.stroke();
    }
}

/**
 * @param body
 * @return {number}
 */
function getBodyVisibleRadius(body) {
    return body.renderRadius / cam.zoom < body.type.minRadius ? body.type.minRadius * cam.zoom : body.renderRadius;
}



/**
 * Renders velocity and acceleration of bodies
 * @param body {Body}
 */
function drawForces(body) {
    let nextSecondPos = body.vel.cpy().mul(timeScale).add(body.pos);
    let acceleration = getGravitationalPull(body).div(body.mass);

    renderer.strokeStyle = COLOR_VELOCITY;
    drawArrow(body.pos, nextSecondPos, 7);
    renderer.strokeStyle = COLOR_ACCELERATION;
    drawArrow(body.pos, acceleration.mul(timeScale).add(body.pos), 7);
}

/**
 * Sum of gravitational forces of other bodies on this body
 * @param body {Body}
 * @return {Vec}
 */
function getGravitationalPull(body) {
    let pull = new Vec(0, 0);
    for (const b of bodies.gravitationalBodies) {
        if (b !== body) {
            let f = getGravitationalForce(body, b);
            pull.add(f);
        }
    }
    return pull;
}

/**
 * @param from {Vec}
 * @param to {Vec}
 * @param wingLen {?number}
 */
function drawArrow(from, to, wingLen) {
    wingLen = (wingLen || 10) * cam.zoom;
    let a = to.cpy().sub(from).angle;
    let rightWing = new Vec(-wingLen, wingLen).rotate(a);
    renderer.beginPath();
    renderer.moveTo(from.x, from.y);
    renderer.lineTo(to.x, to.y);
    renderer.lineTo(to.x + rightWing.x, to.y + rightWing.y);
    let leftWing = rightWing.rotate(90 * degToRad);
    renderer.moveTo(to.x, to.y);
    renderer.lineTo(to.x + leftWing.x, to.y + leftWing.y);
    renderer.stroke();
}



function drawLaunch() {
    let mousePositionWorld = cam.toWorldPointV(engine.mouse);

    if (launchRelBody) {
        //render vector from rel body to new body
        renderer.strokeStyle = COLOR_BODY_TO_BODY;
        drawArrow(launchRelBody.pos, launchStart, 7);

        if (mousePositionWorld.dst2(launchStart) === 0) return;
        //drawing prediction

        let predictionTime = 120;
        let predictionStep = 1 / 60;
        renderer.strokeStyle = COLOR_PREDICTION;
        renderer.beginPath();
        renderer.moveTo(launchStart.x, launchStart.y);
        let vel = getLaunchVelocity(launchStart, mousePositionWorld);
        let tempBody = {pos: new Vec(launchStart.x, launchStart.y), vel: new Vec(vel.x, vel.y), mass: 1};
        for (let t = 0; t < predictionTime; t += predictionStep) {
            let pdt = predictionStep * timeScale; //actual step time to use
            let f = getGravitationalForce(tempBody, launchRelBody).mul(pdt);
            tempBody.vel.add(f);
            tempBody.pos.addXY(tempBody.vel.x * pdt, tempBody.vel.y * pdt);
            renderer.lineTo(tempBody.pos.x, tempBody.pos.y);
            if (getBodyAt(tempBody.pos.x, tempBody.pos.y) === launchRelBody) {
                break;
            }
        }
        renderer.stroke();
    }

    //velocity vector
    renderer.strokeStyle = COLOR_VELOCITY;
    drawArrow(launchStart, mousePositionWorld, 7);
}

/**
 * uses World coordinates. Does not count relative body
 * @param from {Vec}
 * @param to {Vec}
 * @return {Vec}
 */
function getLaunchVelocity(from, to) {
    let v = new Vec((to.x - from.x) / timeScale, (to.y - from.y) / timeScale);
    if (v.len2 > MAX_VELOCITY2) {
        v.setLen(MAX_VELOCITY);
    }
    return v;
}

/**
 * uses World coordinates. Counts relative body,
 * so this velocity is velocity relative to world cordinate system
 * @param from {Vec}
 * @param to {Vec}
 * @return {Vec}
 */
function getAbsoluteLaunchVelocity(from, to) {
    let v = new Vec((to.x - from.x) / timeScale, (to.y - from.y) / timeScale);
    if (launchRelBody) {
        v.add(launchRelBody.vel);
    }
    if (v.len2 > MAX_VELOCITY2) {
        v.setLen(MAX_VELOCITY);
    }
    return v;
}

/**
 * Vector representing gravitational force from body a to body b
 * @param a {Body}
 * @param b {Body}
 * @return {Vec}
 */
function getGravitationalForce(a, b) {
    let dst2 = b.pos.dst2(a.pos);
    let dst = Math.sqrt(dst2);
    let f = (GRAVITATIONAL_CONSTANT * a.mass * b.mass) / (dst2);
    return b.pos.cpy().sub(a.pos).mul(f / dst);
}

/**
 * Vector representing gravitational force from position to a body
 * @param body {Body}
 * @param photon {Photon}
 * @return {Vec}
 */
function getGravitationalForceForPhoton(body, photon) {
    let dst2 = photon.pos.dst2(body.pos);
    let dst = Math.sqrt(dst2);
    let f = (GRAVITATIONAL_CONSTANT * body.mass) / (dst2);
    return body.pos.cpy().sub(photon.pos).mul(f / dst);
}


function drawGravityField() {
    renderer.strokeStyle = COLOR_GRAVITY_FIELD;
    renderer.lineWidth = 1;
    const gap = 15 * cam.zoom;
    const wingLen = (gap / cam.zoom) / 7;
    for (let x = cam.x - cam.width / 2; x < cam.x + cam.width / 2; x+= gap) {
        for (let y = cam.y - cam.height / 2; y < cam.y + cam.height / 2; y+= gap) {
            let point = new Vec(x, y);
            let force = getGravitationalForceAtPoint(point);
            force.setLen(gap / 2);
            force.add(point);
            drawArrow(point, force, wingLen);
        }
    }
}

/**
 * Gravitational force at point in world coordinates
 * @param p {Vec} point
 * @return {Vec}
 */
function getGravitationalForceAtPoint(p) {
    let fX = 0;
    let fY = 0;
    for (const b of bodies.gravitationalBodies) {
        let dst2 = b.pos.dst2(p);
        let dst = Math.sqrt(dst2);
        let f = (GRAVITATIONAL_CONSTANT * b.mass) / (dst2);
        fX += ((b.pos.x - p.x) / dst) * f;
        fY += ((b.pos.y - p.y) / dst) * f;
    }
    return new Vec(fX, fY);
}

function drawCenterOfMass() {
    renderer.fillStyle = COLOR_CENTER;
    renderer.beginPath();
    let centerOfMass = getCenterOfMass();
    renderer.circle(centerOfMass.x, centerOfMass.y, 2 * cam.zoom);
    renderer.fill();
}

/**
 * @return {Vec}
 */
function getCenterOfMass() {
    let M = 0;
    let sumMX = 0;
    let sumMY = 0;
    for (const body of bodies.gravitationalBodies) {
        M += body.mass;
        sumMX += body.mass * body.pos.x;
        sumMY += body.mass * body.pos.y;
    }
    return new Vec(sumMX / M, sumMY / M);
}


function drawNames() {
    renderer.fillStyle = COLOR_NAMES;
    for (const body of bodies) {
        if (body.name) {
            if (body.type <= Type.STAR || cam.zoom < 5e10) {
                renderer.fillText(body.name, body.pos.x, body.type === Type.MOON ? body.pos.y : body.pos.y - 15 * cam.zoom);
            }
        }
    }
}

function drawStats() {
    let x = 5;
    let y = 4;
    let dy = 17;
    let actualSteps = getActualNumberOfSteps();
    let step = ((1 / engine.fps) * timeScale) / actualSteps;
    ctx.fillStyle = COLOR_BLACK
    ctx.fillText('FPS: ' + engine.fps.toFixed(0) + ' / ' + ((engine.fps / (1.0 / engine.frameTime)) * 100).toFixed(1) + ' %', x, y += dy);
    ctx.fillText('Time: ' + secToShortString(timePassed), x, y += dy);
    ctx.fillText('Time scale: ' + secToShortString(timeScale) + '/sec', x, y += dy);
    ctx.fillText('Step: ' + secToShortString(step) + ' | ' + actualSteps, x, y += dy);
    ctx.fillText('Zoom: ' + numberToString(cam.zoom), x, y += dy);
    if (!isSimulating) {
        ctx.fillText('PAUSE!', x, y += dy);
    }
    if (target) {
        y += dy;
        let velocity = target.vel.len;
        ctx.fillText('Target: ' + target.name, x, y += dy);
        ctx.fillText('  Type: ' + target.type.name, x, y += dy);
        ctx.fillText('  Velocity: ' + velocityToString(velocity), x, y += dy);
        ctx.fillText('  Mass: ' + numberToString(target.mass), x, y += dy);
    }
    if (isLaunching) {
        y += dy;
        let vel;
        if (launchRelBody) {
            let distanceToRelBody = launchRelBody.pos.dst(launchStart);
            ctx.fillText('  Orbit: ' + distanceToRelBody.toFixed(0) + ' m', x, y += dy);
            vel = getOrbitalVelocity(launchRelBody.mass, distanceToRelBody);
            ctx.fillText('  Orbital vel: ' + velocityToString(vel), x, y += dy);
            vel = getEscapeVelocity(launchRelBody.mass, distanceToRelBody);
            ctx.fillText('  Escape vel: ' + velocityToString(vel), x, y += dy);
            vel = getLaunchVelocity(launchStart, cam.toWorldPointV(engine.mouse)).len;
            ctx.fillText('  Relative vel: ' + velocityToString(vel), x, y += dy);
            let bodyToStart = launchStart.cpy().sub(launchRelBody.pos);
            let startToMouse = cam.toWorldPointV(engine.mouse).cpy().sub(launchStart);
            let angle = bodyToStart.angleRel(startToMouse) * radToDeg;
            ctx.fillText('  Angle: ' + (180 - Math.abs(angle)).toFixed(2) + '°', x, y += dy);
        }
        vel = getAbsoluteLaunchVelocity(launchStart, cam.toWorldPointV(engine.mouse)).len;
        ctx.fillText('  Launch vel: ' + velocityToString(vel), x, y += dy)
    }
}

/**
 * @param sec {number}
 * @return {string}
 */
function secToShortString(sec) {
    if (sec < 1e-3) {
        return (sec * 1e6).toFixed(0) + ' us'
    } if (sec < 1) {
        return (sec * 1e3).toFixed(0) + ' ms';
    } else if (sec < 3 * 60) {
        return sec.toFixed(0) + ' sec';
    } else if (sec < 3 * 60 * 60) {
        return (sec / 60).toFixed(0) + ' min';
    } else if (sec < 3 * 60 * 60 * 24) {
        return (sec / (60 * 60)).toFixed(1) + ' hrs';
    } else if (sec < 3 * 60 * 60 * 24 * 30.44) {
        return (sec / (60 * 60 * 24)).toFixed(1) + ' days';
    } else if (sec < 3 * 60 * 60 * 24 * 365) {
        return (sec / (60 * 60 * 24 * 30.44)).toFixed(1) + ' months';
    } else {
        return (sec / (60 * 60 * 24 * 365.24)).toFixed(1) + ' years';
    }
}

/**
 * @param n {number}
 * @return {string}
 */
function numberToString(n) {
    let absN = Math.abs(n);
    if (absN < 1e-10) {
        return '0';
    }
    if (absN > 1e7) {
        return n.toExponential(2);
    }
    if (absN > 4) {
        return n.toFixed(0);
    } else if (absN > 0.1) {
        return n.toFixed(1);
    }
    let dec = 2;
    let t = absN;
    while ((t *= 10) < 1) {
        dec++;
    }
    return n.toFixed(dec);
}

/**
 * @param vel {number}
 * @return {string}
 */
function velocityToString(vel) {
    if (vel < C / 4) {
        return vel.toFixed(0) + ' m/s';
    } else if (vel < 0.99 * C) {
        return ((vel / C) * 100).toFixed(2) + '% c';
    } else if (vel < C) {
        return ((vel / C) * 100).toFixed(6) + '% c';
    } else if (vel > C) {
        return 'faster than speed of light';
    } else {
        return 'speed of light';
    }
}

/**
 * @param mass {number}
 * @param distanceFromCenter {number}
 * @return {number}
 */
function getOrbitalVelocity(mass, distanceFromCenter) {
    return Math.sqrt((GRAVITATIONAL_CONSTANT * mass) / distanceFromCenter)
}

/**
 * @param mass {number}
 * @param radius {number}
 * @return {number}
 */
function getEscapeVelocity(mass, radius) {
    return Math.sqrt(2 * GRAVITATIONAL_CONSTANT * mass / radius);
}

/**
 * uses world coordinates
 * @param x {number}
 * @param y {number}
 * @return {?Body}
 */
function getBodyAt(x, y) {
    for (let i = bodies.length - 1; i >= 0; i--) {
        let b = bodies[i];
        if (b.pos.dstXY(x, y) < getBodyVisibleRadius(b)) {
            return b;
        }
    }
    return null;
}