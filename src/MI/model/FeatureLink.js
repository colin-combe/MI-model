//  MI-model
//	License: Apache v2.0
//  authors: Colin Combe, Josh Heimbach
//  MI.model.FeatureLink.js

var Link = require('./Link');

var MI = MI || {};
MI.model = MI.model || {};

MI.model.FeatureLink = function (id, fromFeature, toFeatures) {
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

MI.model.FeatureLink.prototype = new Link();

module.exports = MI.model.FeatureLink;
