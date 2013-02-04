/**
 * InitGame
 */
function InitGame() {
	svs.gameInitialized = true;
	GM.Init(sv.time);
}

/**
 * ShutdownGame
 */
function ShutdownGame() {
	if (!svs.gameInitialized) {
		return;
	}

	svs.gameInitialized = false;
	GM.Shutdown();
}

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

	if (!gent || num < 0 || num >= QS.MAX_GENTITIES) {
		error('SvEntityForSharedEntity: bad game entity');
	}

	return sv.svEntities[num];
}

/**
 * GentityForSvEntity
 */
function GentityForSvEntity(ent) {
	var num = ent.number;

	if (!ent || num < 0 || num >= QS.MAX_GENTITIES) {
		error('SharedEntityForSvEntity: bad sv entity');
	}

	return GentityForNum(num);
}

/**
 * LocateGameData
 */
function LocateGameData(gameEntities, gameClients) {
	sv.gameEntities = gameEntities;
	sv.gameClients = gameClients;
}

/**
 * GetUserCmd
 */
function GetUserCmd(clientNum, cmd) {
	if (clientNum < 0 || clientNum >= QS.MAX_CLIENTS) {
		error('GetUsercmd: bad clientNum: ' + clientNum);
	}

	svs.clients[clientNum].lastUserCmd.clone(cmd);
}

/**
 * SendGameServerCommand
 */
function SendGameServerCommand(clientNum, type, val) {
	if (clientNum === null) {
		SendServerCommand(null, type, val);
	} else {
		if (clientNum < 0 || clientNum >= QS.MAX_CLIENTS) {
			error('GetUsercmd: bad clientNum: ' + clientNum);
		}

		SendServerCommand(svs.clients[clientNum], type, val);
	}
}

/**
 * SetBrushModel
 */
function SetBrushModel(gent, name) {
	if (!name) {
		error('SV: SetBrushModel: null');
	}

	if (name.charAt(0) !== '*') {
		error('SV: SetBrushModel: ' + name + 'isn\'t a brush model');
	}

	gent.s.modelIndex = parseInt(name.substr(1), 10);

	var h = CM.InlineModel(gent.s.modelIndex);
	CM.ModelBounds(h, gent.r.mins, gent.r.maxs);
	gent.r.bmodel = true;

	// we don't know exactly what is in the brushes
	gent.r.contents = -1;
}

/**
 * AdjustAreaPortalState
 */
function AdjustAreaPortalState(gent, open) {
	var svEnt = SvEntityForGentity(gent);
	if (svEnt.areanum2 === -1) {
		return;
	}
	CM.AdjustAreaPortalState(svEnt.areanum, svEnt.areanum2, open);
}

/**
 * EntityContact
 */
function EntityContact(mins, maxs, gent) {
	// Check for exact collision.
	var origin = gent.r.currentOrigin;
	var angles = gent.r.currentAngles;

	var ch = ClipHandleForEntity(gent);
	var trace = new QS.TraceResults();

	CM.TransformedBoxTrace(trace, QMath.vec3origin, QMath.vec3origin, mins, maxs, ch, -1, origin, angles);

	return trace.startSolid;
}