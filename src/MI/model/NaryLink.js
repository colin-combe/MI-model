//  MI-model
//	License: Apache v2.0
//  authors: Colin Combe, Josh Heimbach
//  MI.model.NaryLink.js

"use strict";

var Link = require('./Link');

MI = MI || {};
MI.model = MI.model || {};

MI.model.NaryLink.prototype = new Link ();

MI.model.NaryLink = function (id) {

    this.id = id;
    this.interactions = new Map();
    this.participants = [];
    this.featureLinks = d3.map();

}

module.exports = Mi.module.NaryLink;
