var MouseEventCodes = {}
MouseEventCodes.MOUSE_UP = 0;//start state, also set when mouse up on svgElement
MouseEventCodes.PANNING = 1;//set by mouse down on svgElement - left button, no shift or controller
MouseEventCodes.DRAGGING = 2;//set by mouse down on Protein or Link
MouseEventCodes.ROTATING = 3;//set by mouse down on Rotator, drag?
MouseEventCodes.SELECTING = 4;//set by mouse down on svgElement- right button or left button shift or controller, drag

module.exports = MouseEventCodes;

