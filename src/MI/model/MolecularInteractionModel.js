//      MI-model
//      Copyright 2015 Rappsilber Laboratory, Edinburgh University
//
//      authors: Colin Combe, Josh Heimbach
//
//      MolecularInteractionData.js

(function(win) {
	"use strict";
	
	var Interactor = require('./interactor/interactor');
	var Polymer = require('./interactor/Polymer');
	var Protein = require('./interactor/Protein');
	var BioactiveEntity = require('./interactor/BioactiveEntity');
	var Gene = require('./interactor/Gene');
	var DNA = require('./interactor/DNA');
	var RNA = require('./interactor/RNA');
	var Complex = require('./interactor/Complex');
	var InteractorSet = require('./interactor/InteractorSet');
	var NaryLink = require('./link/NaryLink');
	var FeatureLink = require('../link/FeatureLink');
	var Feature = require('./feature/Feature');
	var Annotation = require('./feature/AnnotatedRegion');
	
	win.MI = win.MI || {};
	win.MI.model = win.MI.model || {};

	win.MI.model.MolecularInteractionModel = Backbone.Model.extend ({
		defaults : {
			interactors: new Map (),
			participants: new Map(),
			features = new Map(),	
			naryLinks = new Map(),
			featureLinks = new Map()
		},

		initialize: function (options) {

			var defaultOptions = {
				//default is to expand stoichiometry
				expandStoichiometry: true
			};

			this.options = _.extend(defaultOptions, options);

		},

		readMiJson : function (json) {
		
		    //check that we've got a parsed javascript object here, not a String
			miJson = (typeof miJson === 'object') ? miJson : JSON.parse(miJson);
			
			var data = miJson.data;
			var dataElementCount = data.length;
			var self = this;
			
			//temporarily disabled - see note below
			//var complexes = new Map ();
			
			//disabled - see note below
			//var needsSequence = new Set();//things that need seq looked up

			if (this.options.expandStoichiometry === true) {
				readStoichExpanded()}
			else {
				readStoichUnexpanded();
			}

			/*
			 * temp disabled for simplicity
			 */
			/*
			//init complexes
			var complexes = complexes.values()
			for (var c = 0; c < complexes.length; c++) {
				var interactionId;
				if (expand) {
					interactionId = complexes[c].id.substring(0, complexes[c].id.indexOf('('));
				}
				else {
					interactionId = complexes[c].id;
				}
				var naryLink;
				for (var l = 0; l < dataElementCount; l++) {
					var interaction = data[l];
					if (interaction.id == interactionId) {
						var nLinkId = getNaryLinkIdFromInteraction(interaction);
						naryLink = self.allNaryLinks.get(nLinkId);
					}
				}
				complexes[c].initMolecule(naryLink);
				naryLink.complex = complexes[c];
			}
			*/

			/*
			 * Not looking up sequences or features from UniProt until new JSON service is available
			 */
			/*
			//lookup missing sequences
			var nsIds = needsSequence.values();
			var nsCount = nsIds.length;
			if (nsCount === 0) {
				self.initPolymers();
			}
			else {
				var countSequences = 0;
				for (var m = 0; m < nsCount; m++){
					xiNET_Storage.getSequence(nsIds[m], function(id, seq){
							self.molecules.get(id).setSequence(seq);
							countSequences++;
							if (countSequences === nsCount){
								self.initPolymers();
							}
						}
					);
				}
			}
			*/

			function readStoichExpanded(){
				var interactors = this.get("interactors");
				for (var n = 0; n < dataElementCount; n++) {
					if (data[n].object === 'interactor') {
						var interactor = data[n];
						interactors.set(interactor.id, interactor);
					}
				}

				//get maximum stoichiometry
				var maxStoich = 0;
				for (var l = 0; l < dataElementCount; l++) {
					var interaction = data[l];
					if (interaction.object === 'interaction') {
						var participantCount = interaction.participants.length;
						for (var pi = 0; pi < participantCount; pi++) {
							var participant = interaction.participants[pi];
							if (participant.stoichiometry && (participant.stoichiometry-0) > maxStoich){
								maxStoich = (participant.stoichiometry-0);
							}
						}
					}
				}
				if (maxStoich < 30){
					miJson = Expand.matrix(miJson);
				}

				//add naryLinks and participants
				for (var l = 0; l < dataElementCount; l++) {
					var interaction = data[l];
					if (interaction.object === 'interaction') {
						var jsonParticipants = interaction.participants;
						var participantCount = jsonParticipants.length

						//init n-ary link
						var nLinkId = getNaryLinkIdFromInteraction(interaction)
						var nLink = self.allNaryLinks.get(nLinkId);
						if (typeof nLink === 'undefined') {
							//doesn't already exist, make new nLink
							nLink = new NaryLink(nLinkId, self);
							self.allNaryLinks.set(nLinkId, nLink);
							//alot of time could be spent creating and recreating these IDs, 
							//stash them in the interaction object
							interaction.naryId =  nLinkId;

						}
						nLink.addEvidence(interaction);

						//init participants
						for (var pi = 0; pi < participantCount; pi++){
							var jsonParticipant = jsonParticipants[pi];

							var intRef = jsonParticipant.interactorRef;
							var partRef = jsonParticipant.id;
							var participantId =  intRef + "(" + partRef + ")";
							var participant = self.molecules.get(participantId);
							if (typeof participant === 'undefined'){
								var interactor = interactors.get(intRef);
								participant = newMolecule(interactor, participantId);
								self.molecules.set(participantId, participant);
							}

							participant.naryLinks.set(nLinkId, nLink);
							if (nLink.interactors.indexOf(participant) === -1){
								nLink.interactors.push(participant);
							}

							if (jsonParticipant.stoichiometry && jsonParticipant.stoichiometry !== null){
								var interactor = self.molecules.get(participantId);
								interactor.addStoichiometryLabel(jsonParticipant.stoichiometry);
							}
						}
					}
				}
				
				indexFeatures();

			};

			function newMolecule(interactor, participantId){
				var participant;
				if (typeof interactor === 'undefined') {
					//must be a previously unencountered complex -
					// MI:0314 - interaction?, MI:0317 - complex? and its many subclasses
					participant = new Complex(participantId, self);
					complexes.set(participantId, participant);
				}
				//molecule sets
				else if (interactor.type.id === 'MI:1304' //molecule set
						|| interactor.type.id === 'MI:1305' //molecule set - candidate set
						|| interactor.type.id === 'MI:1307' //molecule set - defined set
						|| interactor.type.id === 'MI:1306' //molecule set - open set
					) {
					participant = new MoleculeSet(participantId, self, interactor); //doesn't really work yet
				}
				//bioactive entities
				else if (interactor.type.id === 'MI:1100' // bioactive entity
						|| interactor.type.id === 'MI:0904' // bioactive entity - polysaccharide
						|| interactor.type.id === 'MI:0328' //bioactive entity - small mol
					) {
					participant = new BioactiveEntity(participantId, self, interactor, interactor.label);
				}
				// proteins, peptides
				else if (interactor.type.id === 'MI:0326' || interactor.type.id === 'MI:0327') {
					participant = new Protein(participantId, self, interactor, interactor.label);
					if (typeof interactor.sequence !== 'undefined') {
						participant.setSequence(interactor.sequence);
					}
					else {
						//should look it up using accession number
						//~ if (participantId.indexOf('uniprotkb') === 0){
							//~ needsSequence.add(participantId);
						//~ } else {
							participant.setSequence("SEQUENCEMISSING");
						//~ }
					}
				}
				//genes
				else if (interactor.type.id === 'NI:0250') {
					participant = new Gene(participantId, self, interactor, interactor.label);
				}
				//RNA
				else if (interactor.type.id === 'MI:0320' // RNA
						|| interactor.type.id === 'MI:0321' // RNA - catalytic
						|| interactor.type.id === 'MI:0322' // RNA - guide
						|| interactor.type.id === 'MI:0323' // RNA - heterogeneous nuclear
						|| interactor.type.id === 'MI:2190' // RNA - long non-coding
						|| interactor.type.id === 'MI:0324' // RNA - messenger
						|| interactor.type.id === 'MI:0679' // RNA - poly adenine
						|| interactor.type.id === 'MI:0608' // RNA - ribosomal
						|| interactor.type.id === 'MI:0611' // RNA - signal recognition particle
						|| interactor.type.id === 'MI:0610' // RNA - small interfering
						|| interactor.type.id === 'MI:0607' // RNA - small nuclear
						|| interactor.type.id === 'MI:0609' // RNA - small nucleolar
						|| interactor.type.id === 'MI:0325' // RNA - transfer
					) {
					participant = new RNA(participantId, self, interactor, interactor.label);
				}
				//DNA
				else if (interactor.type.id === 'MI:0319' // DNA
						|| interactor.type.id === 'MI:0681' // DNA - double stranded
						|| interactor.type.id === 'MI:0680' // DNA - single stranded
					) {
					participant = new DNA(participantId, self, interactor, interactor.label);
				} else {
					// MI:0329 - unknown participant ?
					// MI:0383 - biopolymer ?
					alert("Unrecognised type:" + interactor.type.name);
				}
				return participant;
			}

			function indexFeatures(){
				//create indexed collection of all features from interactions
				// - still seems like a good starting point
				for (var l = 0; l < dataElementCount; l++) {
					var interaction = data[l];
					if (interaction.object === 'interaction') {
						var participantCount = interaction.participants.length;
						for (var pi = 0; pi < participantCount; pi++) {
							var participant = interaction.participants[pi];
							var features = new Array(0);
							if (participant.features) features = participant.features;

							var fCount = features.length;
							for (var f = 0; f < fCount; f++){
								var feature = features[f];
								self.features.set(feature.id, new Feature(self, feature));
							}
						}
					}
				}
			}

			function readStoichUnexpanded(){
				//get interactors
				for (var n = 0; n < dataElementCount; n++) {
					if (data[n].object === 'interactor') {
						var interactor = data[n];
						var participant;
						var participantId = interactor.id;
						participant = newMolecule (interactor, participantId);
						self.molecules.set(participantId, participant);
					}
				}

				indexFeatures();

				//add naryLinks
				for (var l = 0; l < dataElementCount; l++) {
					var interaction = data[l];
					if (interaction.object === 'interaction') {
						var jsonParticipants = interaction.participants;
						var participantCount = jsonParticipants.length

						//init n-ary link
						var nLinkId = getNaryLinkIdFromInteraction(interaction)
						var nLink = self.allNaryLinks.get(nLinkId);
						if (typeof nLink === 'undefined') {
							//doesn't already exist, make new nLink
							nLink = new NaryLink(nLinkId, self);
							self.allNaryLinks.set(nLinkId, nLink);
						}
						nLink.addEvidence(interaction);

						//~ //init participants
						for (var pi = 0; pi < participantCount; pi++){
							var jsonParticipant = jsonParticipants[pi];
							var intRef = jsonParticipant.interactorRef;
							var participantId =  intRef;// + "(" + partRef + ")";
							var participant = self.molecules.get(participantId);

							if (typeof participant === 'undefined'){
								//must be a previously unencountered complex
								participant = new Complex(participantId, self);
								complexes.set(participantId, participant);
								self.molecules.set(participantId, participant);
							}


							participant.naryLinks.set(nLinkId, nLink);
							//TODO: tidy up whats happening in NaryLink re interactor/participant terminology
							if (nLink.interactors.indexOf(participant) === -1){
								nLink.interactors.push(participant);
							}
							//~ if (jsonParticipant.stoichiometry && jsonParticipant.stoichiometry !== null){
								//~ var interactor = self.molecules.get(participantId);
								//~ interactor.addStoichiometryLabel(jsonParticipant.stoichiometry);
							//~ }
						}
					}
				}

			};


			function getNaryLinkIdFromInteraction(interaction) {
				if (interaction.naryId) {
					return interaction.naryId;
				}
				var jsonParticipants = interaction.participants;
				var participantCount = jsonParticipants.length

				var pIDs = d3.set();//used to eliminate duplicates
				//make id
				for (var pi = 0; pi < participantCount; pi++) {
					var pID = jsonParticipants[pi].interactorRef;
					if (expand)	{
						pID = pID	+ "(" + jsonParticipants[pi].id + ")";
					}
					pIDs.add(pID);
				}

				return pIDs.values().sort().join('-');
			};

			function getFeatureLink(fromSeqData, toSeqData, interaction){
				function seqDataToString(seqData){
					var nodeIds = new Set ();//used to eliminate duplicates
					//make id
					for (var s = 0; s < seqData.length; s++){
						var seq = seqData[s];
						var id = seq.interactorRef;
						if (expand) {
							id = id + '(' + seq.participantRef + ')';
						}
						id = id + ':' + seq.pos;
						nodeIds.add(id);
					}
					//sort ids
					return nodeIds.values().sort().join(';');
				}


				var start =  seqDataToString(fromSequenceData);
				var end =  seqDataToString(toSequenceData);
				var seqLinkId, endsSwapped;
				if (start < end){
					seqLinkId  =  start + '><' + end;
					endsSwapped = false;
				} else {
					seqLinkId = end + '><' + start;
					endsSwapped = true;
				}
				var sequenceLink = self.allFeatureLinks.get(seqLinkId);
				if (typeof sequenceLink === 'undefined') {
					var fromFeaturePositions = new Array();
					var seqDatumCount = fromSeqData.length;
					for (var i = 0; i < seqDatumCount; i++) {
						fromFeaturePositions.push(new SequenceDatum(getNode(fromSeqData[i]), fromSeqData[i].pos));
					}
					var toFeaturePositions = new Array();
					seqDatumCount = toSeqData.length;
					for (i = 0; i < seqDatumCount; i++) {
						toFeaturePositions.push(new SequenceDatum(getNode(toSeqData[i]), toSeqData[i].pos));
					}
					//~ if (endsSwapped === false) {
						sequenceLink = new FeatureLink(seqLinkId, fromFeaturePositions, toFeaturePositions, self, interaction);
					//~ }else {
						//~ sequenceLink = new FeatureLink(seqLinkId, toFeaturePositions, fromFeaturePositions, self, interaction);
					//~ }
					self.allFeatureLinks.set(seqLinkId, sequenceLink);
				}

				sequenceLink.addEvidence(interaction);
				var nLinkId = getNaryLinkIdFromInteraction(interaction);
				var nLink = self.allNaryLinks.get(nLinkId);
				nLink.sequenceLinks.set(seqLinkId, sequenceLink);
				return sequenceLink;
			};
			
		},

		expandStoichiometery : function (miJson) {
			
			var startTime =  +new Date();

			// We'll need collections of our interactions and interactors for later..
			var interactions = json.data.filter(function(interaction) {
				return interaction.object == "interaction";
			})

			var interactors = json.data.filter(function(interactor) {
				return interactor.object == "interactor";
			})

			var newParticipants = [];
			var newInteractors = [];

			// Loop through our interactions
			interactions.forEach(function(interaction) {

				// Get a collection of participants where the stoichiometry is greater than one.
				var participantsToExpand = interaction.participants.filter(function(participant) {
					if (participant.stoichiometry > 1) {
						return participant;
					}
				})

				// Loop through our participants that need expanding
				participantsToExpand.forEach(function(participant) {

					// Do we have an interactor? TODO: Will his affect complexes?
					var foundInteractor = findFirstObjWithAttr(interactors, "id", participant.interactorRef);

					// If we found an interactor then we need to clone it.
					if (foundInteractor) {

						for (var i = 0; i < participant.stoichiometry - 1; i++) {
							/********** PARTICIPANTS **********/
							// Now clone the participant and link it to the new cloned interactor
							// This method of cloning appears to work so far.
							var clonedParticipant = JSON.parse(JSON.stringify(participant));
							
							//~ clonedParticipant.interactorRef = clonedInteractor.id;
							clonedParticipant.id = clonedParticipant.id + "_" + i;

							// Store a reference from where we were cloned
							clonedParticipant.cloneParentID = participant.id;
							clonedParticipant.cloneIteration = i;
							participant.cloned = true

							// We need to relink to our binding site IDs:
							if (clonedParticipant.features) {
								clonedParticipant.features.forEach(function(feature) {

									feature.clonedfrom = feature.id;
									feature.id = feature.id + "_" + i;

									// Also, adjust our sequence data
									feature.sequenceData.forEach(function(sequenceData) {
										sequenceData.participantRef = clonedParticipant.id;
										//~ sequenceData.interactorRef = clonedInteractor.id;
									});
								});
							}

							interaction.participants.push(clonedParticipant);
							newParticipants.push(clonedParticipant);

						}
					}
				});

				// Get ALL of our features.
				var featureMap = new Map ();
				interaction.participants.forEach(function(participant) {
					if (participant.features) {
						participant.features.forEach(function(feature) {
							feature.parentParticipant = participant.id;
							featureMap.set(feature.id, feature);
						});
					}
				});


				var values = featureMap.values();

				values.forEach(function(feature) {
					if (feature.clonedfrom) {
						// Find all binding sites that have a linked feature to me and add the clone id
						values.forEach(function(nFeature) {
							var linkedFeatures = nFeature.linkedFeatures;
							if (linkedFeatures) {
								if (linkedFeatures.indexOf(feature.clonedfrom) > -1) {
									var clonedFeature = JSON.parse(JSON.stringify(nFeature));
									clonedFeature.id = nFeature.id + "_" + feature.id;
									clonedFeature.linkedFeatures = []
									clonedFeature.linkedFeatures.push(feature.id);

									var parts = findFirstObjWithAttr(interaction.participants, "id", clonedFeature.parentParticipant);
									parts.features.push(clonedFeature);
								}
							}
						});
					}
				});
			});


			//clear stoich info from participant?
			interactions.forEach(function(interaction) {
				interaction.participants.forEach(function(participant) {
					participant.stoichiometry = null;
				});
			});

			//actually the expansion code doesn't seem to take up that much time
			//console.log("Expand time:" + ( +new Date() - startTime));
			return json
		}

			// Returns the first object in an array that has an attribute with a matching value.
			function findFirstObjWithAttr(collection, attribute, value) {
				for(var i = 0; i < collection.length; i += 1) {
					if(collection[i][attribute] === value) {
						return collection[i];
					}
				}
			}
			
		}

	});

} (this));
