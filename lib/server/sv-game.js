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
		com.error(sh.Err.DROP, 'SvEntityForSharedEntity: bad game entity');
	}

	return sv.svEntities[num];
}

/**
 * GentityForSvEntity
 */
function GentityForSvEntity(ent) {
	var num = sv.svEntities.indexOf(ent);

	if (!ent || num < 0 || num >= MAX_GENTITIES) {
		com.error(sh.Err.DROP, 'SharedEntityForSvEntity: bad sv entity');
	}

	return GentityForNum(num);
}

/**
 * EntityContact
 */
function EntityContact(mins, maxs, gent) {
	// Check for exact collision.
	var origin = gent.currentOrigin;
	var angles = gent.currentAngles;

	var ch = ClipHandleForEntity(gent);	
	var trace = cm.TransformedBoxTrace(QMath.vec3_origin, QMath.vec3_origin, mins, maxs, ch, -1, origin, angles, false);

	return trace.startSolid;
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
		com.error(sh.Err.DROP, 'GetUsercmd: bad clientNum: ' + clientNum);
	}

	svs.clients[clientNum].lastUserCmd.clone(cmd);
}

/**
 * SetBrushModel
 */
function SetBrushModel(gent, name) {
	if (!name) {
		com.error(sh.Err.DROP, 'SV: SetBrushModel: null');
	}

	if (name.charAt(0) !== '*') {
		com.error(sh.Err.DROP, 'SV: SetBrushModel: ' + name + 'isn\'t a brush model');
	}

	gent.s.modelIndex = parseInt(name.substr(1), 10);

	var h = cm.InlineModel(gent.s.modelIndex);
	cm.ModelBounds(h, gent.mins, gent.maxs);
	gent.bmodel = true;

	// we don't know exactly what is in the brushes
	gent.contents = -1;
}