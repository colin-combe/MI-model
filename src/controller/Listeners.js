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
var colorbrewer = require('colorbrewer');
var xiNET_Storage = require('./xiNET_Storage');
var Annotation = require('../model/molecule/Annotation');
var Molecule = require('../model/molecule/Molecule');
var Polymer = require('../model/molecule/Polymer');
var Protein = require('../model/molecule/Protein');
var BioactiveEntity = require('../model/molecule/BioactiveEntity');
var Gene = require('../model/molecule/Gene');
var DNA = require('../model/molecule/DNA');
var RNA = require('../model/molecule/RNA');
var Complex = require('../model/molecule/Complex');
var MoleculeSet = require('../model/molecule/MoleculeSet');
var Link = require('../model/link/Link');
var NaryLink = require('../model/link/NaryLink');
var FeatureLink = require('../model/link/FeatureLink');
var Feature = require('../model/feature/Feature');
var BinaryLink = require('../model/link/BinaryLink');
var UnaryLink = require('../model/link/UnaryLink');
var Expand = require ('./Expand');
var Config = require('./Config');
//for save file.
var FileSaver = require('file-saver.js');

var MouseEventCodes = {}
MouseEventCodes.MOUSE_UP = 0;//start state, also set when mouse up on svgElement
MouseEventCodes.PANNING = 1;//set by mouse down on svgElement - left button, no shift or controller
MouseEventCodes.DRAGGING = 2;//set by mouse down on Protein or Link
MouseEventCodes.ROTATING = 3;//set by mouse down on Rotator, drag?
MouseEventCodes.SELECTING = 4;//set by mouse down on svgElement- right button or left button shift or controller, drag

xiNET.Listeners = function(controller) {
	this.controller = controller;
    
    //add listeners
    var self = this;
    this.controller.svgElement.onmousedown = function(evt) {self.mouseDown(evt);};
    this.controller.svgElement.onmousemove = function(evt) {self.mouseMove(evt);};
    this.controller.svgElement.onmouseup = function(evt) {self.mouseUp(evt);};
    this.controller.svgElement.onmouseout = function(evt) {self.hideTooltip(evt);};
    this.controller.lastMouseUp = new Date().getTime();
    this.controller.svgElement.ontouchstart = function(evt) {self.touchStart(evt);};
    this.controller.svgElement.ontouchmove = function(evt) {self.touchMove(evt);};
    this.controller.svgElement.ontouchend = function(evt) {self.touchEnd(evt);};

 
};


/**
 * Handle touchstart event.
 */
xiNET.Controller.prototype.touchStart = function(evt) {
    //prevent default, but allow propogation
    evt.preventDefault();
    //~ //evt.returnValue = false;
    //~ this.preventDefaultsAndStopPropagation(evt);

    //stop force layout
    if (typeof this.force !== 'undefined' && this.force != null) {
        this.force.stop();
    }

    var p = this.getTouchEventPoint(evt);// seems to be correct, see below
	this.dragStart = this.mouseToSVG(p.x, p.y);
    this.state = MouseEventCodes.PANNING;
    //~ this.panned = false;
};

// dragging/rotation/panning/selecting
xiNET.Controller.prototype.touchMove = function(evt) {
    if (this.sequenceInitComplete) { // just being cautious
        var p = this.getTouchEventPoint(evt);// seems to be correct, see below
        var c = this.mouseToSVG(p.x, p.y);

        if (this.dragElement != null) { //dragging or rotating
            this.hideTooltip();
            var dx = this.dragStart.x - c.x;
            var dy = this.dragStart.y - c.y;

            if (this.state ===  MouseEventCodes.DRAGGING) {
                // we are currently dragging things around
                var ox, oy, nx, ny;
                if (typeof this.dragElement.x === 'undefined') { // if not an Molecule
                    var nodes = this.dragElement.interactors;
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
                    ox = this.dragElement.x;
                    oy = this.dragElement.y;
                    nx = ox - dx;
                    ny = oy - dy;
                    this.dragElement.setPosition(nx, ny);
                    this.dragElement.setAllLinkCoordinates();
                }
                this.dragStart = c;
            }

            else if (this.state === MouseEventCodes.ROTATING) {
                // Distance from mouse x and center of stick.
                var _dx = c.x - this.dragElement.x
                // Distance from mouse y and center of stick.
                var _dy = c.y - this.dragElement.y;
                //see http://en.wikipedia.org/wiki/Atan2#Motivation
                var centreToMouseAngleRads = Math.atan2(_dy, _dx);
                if (this.whichRotator === 0) {
                    centreToMouseAngleRads = centreToMouseAngleRads + Math.PI;
                }
                var centreToMouseAngleDegrees = centreToMouseAngleRads * (360 / (2 * Math.PI));
                this.dragElement.setRotation(centreToMouseAngleDegrees);
                this.dragElement.setAllLinkCoordinates();
            }
            else { //not dragging or rotating yet, maybe we should start
                // don't start dragging just on a click - we need to move the mouse a bit first
                if (Math.sqrt(dx * dx + dy * dy) > (5 * this.z)) {
                    this.state = MouseEventCodes.DRAGGING;

                }
            }
        }

//    else if (this.state ===  MouseEventCodes.SELECTING) {
//        this.updateMarquee(this.marquee, c);
//    }
        else
        {

        // if (this.state === MouseEventCodes.PANNING) {
            //~ xiNET.setCTM(this.container, this.container.getCTM()
				//~ .translate(c.x - this.dragStart.x, c.y - this.dragStart.y));
        // }
        // else {
           // // this.showTooltip(p);
        // }
		}
    }
    return false;
};

// this ends all dragging and rotating
xiNET.Controller.prototype.touchEnd = function(evt) {
	this.preventDefaultsAndStopPropagation(evt);
	if (this.dragElement != null) {
		if (!(this.state === MouseEventCodes.DRAGGING || this.state === MouseEventCodes.ROTATING)) { //not dragging or rotating
           		if (typeof this.dragElement.x === 'undefined') { //if not protein
					//this.dragElement.showID();
				} else {
					if (this.dragElement.form === 0) {
						this.dragElement.setForm(1);
					} else {
						this.dragElement.setForm(0);
					}
				}
			//~ this.checkLinks();
		}
		else if (this.state === MouseEventCodes.ROTATING) {
			//round protein rotation to nearest 5 degrees (looks neater)
			this.dragElement.setRotation(Math.round(this.dragElement.rotation / 5) * 5);
		}
		else {
		} //end of protein drag; do nothing
	}
	//~ else if (/*this.state !== xiNET.Controller.PANNING &&*/ evt.ctrlKey === false) {
		//~ this.clearSelection();
	//~ }
//~
	//~ if (this.state === xiNET.Controller.SELECTING) {
		//~ clearInterval(this.marcher);
		//~ this.svgElement.removeChild(this.marquee);
	//~ }
	this.dragElement = null;
	this.whichRotator = -1;
	this.state = MouseEventCodes.MOUSE_UP;
    return false;
};


module.exports = xiNET.Controller;
