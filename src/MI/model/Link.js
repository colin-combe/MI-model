//  MI-model
//	License: Apache v2.0
//  authors: Colin Combe, Josh Heimbach
//  MI.model.Link.js

"use strict";

MI = MI || {};
MI.model = MI.model || {};

MI.model.Link = function (){};

MI.model.Link.prototype.addInteraction = function(interaction) {
    if (this.interactions.has(interaction.id) === false) {
        this.interactions.set(interaction.id, interaction);
        return true;
	} else {
		return false;
	}
};

module.exports = MI.model.Link;
