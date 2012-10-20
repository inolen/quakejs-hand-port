/**
 * GentityForNum
 */
function GentityForNum(num) {
	return sv.gameEntities[num];
}

/**
 * SvEntityForGentity
 */
function SvEntityForGentity(gent) {
	var num = gent.s.number;

	if (!gent || num < 0 || num >= MAX_GENTITIES) {
		throw new Error('SvEntityForSharedEntity: bad game entity');
	}

	var ent = sv.svEntities[num];

	if (!ent) {
		ent = sv.svEntities[num] = new ServerEntity(num);
	}

	return ent;
}

/**
 * GentityForSvEntity
 */
function GentityForSvEntity(ent) {
	var num = ent.number;

	if (!ent || num < 0 || num >= MAX_GENTITIES) {
		throw new Error('SharedEntityForSvEntity: bad sv entity');
	}

	return sv.gameEntities[num];
}

/**
 * LocateGameData
 */
function LocateGameData(gameEntities, gameClients) {
	sv.gameEntities = gameEntities;
	sv.gameClients = gameClients;
}

/**
 * GetUserCommand
 */
function GetUserCommand(clientNum, cmd) {
	if (clientNum < 0 || clientNum >= MAX_CLIENTS) {
		throw new Error('GetUsercmd: bad clientNum: ' + clientNum);
	}

	svs.clients[clientNum].lastUserCmd.clone(cmd);
}

/**
 * SetBrushModel
 */
function SetBrushModel(gent, name) {
	if (!name) {
		throw new Error('SV: SetBrushModel: null');
	}

	if (name.charAt(0) !== '*') {
		throw new Error('SV: SetBrushModel: ' + name + 'isn\'t a brush model');
	}

	gent.s.modelindex = parseInt(name.substr(1));

	var h = cm.InlineModel(gent.s.modelindex);
	cm.ModelBounds(h, gent.mins, gent.maxs);
	gent.bmodel = true;

	// we don't know exactly what is in the brushes
	gent.contents = -1;
}