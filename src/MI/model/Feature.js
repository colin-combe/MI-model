//  MI-model
//	License: Apache v2.0
//  authors: Colin Combe, Josh Heimbach
//  MI.model.Feature.js

"use strict";

var AnnotatedRegion = require('./AnnotatedRegion');

MI.model.Feature = function (json) {
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
	this.annotatedRegions = [];
	// the id info we need is inside sequenceData att
	if (json.sequenceData) {
		var seqData = json.sequenceData;
		var seqDataCount = seqData.length;
		for (var sdi = 0; sdi < seqDataCount; sdi++) {
			var seqDatum = seqData[sdi];
			var mID = seqDatum.interactorRef;
			//~ if (this.controller.expand)	{
				//~ mID = mID	+ "(" + seqDatum.participantRef + ")";
			//~ }
			var polymer = null;// TO BE FIXED  this.controller.molecules.get(mID);
			//~ console.log(">-"+polymer.id + "\t" + seqDatum.pos);
			
			var annotatedRegion = new AnnotatedRegion(featureName, polymer, seqDatum.pos);
			
			this.annotatedRegions.push(annotatedRegion);
		}
	}
}

module.exports = MI.model.Feature;
