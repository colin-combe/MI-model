//  MI-model
//	License: Apache v2.0
//  authors: Colin Combe, Josh Heimbach
//  MI.model.FeatureLink.js

"use strict";

var Link = require('./Link');

MI.model.FeatureLink.prototype = new Link();

function FeatureLink(id, fromFeature, toFeatures) {
    this.id = id;
    this.fromFeature = fromFeature;//one feature
    this.toFeatures = toFeatures;//array of features 
    
    this.participants = [];
    for (annotatedRegion in this.fromFeature.annotatedRegions) {
		this.participants.push(annotatedRegion.participant);
	}
    for (toFeature in this.toFeatures) {
		for (annotatedRegion in this.fromFeature.annotatedRegions) {
			this.participants.push(annotatedRegion.participant);
		}
	}
}

module.exports = MI.model.FeatureLink;
