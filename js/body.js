
/**
 * Type of a body
 * @param id {number}
 * @param name {String}
 * @param color {string}
 * @param minRadius {number} minimal width to draw on screen
 * @constructor
 */
let Type = function(id, name, color, minRadius) {
    this.id = id;
    this.name = name;
    this.color = color || 'rgb(36,36,36)'
    this.minRadius = minRadius;
}

/**
 * Photons are only affected by gravity
 * @type {Type}
 */
Type.PHOTON = new Type(1, 'Rock', 'rgba(179,102,0,0.65)', 2);

/**
 * Rocks don't affect each other, but are affected by gravity of objects of other types.
 * They should be really low mass. Made just for visual representation.
 * @type {Type}
 */
Type.ROCK = new Type(1, 'Rock', 'rgb(61,56,56)', 2);
/**
 * Bodies that orbit around Planets or other Moons
 * @type {Type}
 */
Type.MOON = new Type(2, 'Moon', 'rgb(114,80,80)', 3);
/**
 * Bodies that orbit Stars
 * @type {Type}
 */
Type.PLANET = new Type(3, 'Planet', 'rgb(84,153,15)', 4);
/**
 * Stars that orbit around other stars or Black holes
 * @type {Type}
 */
Type.STAR = new Type(4, 'Star', 'rgb(217,217,16)', 5);
/**
 * Black hole
 * @type {Type}
 */
Type.BLACK_HOLE = new Type(5, 'Black hole', 'rgba(0, 0, 0)', 6);
/**
 * Array of possible Types of Bodies
 * @type {Type[]}
 */
Type.types = [Type.ROCK, Type.MOON, Type.PLANET, Type.STAR, Type.BLACK_HOLE];


/** Event horizon **/
function _getBlackHoleWidth(mass) {
    return (2 * GRAVITATIONAL_CONSTANT * mass) / C2;
}

/**
 *
 * @param name {?string}
 * @param type {Type}
 * @param mass {number}
 * @param radius {number} doesn't have to be specified for black hole
 * @param pos {Vec} position
 * @param vel {Vec} velocity
 * @param track {boolean} if true, has tracking enabled, false - disabled
 * @param track {?[Vec]} if value exists, tracking is enabled
 * @constructor
 */
let Body = function(name, type, mass, radius, pos, vel, track) {
    this.name = name;
    this._type = type;
    this._mass = mass;
    this._radius = type === Type.BLACK_HOLE ? _getBlackHoleWidth(mass) / 2 : radius;
    this.pos = pos.cpy();
    this.vel = vel.cpy();
    this.ax = 0;
    this.ay = 0;
    this.track = typeof track === 'boolean' ? track ? [] : null : Array.isArray(track) ? track : null;
}

Body.prototype = {
    get type() {
        return this._type;
    },
    set type(t) {
        this._type = t;
        if (t === Type.BLACK_HOLE) { //Physical radius of black hole is 1/2 of it's event horizon
            this._radius = _getBlackHoleWidth(this.mass) / 2;
        }
    },
    get mass() {
        return this._mass;
    },
    set mass(m) {
        this._mass = m;
        if (this.type === Type.BLACK_HOLE) { //Physical radius of black hole is 1/2 of it's event horizon
            this._radius = _getBlackHoleWidth(m) / 2;
        }
    },
    /**
     * Physical radius of body
     * @return {number}
     */
    get radius() {
        return this._radius;
    },
    set radius(r) {
        if (this.type !== Type.BLACK_HOLE) {
            this._radius = r;
        }
    },
    /**
     * Impulse vector of a body, which is velocity * mass
     * @return {Vec}
     */
    get impulse() {
        return this.vel.cpy().mul(this._mass);
    },
    /**
     * Visible radius of an object (different for black holes)
     * @return {number}
     */
    get renderRadius() {
        return this.type === Type.BLACK_HOLE ? this._radius * 2 : this._radius;
    },
    /**
     * Applies impulse to a body, changing it's velocity
     * @param impulse {Vec}
     */
    applyImpulse(impulse) {
        this.vel.addXY(impulse.x / this._mass, impulse.y / this._mass);
    }
};

/**
 * @param pos {Vec}
 * @param direction {number} angle in radians
 * @param direction {Vec} direction
 * @param frequency
 * @constructor
 */
let Photon = function (pos, direction, frequency) {
    this.type = Type.PHOTON;
    this.pos = pos.cpy();
    this.angle = direction instanceof Vec ? direction.angle : (direction || 0) % (Math.PI * 2);
    this.frequency = frequency || 1;
    this.track = [];
}

Photon.prototype = {
    /**
     * Energy of a photon
     * @return {number}
     */
    get energy() {
        return PLANKS_CONSTANT * this.frequency;
    },
    /**
     *
     * @return {number}
     */
    get mass() {
        return this.energy / C2;
    },
}

/**
 * Stores and manages bodies, keeps them sorted for rendering and physics
 * @constructor
 */
class BodyBag extends Array {

    constructor() {
        super();
        /**
         * Bodies that do not apply gravitation on others, but do get pulled by gravitational bodies
         * @return {[Body]}
         */
        this.nonGravitationalBodies = [];
        /**
         * Bodies that DO apply gravitation on other bodies
         * @return {[Body]}
         */
        this.gravitationalBodies = [];
        /**
         * Photons
         * @return {[Photon]}
         */
        this.photons = [];
    }

    push(...items) {
        items = items instanceof Array ? items : [items];

        for (const item of items) {
            if (item instanceof Photon) {
                this.photons.push(item);
            } else {
                super.push(item)
                if (item.type === Type.ROCK) {
                    this.nonGravitationalBodies.push(item);
                } else {
                    this.gravitationalBodies.push(item);
                }
            }
        }
        this.sortBodies();
    }

    /**
     * @param item {Body}
     * @param item {Photon}
     * @return {boolean}
     */
    remove(item) {
        if (item instanceof Photon) {
            return this.photons.splice(this.photons.indexOf(item), 1).length > 0;
        } else {
            let pos = this.indexOf(item);
            if (pos >= 0) {
                this.splice(pos, 1);
                if (item.type === Type.ROCK) {
                    this.nonGravitationalBodies.splice(this.nonGravitationalBodies.indexOf(item), 1);
                } else {
                    this.gravitationalBodies.splice(this.gravitationalBodies.indexOf(item), 1);
                }
                return true;
            }
            return false;
        }
    }

    /**
     * Removes all bodies
     */
    clear() {
        this.length = 0;
        this.nonGravitationalBodies = [];
        this.gravitationalBodies = [];
        this.photons = [];
    }

    sortBodies() {
        this.sort((a, b) => b.type.id - a.type.id);
    }
}

/**
 * @param bodies {Body}
 * @param bodies {[Body]}
 */

/**
 * Removes body from the bag
 * @param body {Body}
 * @return {boolean} whether or not was removed
 */