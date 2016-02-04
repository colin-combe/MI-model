//      MI-model
//      Copyright 2015 Rappsilber Laboratory, Edinburgh University
//
//      authors: Colin Combe
//
//      SearchResultsModel.js

(function(win) {
	"use strict"; // todo: we got some issues with 'use strict' and how we access the global namespace
	
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
	var NaryLink = require('../model/link/NaryLink');
	var FeatureLink = require('../model/link/FeatureLink');
	var Feature = require('../model/feature/Feature');
	var Feature = require('./feature/Feature');
	var Expand = require ('./Expand');
	var Config = require('./Config');

	win.MI = win.MI || {};
	win.MI.model = win.MI.model || {};

	win.MI.model.MolecularInteractionModel = Backbone.Model.extend ({
		defaults : {
			interactors: new Map (), //map
		},

		initialize: function (options) {

			var defaultOptions = {};

			this.options = _.extend(defaultOptions, options);

			var self = this;
			var interactorMap = this.get("interactors");
			var interactorCount = interactorMap.size;
			

		},

		readMiJson : function (miJson) {
			
			
		}

	});

} (this));
