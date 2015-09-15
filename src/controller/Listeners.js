//    xiNET Interaction Viewer
//    Copyright 2013 Rappsilber Laboratory, University of Edinburgh
//
//    This product includes software developed at
//    the Rappsilber Laboratory (http://www.rappsilberlab.org/).
//
//	  author: Colin Combe
//
//    Controller.js

"use strict";

var xiNET = {}; //crosslinkviewer's javascript namespace
var d3 = require('d3');
//~ var colorbrewer = require('colorbrewer');
//~ var xiNET_Storage = require('./xiNET_Storage');
//~ var Annotation = require('../model/molecule/Annotation');
//~ var Molecule = require('../model/molecule/Molecule');
//~ var Polymer = require('../model/molecule/Polymer');
//~ var Protein = require('../model/molecule/Protein');
//~ var BioactiveEntity = require('../model/molecule/BioactiveEntity');
//~ var Gene = require('../model/molecule/Gene');
//~ var DNA = require('../model/molecule/DNA');
//~ var RNA = require('../model/molecule/RNA');
//~ var Complex = require('../model/molecule/Complex');
//~ var MoleculeSet = require('../model/molecule/MoleculeSet');
//~ var Link = require('../model/link/Link');
//~ var NaryLink = require('../model/link/NaryLink');
//~ var FeatureLink = require('../model/link/FeatureLink');
//~ var Feature = require('../model/feature/Feature');
//~ var BinaryLink = require('../model/link/BinaryLink');
//~ var UnaryLink = require('../model/link/UnaryLink');
//~ var Expand = require ('./Expand');
var Config = require('./Config');
var MouseEventCodes = require('./MouseEventCodes');
//for save file.
var FileSaver = require('file-saver.js');

xiNET.Listeners = function(controller) {
	this.controller = controller;
    //add listeners
    var self = this;
    this.controller.svgElement.onmousedown = function(evt) {self.mouseDown(evt);};
    this.controller.svgElement.onmousemove = function(evt) {self.mouseMove(evt);};
    this.controller.svgElement.onmouseup = function(evt) {self.mouseUp(evt);};
    this.controller.svgElement.onmouseout = function(evt) {self.controller.hideTooltip(evt);};
    this.controller.lastMouseUp = new Date().getTime();
    this.controller.svgElement.ontouchstart = function(evt) {self.touchStart(evt);};
    this.controller.svgElement.ontouchmove = function(evt) {self.touchMove(evt);};
    this.controller.svgElement.ontouchend = function(evt) {self.touchEnd(evt);};
};
//listeners also attached to mouse evnts by Molecule (and Rotator) and Link, those consume their events
//mouse down on svgElement must be allowed to propogate (to fire event on Prots/Links)

/**
 * Handle mousedown event.
 */
xiNET.Listeners.prototype.mouseDown = function(evt) {
    //prevent default, but allow propogation
    evt.preventDefault();
    //evt.returnValue = false;
    //stop force layout
    if (typeof this.controller.force !== 'undefined' && this.controller.force != null) {
        this.controller.force.stop();
    }

    var p = this.controller.getEventPoint(evt);// seems to be correct, see below
   this.controller.dragStart = this.controller.mouseToSVG(p.x, p.y);

    var rightClick; //which button has just been raised
    if (evt.which)
        rightClick = (evt.which === 3);
    else if (evt.button)
        rightClick = (evt.button === 2);

    if (evt.ctrlKey === true || evt.shiftKey === true || rightClick) {
    } else {
    this.controller.state = MouseEventCodes.PANNING;
    this.panned = false;
    }
    return false;
};

// dragging/rotation/panning/selecting
xiNET.Listeners.prototype.mouseMove = function(evt) {
	var p = this.controller.getEventPoint(evt);// seems to be correct, see below
	var c = this.controller.mouseToSVG(p.x, p.y);

	if (this.controller.dragElement != null) { //dragging or rotating
		this.controller.hideTooltip();
		var dx = this.controller.dragStart.x - c.x;
		var dy = this.controller.dragStart.y - c.y;

		if (this.controller.state === MouseEventCodes.DRAGGING) {
			// we are currently dragging things around
			var ox, oy, nx, ny;
			if (typeof this.controller.dragElement.x === 'undefined') { // if link
				var nodes = this.controller.dragElement.interactors;
				var nodeCount = nodes.length;
				for (var i = 0; i < nodeCount; i++) {
					var protein = nodes[i];
					ox = protein.x;
					oy = protein.y;
					nx = ox - dx;
					ny = oy - dy;
					protein.setPosition(nx, ny);
					protein.setAllLinkCoordinates();
				}
				for (i = 0; i < nodeCount; i++) {
					nodes[i].setAllLinkCoordinates();
				}
			} else {
				//its a protein - drag it TODO: DRAG SELECTED
				ox = this.controller.dragElement.x;
				oy = this.controller.dragElement.y;
				nx = ox - dx;
				ny = oy - dy;
				this.controller.dragElement.setPosition(nx, ny);
				this.controller.dragElement.setAllLinkCoordinates();
			}
			this.controller.dragStart = c;
		}

		else if (this.controller.state === MouseEventCodes.ROTATING) {
			// Distance from mouse x and center of stick.
			var _dx = c.x - this.controller.dragElement.x
			// Distance from mouse y and center of stick.
			var _dy = c.y - this.controller.dragElement.y;
			//see http://en.wikipedia.org/wiki/Atan2#Motivation
			var centreToMouseAngleRads = Math.atan2(_dy, _dx);
			if (this.whichRotator === 0) {
				centreToMouseAngleRads = centreToMouseAngleRads + Math.PI;
			}
			var centreToMouseAngleDegrees = centreToMouseAngleRads * (360 / (2 * Math.PI));
			this.controller.dragElement.setRotation(centreToMouseAngleDegrees);
			this.controller.dragElement.setAllLinkCoordinates();
		}
		else { //not dragging or rotating yet, maybe we should start
			// don't start dragging just on a click - we need to move the mouse a bit first
			if (Math.sqrt(dx * dx + dy * dy) > (5 * this.controller.z)) {
				this.controller.state = MouseEventCodes.DRAGGING;

			}
		}
	}

//    else if (this.controller.state === MouseEventCodes.SELECTING) {
//        this.updateMarquee(this.marquee, c);
//    }
	else if (this.controller.state === MouseEventCodes.PANNING) {
//		setCTM(this.container, this.container.getCTM().translate(c.x - this.controller.dragStart.x, c.y - this.controller.dragStart.y));
	}
	else {
		this.controller.showTooltip(p);
	}
    return false;
};


// this ends all dragging and rotating
xiNET.Listeners.prototype.mouseUp = function(evt) {
    var time = new Date().getTime();
    //console.log("Mouse up: " + evt.srcElement + " " + (time - this.lastMouseUp));
    this.controller.preventDefaultsAndStopPropagation(evt);
    //eliminate some spurious mouse up events
    if ((time - this.lastMouseUp) > 150){

        var rightclick, middleclick; //which button has just been raised
        if (evt.which)
            rightclick = (evt.which === 3);
        else if (evt.button)
            rightclick = (evt.button === 2);
        if (evt.which)
            middleclick = (evt.which === 2);
        else if (evt.button)
            middleclick = (evt.button === 1);

        var p = this.controller.getEventPoint(evt);// seems to be correct, see below
        var c = this.controller.mouseToSVG(p.x, p.y);

        if (this.controller.dragElement != null) {
            if (!(this.controller.state === MouseEventCodes.DRAGGING || this.controller.state === MouseEventCodes.ROTATING)) { //not dragging or rotating
                if (rightclick) {
					// RIGHT click
                }
                else if (middleclick) {
                    //can't be used? problem with IE (scroll thingy)
                }
                else { //left click; show matches for link, toggle form for protein, switch stick scale
                    if (typeof this.controller.dragElement.x === 'undefined') { //if not protein
                        //~ this.controller.dragElement.showData();
                    } else if (evt.shiftKey) { //if shift key
                        this.controller.dragElement.switchStickScale(c);
                    } else {
						if (this.controller.sequenceInitComplete === true){
							//~ if (!this.labelClickStart) {
								if (this.controller.dragElement.form === 0) {
									this.controller.dragElement.setForm(1, c);
								} else {
									this.controller.dragElement.setForm(0, c);
								}
							//~ }
							//~ else {
								//~ this.controller.dragElement.showData();
							//~ }
						}
                    }
                }
                //~ this.checkLinks();
            }
            else if (this.controller.state === MouseEventCodes.ROTATING) {
                //round protein rotation to nearest 5 degrees (looks neater)
                this.controller.dragElement.setRotation(Math.round(this.controller.dragElement.rotation / 5) * 5);
            }
            else {
            } //end of protein drag; do nothing
        }
        else if (rightclick) { //right click on background; show all hidden links
            //~ var links = this.proteinLinks.values();
            //~ var linkCount = links.length;
            //~ for (var l = 0; l < linkCount; l++) {
                //~ var link = links[l];
                //~ link.hidden = false;
            //~ }
            this.controller.checkLinks();
        } else if (/*this.controller.state !== MouseEventCodes.PANNING &&*/ evt.controllerKey === false) {
            this.controller.clearSelection();
        }

        if (this.controller.state === MouseEventCodes.SELECTING) {
            clearInterval(this.marcher);
            this.svgElement.removeChild(this.marquee);
        }
	}

	this.controller.dragElement = null;
	this.whichRotator = -1;
	this.controller.state = MouseEventCodes.MOUSE_UP;
       
    this.labelClickStart = false;
     
    this.lastMouseUp = time;
    return false;
};

/**
 * Handle touchstart event.
 */
xiNET.Listeners.prototype.touchStart = function(evt) {
    //prevent default, but allow propogation
    evt.preventDefault();
    //~ //evt.returnValue = false;
    //~ this.preventDefaultsAndStopPropagation(evt);

    //stop force layout
    if (typeof this.force !== 'undefined' && this.force != null) {
        this.force.stop();
    }

    var p = this.controller.getTouchEventPoint(evt);// seems to be correct, see below
	this.controller.dragStart = this.controller.mouseToSVG(p.x, p.y);
    this.controller.state = MouseEventCodes.PANNING;
    //~ this.panned = false;
};

// dragging/rotation/panning/selecting
xiNET.Listeners.prototype.touchMove = function(evt) {
    if (this.sequenceInitComplete) { // just being cautious
        var p = this.controller.getTouchEventPoint(evt);// seems to be correct, see below
        var c = this.controller.mouseToSVG(p.x, p.y);

        if (this.controller.dragElement != null) { //dragging or rotating
            this.hideTooltip();
            var dx = this.controller.dragStart.x - c.x;
            var dy = this.controller.dragStart.y - c.y;

            if (this.controller.state ===  MouseEventCodes.DRAGGING) {
                // we are currently dragging things around
                var ox, oy, nx, ny;
                if (typeof this.controller.dragElement.x === 'undefined') { // if not an Molecule
                    var nodes = this.controller.dragElement.interactors;
                    var nodeCount = nodes.length;
                    for (var i = 0; i < nodeCount; i++) {
                        var protein = nodes[i];
                        ox = protein.x;
                        oy = protein.y;
                        nx = ox - dx;
                        ny = oy - dy;
                        protein.setPosition(nx, ny);
                        protein.setAllLinkCoordinates();
                    }
                    for (i = 0; i < nodeCount; i++) {
                        nodes[i].setAllLinkCoordinates();
                    }
                } else {
                    //its a protein - drag it TODO: DRAG SELECTED
                    ox = this.controller.dragElement.x;
                    oy = this.controller.dragElement.y;
                    nx = ox - dx;
                    ny = oy - dy;
                    this.controller.dragElement.setPosition(nx, ny);
                    this.controller.dragElement.setAllLinkCoordinates();
                }
                this.controller.dragStart = c;
            }

            else if (this.controller.state === MouseEventCodes.ROTATING) {
                // Distance from mouse x and center of stick.
                var _dx = c.x - this.controller.dragElement.x
                // Distance from mouse y and center of stick.
                var _dy = c.y - this.controller.dragElement.y;
                //see http://en.wikipedia.org/wiki/Atan2#Motivation
                var centreToMouseAngleRads = Math.atan2(_dy, _dx);
                if (this.whichRotator === 0) {
                    centreToMouseAngleRads = centreToMouseAngleRads + Math.PI;
                }
                var centreToMouseAngleDegrees = centreToMouseAngleRads * (360 / (2 * Math.PI));
                this.controller.dragElement.setRotation(centreToMouseAngleDegrees);
                this.controller.dragElement.setAllLinkCoordinates();
            }
            else { //not dragging or rotating yet, maybe we should start
                // don't start dragging just on a click - we need to move the mouse a bit first
                if (Math.sqrt(dx * dx + dy * dy) > (5 * this.controller.z)) { 
                    this.controller.state = MouseEventCodes.DRAGGING;

                }
            }
        }

//    else if (this.controller.state ===  MouseEventCodes.SELECTING) {
//        this.updateMarquee(this.marquee, c);
//    }
        else
        {

        // if (this.controller.state === MouseEventCodes.PANNING) {
            //~ xiNET.setCTM(this.container, this.container.getCTM()
				//~ .translate(c.x - this.controller.dragStart.x, c.y - this.controller.dragStart.y));
        // }
        // else {
           // // this.showTooltip(p);
        // }
		}
    }
    return false;
};

// this ends all dragging and rotating
xiNET.Listeners.prototype.touchEnd = function(evt) {
	this.controller.preventDefaultsAndStopPropagation(evt);
	if (this.controller.dragElement != null) {
		if (!(this.controller.state === MouseEventCodes.DRAGGING || this.controller.state === MouseEventCodes.ROTATING)) { //not dragging or rotating
           		if (typeof this.controller.dragElement.x === 'undefined') { //if not protein
					//this.controller.dragElement.showID();
				} else {
					if (this.controller.dragElement.form === 0) {
						this.controller.dragElement.setForm(1);
					} else {
						this.controller.dragElement.setForm(0);
					}
				}
			//~ this.checkLinks();
		}
		else if (this.controller.state === MouseEventCodes.ROTATING) {
			//round protein rotation to nearest 5 degrees (looks neater)
			this.controller.dragElement.setRotation(Math.round(this.controller.dragElement.rotation / 5) * 5);
		}
		else {
		} //end of protein drag; do nothing
	}
	//~ else if (/*this.controller.state !== xiNET.Listeners.PANNING &&*/ evt.ctrlKey === false) {
		//~ this.clearSelection();
	//~ }
//~
	//~ if (this.controller.state === xiNET.Listeners.SELECTING) {
		//~ clearInterval(this.marcher);
		//~ this.svgElement.removeChild(this.marquee);
	//~ }
	this.controller.dragElement = null;
	this.whichRotator = -1;
	this.controller.state = MouseEventCodes.MOUSE_UP;
    return false;
};

module.exports = xiNET.Listeners;
