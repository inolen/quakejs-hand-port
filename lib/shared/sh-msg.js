//
// Helper functions to get/set object properties based on a string.
//
function FTA(fieldname) {
	var m = fieldname.match(/([^\.\[\]]+)/g);
	return m;
}

function AGET(obj, path) {
	var i, len;

	for (i = 0, len = path.length; i < len - 1; i++) {
		obj = obj[path[i]];
	}
	
	return obj[path[len - 1]];
}

function ASET(obj, path, val) {
	var i, len;

	for (i = 0, len = path.length; i < len - 1; i++) {
		obj = obj[path[i]];
	}

	obj[path[len - 1]] = val;
}

/**********************************************************
 *
 * Playerstate communication
 *
 **********************************************************/

var playerStateFields = [
	{ path: FTA('commandTime'),       bits: 32 },
	{ path: FTA('origin[0]'),         bits: 0  },
	{ path: FTA('origin[1]'),         bits: 0  },
	{ path: FTA('bobCycle'),          bits: 8  },
	{ path: FTA('velocity[0]'),       bits: 0  },
	{ path: FTA('velocity[1]'),       bits: 0  },
	{ path: FTA('viewangles[1]'),     bits: 0  },
	{ path: FTA('viewangles[0]'),     bits: 0  },
	{ path: FTA('weaponTime'),        bits: 16 },
	{ path: FTA('origin[2]'),         bits: 0  },
	{ path: FTA('velocity[2]'),       bits: 0  },
	{ path: FTA('legsTimer'),         bits: 8  },
	{ path: FTA('pm_time'),           bits: 16 },
	{ path: FTA('eventSequence'),     bits: 16 },
	{ path: FTA('torsoAnim'),         bits: 8  },
	{ path: FTA('movementDir'),       bits: 8  }, /*4*/
	{ path: FTA('events[0]'),         bits: 8  },
	{ path: FTA('legsAnim'),          bits: 8  },
	{ path: FTA('events[1]'),         bits: 8  },
	{ path: FTA('pm_flags'),          bits: 16 },
	{ path: FTA('groundEntityNum'),   bits: 16 }, /*GENTITYNUM_BITS*/
	{ path: FTA('weaponState'),       bits: 8  }, /*4*/
	{ path: FTA('eFlags'),            bits: 16 },
	{ path: FTA('externalEvent'),     bits: 16 }, /*10*/
	{ path: FTA('gravity'),           bits: 16 },
	{ path: FTA('speed'),             bits: 16 },
	{ path: FTA('delta_angles[1]'),   bits: 16 },
	{ path: FTA('externalEventParm'), bits: 8 },
	// { path: FTA('viewheight'),        bits: 8  },
	// { path: FTA('damageEvent'),       bits: 8  },
	// { path: FTA('damageYaw'),         bits: 8  },
	// { path: FTA('damagePitch'),       bits: 8  },
	// { path: FTA('damageCount'),       bits: 8  },
	// { path: FTA('generic1'),          bits: 8  },
	{ path: FTA('pm_type'),           bits: 8  },
	{ path: FTA('delta_angles[0]'),   bits: 16 },
	{ path: FTA('delta_angles[2]'),   bits: 16 },
	{ path: FTA('torsoTimer'),        bits: 16 }, /*12*/
	{ path: FTA('eventParms[0]'),     bits: 8  },
	{ path: FTA('eventParms[1]'),     bits: 8  },
	{ path: FTA('clientNum'),         bits: 8  },
	{ path: FTA('weapon'),            bits: 8  }, /*5*/
	{ path: FTA('viewangles[2]'),     bits: 0  },
	// { path: FTA('grapplePoint[0]'),   bits: 0  },
	// { path: FTA('grapplePoint[1]'),   bits: 0  },
	// { path: FTA('grapplePoint[2]'),   bits: 0  },
	{ path: FTA('jumppad_ent'),       bits: 16 }, /*GENTITYNUM_BITS*/
	// { path: FTA('loopSound'),         bits: 16 }
];

function WriteDeltaPlayerState(msg, from, to) {
	for (var i = 0; i < playerStateFields.length; i++) {
		var field = playerStateFields[i];
		var func;

		switch (field.bits) {
			case 0:
				func = msg.writeFloat;
				break;
			case 8:
				func = msg.writeUnsignedByte;
				break;
			case 16:
				func = msg.writeUnsignedShort;
				break;
			case 32:
				func = msg.writeUnsignedInt;
				break;
			default:
				throw new Error('WriteDeltaPlayerState: bad bit count ' + field.bits);
		}

		func.call(msg, AGET(from, field.path));
	}

	for (var i = 0; i < MAX_STATS; i++) {
		msg.writeShort(from.stats[i]);
	}
	for (var i = 0; i < MAX_PERSISTANT; i++) {
		msg.writeShort(from.persistant[i]);
	}
	for (var i = 0; i < MAX_POWERUPS; i++) {
		msg.writeShort(from.powerups[i]);
	}
	for (var i = 0; i < MAX_WEAPONS; i++) {
		msg.writeShort(from.ammo[i]);
	}
}

function ReadDeltaPlayerState(msg, from, to) {
	for (var i = 0; i < playerStateFields.length; i++) {
		var field = playerStateFields[i];
		var func;

		switch (field.bits) {
			case 0:
				func = msg.readFloat;
				break;
			case 8:
				func = msg.readUnsignedByte;
				break;
			case 16:
				func = msg.readUnsignedShort;
				break;
			case 32:
				func = msg.readUnsignedInt;
				break;
			default:
				throw new Error('WriteDeltaPlayerState: bad bit count ' + field.bits);
		}

		ASET(from, field.path, func.call(msg));
	}

	var stats = 0;
	for (var i = 0; i < MAX_STATS; i++) {
		from.stats[i] = msg.readShort();
	}
	for (var i = 0; i < MAX_PERSISTANT; i++) {
		from.persistant[i] = msg.readShort();
	}
	for (var i = 0; i < MAX_POWERUPS; i++) {
		from.powerups[i] = msg.readShort();
	}
	for (var i = 0; i < MAX_WEAPONS; i++) {
		from.ammo[i] = msg.readShort();
	}
}

/**********************************************************
 *
 * Entitystate communication
 *
 **********************************************************/

var entityStateFields = [
	{ path: FTA('pos.trTime'),      bits: 32 },
	{ path: FTA('pos.trBase[0]'),   bits: 0  },
	{ path: FTA('pos.trBase[1]'),   bits: 0  },
	{ path: FTA('pos.trDelta[0]'),  bits: 0  },
	{ path: FTA('pos.trDelta[1]'),  bits: 0  },
	{ path: FTA('pos.trBase[2]'),   bits: 0  },
	{ path: FTA('apos.trBase[1]'),  bits: 0  },
	{ path: FTA('pos.trDelta[2]'),  bits: 0  },
	{ path: FTA('apos.trBase[0]'),  bits: 0  },
	{ path: FTA('event'),           bits: 16 }, /*10*/
	{ path: FTA('angles2[1]'),      bits: 0  },
	{ path: FTA('eType'),           bits: 8  },
	{ path: FTA('torsoAnim'),       bits: 8  },
	{ path: FTA('eventParm'),       bits: 8  },
	{ path: FTA('legsAnim'),        bits: 8  },
	{ path: FTA('groundEntityNum'), bits: 16 }, /*GENTITYNUM_BITS*/
	{ path: FTA('pos.trType'),      bits: 8  },
	{ path: FTA('eFlags'),          bits: 32 }, /*19*/
	{ path: FTA('otherEntityNum'),  bits: 16 }, /*GENTITYNUM_BITS*/
	{ path: FTA('weapon'),          bits: 8  },
	{ path: FTA('clientNum'),       bits: 8  },
	{ path: FTA('angles[1]'),       bits: 0  },
	{ path: FTA('pos.trDuration'),  bits: 32 },
	{ path: FTA('apos.trType'),     bits: 8  },
	{ path: FTA('origin[0]'),       bits: 0  },
	{ path: FTA('origin[1]'),       bits: 0  },
	{ path: FTA('origin[2]'),       bits: 0  },
	{ path: FTA('solid'),           bits: 32 }, /*24*/
	{ path: FTA('powerups'),        bits: 16 }, /*MAX_POWERUPS*/
	{ path: FTA('modelIndex'),      bits: 8  },
	{ path: FTA('otherEntityNum2'), bits: 16 }, /*GENTITYNUM_BITS*/
	{ path: FTA('loopSound'),       bits: 8  },
	{ path: FTA('generic1'),        bits: 8  },
	{ path: FTA('origin2[2]'),      bits: 0  },
	{ path: FTA('origin2[0]'),      bits: 0  },
	{ path: FTA('origin2[1]'),      bits: 0  },
	{ path: FTA('modelIndex2'),     bits: 8  },
	{ path: FTA('angles[0]'),       bits: 0  },
	{ path: FTA('time'),            bits: 32 },
	{ path: FTA('apos.trTime'),     bits: 32 },
	{ path: FTA('apos.trDuration'), bits: 32 },
	{ path: FTA('apos.trBase[2]'),  bits: 0  },
	{ path: FTA('apos.trDelta[0]'), bits: 0  },
	{ path: FTA('apos.trDelta[1]'), bits: 0  },
	{ path: FTA('apos.trDelta[2]'), bits: 0  },
	{ path: FTA('time2'),           bits: 32 },
	{ path: FTA('angles[2]'),       bits: 0  },
	{ path: FTA('angles2[0]'),      bits: 0  },
	{ path: FTA('angles2[2]'),      bits: 0  },
	{ path: FTA('constantLight'),   bits: 32 },
	{ path: FTA('frame'),           bits: 16 }
];

function WriteDeltaEntityState(msg, from, to) {
	for (var i = 0; i < entityStateFields.length; i++) {
		var field = entityStateFields[i];
		var func;

		switch (field.bits) {
			case 0:
				func = msg.writeFloat;
				break;
			case 8:
				func = msg.writeUnsignedByte;
				break;
			case 16:
				func = msg.writeUnsignedShort;
				break;
			case 32:
				func = msg.writeUnsignedInt;
				break;
			default:
				throw new Error('WriteDeltaEntityState: bad bit count ' + field.bits);
		}

		func.call(msg, AGET(from, field.path));
	}
}

function ReadDeltaEntityState(msg, from, to) {
	for (var i = 0; i < entityStateFields.length; i++) {
		var field = entityStateFields[i];
		var func;

		switch (field.bits) {
			case 0:
				func = msg.readFloat;
				break;
			case 8:
				func = msg.readUnsignedByte;
				break;
			case 16:
				func = msg.readUnsignedShort;
				break;
			case 32:
				func = msg.readUnsignedInt;
				break;
			default:
				throw new Error('ReadDeltaEntityState: bad bit count ' + field.bits);
		}

		ASET(from, field.path, func.call(msg));
	}
}
