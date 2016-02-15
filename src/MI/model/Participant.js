//	MI-model
//	License: Apache v2.0
//  authors: Colin Combe
//  MI.model.Participant.js

"use strict";

MI.model.Participant = function (id, interactor) {
	
	this.id = id;
	this.interactor = interactor;
	this.naryLinks = new Map();
	this.featureLinks = new Map();

}

module.exports = MI.model.Participant;
