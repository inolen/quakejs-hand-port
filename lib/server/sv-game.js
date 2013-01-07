/**
 * InitGame
 */
function InitGame() {
	svs.gameInitialized = true;
	gm.Init(sv.time);
}

/**
 * ShutdownGame
 */
function ShutdownGame() {
	if (!svs.gameInitialized) {
		return;
	}

	svs.gameInitialized = false;
	gm.Shutdown();
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

	if (!gent || num < 0 || num >= MAX_GENTITIES) {
		com.Error('SvEntityForSharedEntity: bad game entity');
	}

	return sv.svEntities[num];
}

/**
 * GentityForSvEntity
 */
function GentityForSvEntity(ent) {
	var num = sv.svEntities.indexOf(ent);

	if (!ent || num < 0 || num >= MAX_GENTITIES) {
		com.Error('SharedEntityForSvEntity: bad sv entity');
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
	if (clientNum < 0 || clientNum >= MAX_CLIENTS) {
		com.Error('GetUsercmd: bad clientNum: ' + clientNum);
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
		if (clientNum < 0 || clientNum >= MAX_CLIENTS) {
			com.Error('GetUsercmd: bad clientNum: ' + clientNum);
		}

		SendServerCommand(svs.clients[clientNum], type, val);
	}
}

/**
 * SetBrushModel
 */
function SetBrushModel(gent, name) {
	if (!name) {
		com.Error('SV: SetBrushModel: null');
	}

	if (name.charAt(0) !== '*') {
		com.Error('SV: SetBrushModel: ' + name + 'isn\'t a brush model');
	}

	gent.s.modelIndex = parseInt(name.substr(1), 10);

	var h = cm.InlineModel(gent.s.modelIndex);
	cm.ModelBounds(h, gent.mins, gent.maxs);
	gent.bmodel = true;

	// we don't know exactly what is in the brushes
	gent.contents = -1;
}

/**
 * AdjustAreaPortalState
 */
function AdjustAreaPortalState(gent, open) {
	var svEnt = SvEntityForGentity(gent);
	if (svEnt.areanum2 === -1) {
		return;
	}
	cm.AdjustAreaPortalState(svEnt.areanum, svEnt.areanum2, open);
}

/**
 * EntityContact
 */
function EntityContact(mins, maxs, gent) {
	// Check for exact collision.
	var origin = gent.currentOrigin;
	var angles = gent.currentAngles;

	var ch = ClipHandleForEntity(gent);
	var trace = cm.TransformedBoxTrace(QMath.vec3origin, QMath.vec3origin, mins, maxs, ch, -1, origin, angles, false);

	return trace.startSolid;
}