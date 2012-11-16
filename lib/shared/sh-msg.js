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

function fnread(bits) {
	switch (bits) {
		case 0:
			return 'readFloat';
			break;
		case 8:
			return 'readUnsignedByte';
			break;
		case 16:
			return 'readUnsignedShort';
			break;
		case 32:
			return 'readUnsignedInt';
			break;
		default:
			throw new Error('fnread: bad bit count ' + bits);
	}
}

function fnwrite(bits) {
	switch (bits) {
		case 0:
			return 'writeFloat';
			break;
		case 8:
			return 'writeUnsignedByte';
			break;
		case 16:
			return 'writeUnsignedShort';
			break;
		case 32:
			return 'writeUnsignedInt';
			break;
		default:
			throw new Error('fnwrite: bad bit count ' + bits);
	}
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

var dummyPlayerState = new PlayerState();

/**
 * WriteDeltaPlayerState
 */
function WriteDeltaPlayerState(msg, from, to) {
	var i, changed;
	var field, fromF, toF, func;

	if (!from) {
		from = dummyPlayerState;
	}

	// Figure out the number of fields that have changed.
	changed = 0;
	for (i = 0; i < playerStateFields.length; i++) {
		field = playerStateFields[i];

		fromF = AGET(from, field.path);
		toF = AGET(to, field.path);

		if (fromF !== toF) {
			changed++;
		}
	}

	msg.writeByte(changed);

	// Write out each field that has changed, prefixing 
	// the changed field with its indexed into the ps
	// field array.
	for (i = 0; i < playerStateFields.length; i++) {
		field = playerStateFields[i];

		fromF = AGET(from, field.path);
		toF = AGET(to, field.path);
		if (fromF === toF) {
			continue;
		}

		func = fnwrite(field.bits);

		// TODO Could write out a master bitmask describing
		// the changed fields.
		msg.writeByte(i);
		msg[func](AGET(to, field.path));
	}


	// // Write out the arrays. First we write a bit mask
	// // describing which arrays have changed, followed by
	// // a mask for each array describing which of its 
	// // elements have changed.

	// // Sanity check. Increase bitmask send length if changing
	// // these maxes is necessary
	// if (MAX_STATS > 16 || MAX_PERSISTANT > 16 || MAX_POWERUPS > 16 || MAX_WEAPONS > 16) {
	// 	throw new Error('Array maxes exceed bitmask length');
	// }

	// var statsbits      = 0,
	// 	persistantbits = 0,
	// 	powerupsbits   = 0,
	// 	ammobits       = 0;

	// for (i = 0; i < MAX_STATS; i++) {
	// 	if (to.stats[i] !== from.stats[i]) {
	// 		statsbits |= 1 << i;
	// 	}
	// }
	// for (i = 0; i < MAX_PERSISTANT; i++) {
	// 	if (to.persistant[i] !== from.persistant[i]) {
	// 		persistantbits |= 1 << i;
	// 	}
	// }
	// for (i = 0; i < MAX_POWERUPS; i++) {
	// 	if (to.powerups[i] !== from.powerups[i]) {
	// 		powerupsbits |= 1 << i;
	// 	}
	// }
	// for (i = 0; i < MAX_WEAPONS; i++) {
	// 	if (to.ammo[i] !== from.ammo[i]) {
	// 		ammobits |= 1 << i;
	// 	}
	// }

	// // Write out a byte explaining which arrays changed.
	// var arrbits = (statsbits ? 1 : 0) | (persistantbits ? 2 : 0) | (powerupsbits ? 4 : 0) | (ammobits ? 8 : 0);
	// msg.writeByte(arrbits);

	// if (statsbits) {
	// 	msg.writeShort(statsbits);
	// 	for (i = 0; i < MAX_STATS; i++) {
	// 		if (statsbits & (1 << i)) {
	// 			msg.writeShort(to.stats[i]);
	// 		}
	// 	}
	// }
	// if (persistantbits) {
	// 	msg.writeShort(persistantbits);
	// 	for (i = 0; i < MAX_PERSISTANT; i++) {
	// 		if (persistantbits & (1 << i)) {
	// 			msg.writeShort(to.persistant[i]);
	// 		}
	// 	}
	// }
	// if (powerupsbits) {
	// 	msg.writeShort(powerupsbits);
	// 	for (i = 0; i < MAX_POWERUPS; i++) {
	// 		if (powerupsbits & (1 << i)) {
	// 			msg.writeShort(to.powerups[i]);
	// 		}
	// 	}
	// }
	// if (ammobits) {
	// 	msg.writeShort(ammobits);
	// 	for (i = 0; i < MAX_WEAPONS; i++) {
	// 		if (ammobits & (1 << i)) {
	// 			msg.writeShort(to.ammo[i]);
	// 		}
	// 	}
	// }
}

function ReadDeltaPlayerState(msg, from, to) {
	var i, changed;
	var idx, field, fromF, toF, func;

	if (!from) {
		from = dummyPlayerState;
	}
	
	// Clone the initial state.
	from.clone(to);

	// Get the number of fields changed.
	changed = msg.readByte();

	// Read all the changed fields.
	for (i = 0; i < changed; i++) {
		idx = msg.readByte();
		field = playerStateFields[idx];
		func = fnread(field.bits);

		ASET(to, field.path, msg[func]());
	}

	// var arrbits = msg.readByte();

	// if (arrbits & 1) {
	// 	var statsbits = msg.readShort();
	// 	for (i = 0; i < MAX_STATS; i++) {
	// 		if (statsbits & (1 << i)) {
	// 			to.stats[i] = msg.readShort();
	// 		}
	// 	}
	// }
	// if (arrbits & 2) {
	// 	var persistantbits = msg.readShort();
	// 	for (i = 0; i < MAX_PERSISTANT; i++) {
	// 		if (persistantbits & (1 << i)) {
	// 			to.persistant[i] = msg.readShort();
	// 		}
	// 	}
	// }

	// if (arrbits & 4) {
	// 	var powerupsbits = msg.readShort();
	// 	for (i = 0; i < MAX_POWERUPS; i++) {
	// 		if (powerupsbits & (1 << i)) {
	// 			to.powerups[i] = msg.readShort();
	// 		}
	// 	}
	// }

	// if (arrbits & 8) {
	// 	var ammobits = msg.readShort();
	// 	for (i = 0; i < MAX_WEAPONS; i++) {
	// 		if (ammobits & (1 << i)) {
	// 			to.ammo[i] = msg.readShort();
	// 		}
	// 	}
	// }
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

/**
 * WriteDeltaEntityState
 */
var dummyEntityState = new EntityState();
function WriteDeltaEntityState(msg, from, to) {
	var i, changed;
	var field, fromF, toF, func;

	if (!from) {
		from = dummyEntityState;
	}

	// Figure out the number of fields that have changed.
	changed = 0;
	for (i = 0; i < entityStateFields.length; i++) {
		field = entityStateFields[i];

		fromF = AGET(from, field.path);
		toF = AGET(to, field.path);

		if (fromF !== toF) {
			changed++;
		}
	}

	msg.writeByte(changed);

	// Write out each field that has changed, prefixing 
	// the changed field with its indexed into the ps
	// field array.
	for (i = 0; i < entityStateFields.length; i++) {
		field = entityStateFields[i];

		fromF = AGET(from, field.path);
		toF = AGET(to, field.path);
		if (fromF === toF) {
			continue;
		}

		func = fnwrite(field.bits);

		msg.writeByte(i);
		msg[func](AGET(to, field.path));
	}
}

/**
 * ReadDeltaEntityState
 */
function ReadDeltaEntityState(msg, from, to) {
	var i, changed;
	var idx, field, fromF, toF, func;

	if (!from) {
		from = dummyEntityState;
	}
	
	// Clone the initial state.
	from.clone(to);

	// Get the number of fields changed.
	changed = msg.readByte();

	// Read all the changed fields.
	for (i = 0; i < changed; i++) {
		idx = msg.readByte();
		field = entityStateFields[idx];
		func = fnread(field.bits);

		ASET(to, field.path, msg[func]());
	}
}