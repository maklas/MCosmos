const C = 299_792_458;
const C2 = C * C;
const GRAVITATIONAL_CONSTANT = 6.67430e-11;
const PLANKS_CONSTANT = 6.62607004e-34;
/** Astronomical Unit **/
const AU = 1.495978707e11

function random(start, end) {
    return Math.random() * (end - start) + start;
}

function getCircleArea(r) {
    return Math.PI * r * r;
}