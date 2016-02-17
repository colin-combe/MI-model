//  MI-model
//	License: Apache v2.0
//  authors: Colin Combe, Josh Heimbach
//  MI.model.NaryLink.js

var Link = require('./Link');

var MI = MI || {};
MI.model = MI.model || {};

MI.model.NaryLink = function (id) {

	this.id = id;
	this.interactions = new Map();
	this.participants = [];
	this.featureLinks = d3.map();

}

MI.model.NaryLink.prototype = new Link ();

module.exports = MI.model.NaryLink;
