//    xiNET Interaction Viewer
//    Copyright 2013 Rappsilber Laboratory
//
//    This product includes software developed at
//    the Rappsilber Laboratory (http://www.rappsilberlab.org/).
//
//    author: Colin Combe

"use strict";

var AnnotatedRegion = require('./AnnotatedRegion');
var Config = require('../../controller/Config');

//constructor for annotations
function Feature(controller, json) {
	this.controller = controller;
	this.json = json;
	
	var featureName = "";
	if (typeof json.name !== 'undefined') {
		featureName += json.name + ', ';
	}
	if (typeof json.type !== 'undefined') {
		featureName += json.type.name;
	}
	if (typeof json.detmethod !== 'undefined') {
		featureName += ', ' + feature.detmethod.name;
	}
	this.sequenceData = [];
	// the id info we need is inside sequenceData att
	if (json.sequenceData) {
		var seqData = json.sequenceData;
		var seqDataCount = seqData.length;
		for (var sdi = 0; sdi < seqDataCount; sdi++) {
			var seqDatum = seqData[sdi];
			var mID = seqDatum.interactorRef;
			if (this.controller.expand)	{
				mID = mID	+ "(" + seqDatum.participantRef + ")";
			}
			var molecule = this.controller.molecules.get(mID);
			console.log(">-"+molecule.id + "\t" + seqDatum.pos);
			var seqData = new AnnotatedRegion(molecule, seqDatum.pos);
			this.sequenceData.push(seqData);
		}
	}
}

Feature.prototype.show = function(){
	var seqDataCount = this.sequenceData.length;
	for (var sd = 0; sd < seqDataCount; sd++){
		var seqData = this.sequenceData[sd];
		var molecule = seqData.molecule;
		if (isNaN(seqData.start) === false && isNaN(seqData.end) === false){
			var anno = {};
			anno.start = seqData.start - 0;
			anno.end = seqData.end - 0;
			anno.pieSlice = document.createElementNS(Config.svgns, "path");
			if (molecule.form === 0) {
				anno.pieSlice.setAttribute("d", molecule.getAnnotationPieSliceArcPath(anno));
			} else {
				anno.pieSlice.setAttribute("d", molecule.getAnnotationRectPath(anno));
			}
			anno.pieSlice.setAttribute("stroke-width", 1);
			anno.pieSlice.setAttribute("fill-opacity", "0.6");
			var text = anno.name + " [" + anno.start + " - " + anno.end + "]";
			anno.pieSlice.name = text;
			var xlv = this.controller;
			//~ var self = this;
			anno.pieSlice.onmouseover = function(evt) {
				var el = (evt.target.correspondingUseElement) ? evt.target.correspondingUseElement : evt.target;
				xlv.preventDefaultsAndStopPropagation(evt);
				xlv.setTooltip(el.name, el.getAttribute('fill'));
				molecule.showHighlight(true);
			};
			if (molecule.annotationsSvgGroup) { //hack
				 molecule.annotationsSvgGroup.appendChild(anno.pieSlice);
			}
			molecule.features.push(anno);
			console.log(">>"+molecule.id + "\t" + seqData);
		}
    } 
}

module.exports = Feature;
