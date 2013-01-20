//
// Helper functions to get/set object properties based on a string.
//
var FLOAT32 = 0;
var INT8    = 1;
var UINT8   = 2;
var UINT16  = 3;
var UINT32  = 4;

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
		case FLOAT32:
			return 'readFloat';
		case INT8:
			return 'readByte';
		case UINT8:
			return 'readUnsignedByte';
		case UINT16:
			return 'readUnsignedShort';
		case UINT32:
			return 'readUnsignedInt';
		default:
			throw new Error('fnread: bad bit count ' + bits);
	}
}

function fnwrite(bits) {
	switch (bits) {
		case FLOAT32:
			return 'writeFloat';
		case INT8:
			return 'writeByte';
		case UINT8:
			return 'writeUnsignedByte';
		case UINT16:
			return 'writeUnsignedShort';
		case UINT32:
			return 'writeUnsignedInt';
		default:
			throw new Error('fnwrite: bad bit count ' + bits);
	}
}

/**********************************************************
 *
 * Usercmd communication
 *
 **********************************************************/
var dummyUsercmd = new QS.UserCmd();

var usercmdFields = [
	{ path: FTA('angles[0]'),   bits: UINT16 },
	{ path: FTA('angles[1]'),   bits: UINT16 },
	{ path: FTA('angles[2]'),   bits: UINT16 },
	{ path: FTA('forwardmove'), bits: UINT8  },
	{ path: FTA('rightmove'),   bits: UINT8  },
	{ path: FTA('upmove'),      bits: UINT8  },
	{ path: FTA('buttons'),     bits: UINT16 },
	{ path: FTA('weapon'),      bits: UINT8  }
];

function WriteDeltaUsercmd(msg, from, to) {
	if (!from) {
		from = dummyUsercmd;
	}

	msg.writeInt(to.serverTime);

	// if (from.angles[0] === to.angles[0] &&
	// 	from.angles[1] === to.angles[1] &&
	// 	from.angles[2] === to.angles[2] &&
	// 	from.forwardmove === to.forwardmove &&
	// 	from.rightmove === to.rightmove &&
	// 	from.upmove === to.upmove &&
	// 	from.buttons === to.buttons &&
	// 	from.weapon === to.weapon) {
	// 		msg.writeByte(0);  // no change
	// 		return;
	// }

	// msg.writeByte(1);  // changed

	msg.writeUnsignedShort(to.angles[0]);
	msg.writeUnsignedShort(to.angles[1]);
	msg.writeUnsignedShort(to.angles[2]);
	msg.writeByte(to.forwardmove);
	msg.writeByte(to.rightmove);
	msg.writeByte(to.upmove);
	msg.writeUnsignedShort(to.buttons);
	msg.writeUnsignedByte(to.weapon);
}

function ReadDeltaUsercmd(msg, from, to) {
	to.serverTime = msg.readInt();

	to.angles[0] = msg.readUnsignedShort();
	to.angles[1] = msg.readUnsignedShort();
	to.angles[2] = msg.readUnsignedShort();
	to.forwardmove = msg.readByte();
	to.rightmove = msg.readByte();
	to.upmove = msg.readByte();
	to.buttons = msg.readUnsignedShort();
	to.weapon = msg.readUnsignedByte();
}

/**********************************************************
 *
 * Playerstate communication
 *
 **********************************************************/

var playerStateFields = [
	{ path: FTA('commandTime'),       bits: UINT32  },
	{ path: FTA('origin[0]'),         bits: FLOAT32 },
	{ path: FTA('origin[1]'),         bits: FLOAT32 },
	{ path: FTA('bobCycle'),          bits: UINT8   },
	{ path: FTA('velocity[0]'),       bits: FLOAT32 },
	{ path: FTA('velocity[1]'),       bits: FLOAT32 },
	{ path: FTA('viewangles[1]'),     bits: FLOAT32 },
	{ path: FTA('viewangles[0]'),     bits: FLOAT32 },
	{ path: FTA('weaponTime'),        bits: UINT16  },
	{ path: FTA('origin[2]'),         bits: FLOAT32 },
	{ path: FTA('velocity[2]'),       bits: FLOAT32 },
	{ path: FTA('legsTimer'),         bits: UINT8   },
	{ path: FTA('pm_time'),           bits: UINT16  },
	{ path: FTA('eventSequence'),     bits: UINT16  },
	{ path: FTA('torsoAnim'),         bits: UINT8   },
	{ path: FTA('movementDir'),       bits: UINT8   }, /*4*/
	{ path: FTA('events[0]'),         bits: UINT8   },
	{ path: FTA('legsAnim'),          bits: UINT8   },
	{ path: FTA('events[1]'),         bits: UINT8   },
	{ path: FTA('pm_flags'),          bits: UINT16  },
	{ path: FTA('groundEntityNum'),   bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: FTA('weaponState'),       bits: UINT8   }, /*4*/
	{ path: FTA('eFlags'),            bits: UINT16  },
	{ path: FTA('externalEvent'),     bits: UINT16  }, /*10*/
	{ path: FTA('gravity'),           bits: UINT16  },
	{ path: FTA('speed'),             bits: UINT16  },
	{ path: FTA('delta_angles[1]'),   bits: UINT16  },
	{ path: FTA('externalEventParm'), bits: UINT8   },
	{ path: FTA('viewheight'),        bits: UINT8   },
	{ path: FTA('damageEvent'),       bits: UINT8   },
	{ path: FTA('damageYaw'),         bits: UINT8   },
	{ path: FTA('damagePitch'),       bits: UINT8   },
	{ path: FTA('damageCount'),       bits: UINT8   },
	{ path: FTA('generic1'),          bits: UINT8   },
	{ path: FTA('pm_type'),           bits: UINT8   },
	{ path: FTA('delta_angles[0]'),   bits: UINT16  },
	{ path: FTA('delta_angles[2]'),   bits: UINT16  },
	{ path: FTA('torsoTimer'),        bits: UINT16  }, /*12*/
	{ path: FTA('eventParms[0]'),     bits: UINT8   },
	{ path: FTA('eventParms[1]'),     bits: UINT8   },
	{ path: FTA('clientNum'),         bits: UINT8   },
	{ path: FTA('weapon'),            bits: UINT8   }, /*5*/
	{ path: FTA('viewangles[2]'),     bits: FLOAT32 },
	// { path: FTA('grapplePoint[0]'),   bits: FLOAT32 },
	// { path: FTA('grapplePoint[1]'),   bits: FLOAT32 },
	// { path: FTA('grapplePoint[2]'),   bits: FLOAT32 },
	{ path: FTA('jumppad_ent'),       bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: FTA('loopSound'),         bits: UINT16  }
];

var dummyPlayerState = new QS.PlayerState();

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

	// Write out the arrays. First we write a bit mask
	// describing which arrays have changed, followed by
	// a mask for each array describing which of its
	// elements have changed.

	// Sanity check. Increase bitmask send length if changing
	// these maxes is necessary
	if (QS.MAX_STATS > 16 || QS.MAX_PERSISTANT > 16 || QS.MAX_POWERUPS > 16 || QS.MAX_WEAPONS > 16) {
		throw new Error('Array maxes exceed bitmask length');
	}

	var statsbits      = 0,
		persistantbits = 0,
		powerupsbits   = 0,
		ammobits       = 0;

	for (i = 0; i < QS.MAX_STATS; i++) {
		if (to.stats[i] !== from.stats[i]) {
			statsbits |= 1 << i;
		}
	}
	for (i = 0; i < QS.MAX_PERSISTANT; i++) {
		if (to.persistant[i] !== from.persistant[i]) {
			persistantbits |= 1 << i;
		}
	}
	for (i = 0; i < QS.MAX_POWERUPS; i++) {
		if (to.powerups[i] !== from.powerups[i]) {
			powerupsbits |= 1 << i;
		}
	}
	for (i = 0; i < QS.MAX_WEAPONS; i++) {
		if (to.ammo[i] !== from.ammo[i]) {
			ammobits |= 1 << i;
		}
	}

	// Write out a byte explaining which arrays changed.
	var arrbits = (statsbits ? 1 : 0) | (persistantbits ? 2 : 0) | (powerupsbits ? 4 : 0) | (ammobits ? 8 : 0);
	msg.writeByte(arrbits);

	if (statsbits) {
		msg.writeShort(statsbits);
		for (i = 0; i < QS.MAX_STATS; i++) {
			if (statsbits & (1 << i)) {
				msg.writeShort(to.stats[i]);
			}
		}
	}
	if (persistantbits) {
		msg.writeShort(persistantbits);
		for (i = 0; i < QS.MAX_PERSISTANT; i++) {
			if (persistantbits & (1 << i)) {
				msg.writeShort(to.persistant[i]);
			}
		}
	}
	if (powerupsbits) {
		msg.writeShort(powerupsbits);
		for (i = 0; i < QS.MAX_POWERUPS; i++) {
			if (powerupsbits & (1 << i)) {
				msg.writeShort(to.powerups[i]);
			}
		}
	}
	if (ammobits) {
		msg.writeShort(ammobits);
		for (i = 0; i < QS.MAX_WEAPONS; i++) {
			if (ammobits & (1 << i)) {
				msg.writeShort(to.ammo[i]);
			}
		}
	}
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

	var arrbits = msg.readByte();

	if (arrbits & 1) {
		var statsbits = msg.readShort();
		for (i = 0; i < QS.MAX_STATS; i++) {
			if (statsbits & (1 << i)) {
				to.stats[i] = msg.readShort();
			}
		}
	}
	if (arrbits & 2) {
		var persistantbits = msg.readShort();
		for (i = 0; i < QS.MAX_PERSISTANT; i++) {
			if (persistantbits & (1 << i)) {
				to.persistant[i] = msg.readShort();
			}
		}
	}

	if (arrbits & 4) {
		var powerupsbits = msg.readShort();
		for (i = 0; i < QS.MAX_POWERUPS; i++) {
			if (powerupsbits & (1 << i)) {
				to.powerups[i] = msg.readShort();
			}
		}
	}

	if (arrbits & 8) {
		var ammobits = msg.readShort();
		for (i = 0; i < QS.MAX_WEAPONS; i++) {
			if (ammobits & (1 << i)) {
				to.ammo[i] = msg.readShort();
			}
		}
	}
}

/**********************************************************
 *
 * Entitystate communication
 *
 **********************************************************/

var entityStateFields = [
	{ path: FTA('arenaNum'),        bits: UINT8   },
	{ path: FTA('pos.trTime'),      bits: UINT32  },
	{ path: FTA('pos.trBase[0]'),   bits: FLOAT32 },
	{ path: FTA('pos.trBase[1]'),   bits: FLOAT32 },
	{ path: FTA('pos.trDelta[0]'),  bits: FLOAT32 },
	{ path: FTA('pos.trDelta[1]'),  bits: FLOAT32 },
	{ path: FTA('pos.trBase[2]'),   bits: FLOAT32 },
	{ path: FTA('apos.trBase[1]'),  bits: FLOAT32 },
	{ path: FTA('pos.trDelta[2]'),  bits: FLOAT32 },
	{ path: FTA('apos.trBase[0]'),  bits: FLOAT32 },
	{ path: FTA('event'),           bits: UINT16  }, /*10*/
	{ path: FTA('angles2[1]'),      bits: FLOAT32 },
	{ path: FTA('eType'),           bits: UINT8   },
	{ path: FTA('torsoAnim'),       bits: UINT8   },
	{ path: FTA('eventParm'),       bits: UINT8   },
	{ path: FTA('legsAnim'),        bits: UINT8   },
	{ path: FTA('groundEntityNum'), bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: FTA('pos.trType'),      bits: UINT8   },
	{ path: FTA('eFlags'),          bits: UINT32  }, /*19*/
	{ path: FTA('otherEntityNum'),  bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: FTA('weapon'),          bits: UINT8   },
	{ path: FTA('clientNum'),       bits: UINT8   },
	{ path: FTA('angles[1]'),       bits: FLOAT32 },
	{ path: FTA('pos.trDuration'),  bits: UINT32  },
	{ path: FTA('apos.trType'),     bits: UINT8   },
	{ path: FTA('origin[0]'),       bits: FLOAT32 },
	{ path: FTA('origin[1]'),       bits: FLOAT32 },
	{ path: FTA('origin[2]'),       bits: FLOAT32 },
	{ path: FTA('solid'),           bits: UINT32  }, /*24*/
	{ path: FTA('powerups'),        bits: UINT16  }, /*QS.MAX_POWERUPS*/
	{ path: FTA('modelIndex'),      bits: UINT8   },
	{ path: FTA('otherEntityNum2'), bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: FTA('loopSound'),       bits: UINT8   },
	{ path: FTA('generic1'),        bits: UINT8   },
	{ path: FTA('origin2[2]'),      bits: FLOAT32 },
	{ path: FTA('origin2[0]'),      bits: FLOAT32 },
	{ path: FTA('origin2[1]'),      bits: FLOAT32 },
	{ path: FTA('modelIndex2'),     bits: UINT8   },
	{ path: FTA('angles[0]'),       bits: FLOAT32 },
	{ path: FTA('time'),            bits: UINT32  },
	{ path: FTA('apos.trTime'),     bits: UINT32  },
	{ path: FTA('apos.trDuration'), bits: UINT32  },
	{ path: FTA('apos.trBase[2]'),  bits: FLOAT32 },
	{ path: FTA('apos.trDelta[0]'), bits: FLOAT32 },
	{ path: FTA('apos.trDelta[1]'), bits: FLOAT32 },
	{ path: FTA('apos.trDelta[2]'), bits: FLOAT32 },
	{ path: FTA('time2'),           bits: UINT32  },
	{ path: FTA('angles[2]'),       bits: FLOAT32 },
	{ path: FTA('angles2[0]'),      bits: FLOAT32 },
	{ path: FTA('angles2[2]'),      bits: FLOAT32 },
	{ path: FTA('constantLight'),   bits: UINT32  },
	{ path: FTA('frame'),           bits: UINT16  }
];

/**
 * WriteDeltaEntityState
 *
 * Writes part of a packetentities message, including the entity number.
 * Can delta from either a baseline or a previous packet_entity.
 * If to is NULL, a remove entity update will be sent.
 * If force is not set, then nothing at all will be generated if the entity is
 * identical, under the assumption that the in-order delta code will catch it.
 */
function WriteDeltaEntityState(msg, from, to, force) {
	var i, changed;
	var field, fromF, toF, func;

	// A null to is a delta remove message.
	if (to === null) {
		if (from === null) {
			return;
		}
		msg.writeShort(from.number);  /* GENTITYNUM_BITS */
		msg.writeByte(0 | 1);  // removed | no delta
		return;
	}

	// Sanity check.
	if (to.number < 0 || to.number >= QS.MAX_GENTITIES) {
		throw new Error('WriteDeltaEntityState: Bad entity number: ', to.number);
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

	if (changed === 0) {
		// Nothing at all changed.
		if (!force) {
			return;  // write nothing
		}

		msg.writeShort(to.number);  /* GENTITYNUM_BITS */
		msg.writeByte(0);  // not removed | no delta
		return;
	}

	msg.writeShort(to.number); /* GENTITYNUM_BITS */
	msg.writeByte(0 | 2);  // not removed | we have a delta
	msg.writeByte(changed); // number of fields changed

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
 *
 * The entity number has already been read from the message, which
 * is how the from state is identified.
 *
 * If the delta removes the entity, entityState.number will be set to QS.MAX_GENTITIES-1.
 *
 * Can go from either a baseline or a previous packet entity.
 */
function ReadDeltaEntityState(msg, from, to, number) {
	var i, changed;
	var idx, field, fromF, toF, func;

	if (number < 0 || number >= QS.MAX_GENTITIES) {
		throw new Error('Bad delta entity number: ', number);
	}

	var opmask = msg.readByte();
	var remove = opmask & 1;
	var delta = opmask & 2;

	// Check for a remove
	if (remove) {
		to.reset();
		to.number = QS.MAX_GENTITIES - 1;
		return;
	}

	// Clone the initial state.
	from.clone(to);
	to.number = number;

	// Check for no delta.
	if (!delta) {
		return;
	}

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
