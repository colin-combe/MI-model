//  MI-model
//	License: Apache v2.0
//  authors: Colin Combe, Josh Heimbach
//  MI.model.MolecularInteractionData.js

var Backbone = require('backbone');

var Participant = require('./Participant');
var NaryLink = require('./NaryLink');
var FeatureLink = require('./FeatureLink');
var Feature = require('./Feature');
var AnnotationRegion = require('./AnnotatedRegion');

var MI = MI || {};
MI.model = MI.model || {};

MI.model.MolecularInteractionData = Backbone.Model.extend ({
	defaults : {
		interactors: new Map (),
		participants: new Map(),
		features: new Map(),
		naryLinks: new Map(),
		featureLinks: new Map()
	},

	initialize: function (options) {

		var defaultOptions = {
			//default is to expand stoichiometry
			expandStoichiometry: true
		};

		this.options = _.extend(defaultOptions, options);

	},

	readMiJson : function (miJson) {

		//check that we've got a parsed javascript object here, not a String
		miJson = (typeof miJson === 'object') ? miJson : JSON.parse(miJson);

		var data = miJson.data;
		var dataElementCount = data.length;
		var self = this;

		//index interactors
		var interactors = this.get("interactors");
		for (var n = 0; n < dataElementCount; n++) {
			if (data[n].object === 'interactor') {
				var interactor = data[n];
				interactors.set(interactor.id, interactor);
			}
		}

		var participants = this.get("participants");

		//create naryLinks and participants
		if (this.options.expandStoichiometry === true) {
			miJson = expandStoichiometry(miJson);
			readStoichExpanded()}
		else {
			readStoichUnexpanded();
		}

		//index features
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

/*
		// loop through particpants and features
		// init binary, unary and sequence links,
		// and make needed associations between these and containing naryLink
		for (var l = 0; l < dataElementCount; l++) {
				var interaction = data[l];
				if (interaction.object === 'interaction') {
				var jsonParticipants = interaction.participants;
				var participantCount = jsonParticipants.length

				for (var pi = 0; pi < participantCount; pi++){
					var jsonParticipant = jsonParticipants[pi];
					var features = new Array(0);
					if (jsonParticipant.features) features = jsonParticipant.features;

					var fCount = features.length;
					for (var f = 0; f < fCount; f++){// for each feature
						var feature = features[f];
						var fromSequenceData = feature.sequenceData;
						if (feature.linkedFeatures) { // if linked features
							var linkedFeatureIDs = feature.linkedFeatures;


							var linkedFeatureCount = linkedFeatureIDs.length;
							for (var lfi = 0; lfi < linkedFeatureCount; lfi++){ //for each linked feature

								// !! following is a hack, code can't deal with
								// !! composite binding region across two different interactors
								// break feature links to different nodes into seperate binary links
								var toSequenceData_indexedByNodeId = d3.map();

								var linkedFeature = self.features.get(linkedFeatureIDs[lfi])
								var seqDataCount = linkedFeature.sequenceData.length;
								for (var s = 0; s < seqDataCount; s++){
									var seqData = linkedFeature.sequenceData[s];
									var nodeId = seqData.interactorRef;
									if (expand) {
										nodeId = nodeId + '(' + seqData.participantRef + ')';
									}
									var toSequenceData = toSequenceData_indexedByNodeId.get(nodeId);
									if (typeof toSequenceData === 'undefined'){
										toSequenceData = new Array();
										toSequenceData_indexedByNodeId.set(nodeId, toSequenceData);
									}
									toSequenceData = toSequenceData.push(seqData)
								}

								var countEndNodes = toSequenceData_indexedByNodeId.values().length;
								for (var n = 0; n < countEndNodes; n++) {
									toSequenceData = toSequenceData_indexedByNodeId.values()[n];
									var fromMolecule = getNode(fromSequenceData[0]);
									var toMolecule = getNode(toSequenceData[0]);
									var link;
									if (fromMolecule === toMolecule){
										link = getUnaryLink(fromMolecule, interaction);
									}
									else {
										link = getBinaryLink(fromMolecule, toMolecule, interaction);
									}
									var sequenceLink = getFeatureLink(fromSequenceData, toSequenceData, interaction);
									fromMolecule.sequenceLinks.set(sequenceLink.id, sequenceLink);
									toMolecule.sequenceLinks.set(sequenceLink.id, sequenceLink);
									link.sequenceLinks.set(sequenceLink.id, sequenceLink);
								}

							}// end for each linked feature

						}// end if linked features
					}// end for each feature
				}
			}
		}
*/

		function readStoichExpanded(){

			//add naryLinks and participants
			for (var l = 0; l < dataElementCount; l++) {
				var interaction = data[l];
				if (interaction.object === 'interaction') {
					var jsonParticipants = interaction.participants;
					var participantCount = jsonParticipants.length;

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
							participant = new Participant (participantId, interactor);
							participants.set(participantId, participant);
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


		};

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

		function expandStoichiometry(miJson) {

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


module.exports = Feature;	// Also, adjust our sequence data
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

				// Returns the first object in an array that has an attribute with a matching value.
				function findFirstObjWithAttr(collection, attribute, value) {
					for(var i = 0; i < collection.length; i += 1) {
						if(collection[i][attribute] === value) {
							return collection[i];
						}
					}
				}

			}

	},

});

module.exports = MI.model.MolecularInteractionData;
