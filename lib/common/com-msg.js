//
// Helper functions to get/set object properties based on a string.
//
var FLOAT32 = 0;
var INT8    = 1;
var UINT8   = 2;
var UINT16  = 3;
var UINT32  = 4;

function fnread(bits) {
	switch (bits) {
		case FLOAT32:
			return 'readFloat32';
		case INT8:
			return 'readInt8';
		case UINT8:
			return 'readUint8';
		case UINT16:
			return 'readUint16';
		case UINT32:
			return 'readUint32';
		default:
			throw new Error('fnread: bad bit count ' + bits);
	}
}

function fnwrite(bits) {
	switch (bits) {
		case FLOAT32:
			return 'writeFloat32';
		case INT8:
			return 'writeInt8';
		case UINT8:
			return 'writeUint8';
		case UINT16:
			return 'writeUint16';
		case UINT32:
			return 'writeUint32';
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
	{ path: QS.FTA('angles[0]'),   bits: UINT16 },
	{ path: QS.FTA('angles[1]'),   bits: UINT16 },
	{ path: QS.FTA('angles[2]'),   bits: UINT16 },
	{ path: QS.FTA('forwardmove'), bits: UINT8  },
	{ path: QS.FTA('rightmove'),   bits: UINT8  },
	{ path: QS.FTA('upmove'),      bits: UINT8  },
	{ path: QS.FTA('buttons'),     bits: UINT16 },
	{ path: QS.FTA('weapon'),      bits: UINT8  }
];

function WriteDeltaUsercmd(msg, from, to) {
	if (!from) {
		from = dummyUsercmd;
	}

	msg.writeInt32(to.serverTime);

	// if (from.angles[0] === to.angles[0] &&
	// 	from.angles[1] === to.angles[1] &&
	// 	from.angles[2] === to.angles[2] &&
	// 	from.forwardmove === to.forwardmove &&
	// 	from.rightmove === to.rightmove &&
	// 	from.upmove === to.upmove &&
	// 	from.buttons === to.buttons &&
	// 	from.weapon === to.weapon) {
	// 		msg.writeInt8(0);  // no change
	// 		return;
	// }

	// msg.writeInt8(1);  // changed

	msg.writeUint16(to.angles[0]);
	msg.writeUint16(to.angles[1]);
	msg.writeUint16(to.angles[2]);
	msg.writeInt8(to.forwardmove);
	msg.writeInt8(to.rightmove);
	msg.writeInt8(to.upmove);
	msg.writeUint16(to.buttons);
	msg.writeUint8(to.weapon);
}

function ReadDeltaUsercmd(msg, from, to) {
	to.serverTime = msg.readInt32();

	to.angles[0] = msg.readUint16();
	to.angles[1] = msg.readUint16();
	to.angles[2] = msg.readUint16();
	to.forwardmove = msg.readInt8();
	to.rightmove = msg.readInt8();
	to.upmove = msg.readInt8();
	to.buttons = msg.readUint16();
	to.weapon = msg.readUint8();
}

/**********************************************************
 *
 * Playerstate communication
 *
 **********************************************************/

var playerStateFields = [
	{ path: QS.FTA('commandTime'),       bits: UINT32  },
	{ path: QS.FTA('origin[0]'),         bits: FLOAT32 },
	{ path: QS.FTA('origin[1]'),         bits: FLOAT32 },
	{ path: QS.FTA('bobCycle'),          bits: UINT8   },
	{ path: QS.FTA('velocity[0]'),       bits: FLOAT32 },
	{ path: QS.FTA('velocity[1]'),       bits: FLOAT32 },
	{ path: QS.FTA('viewangles[1]'),     bits: FLOAT32 },
	{ path: QS.FTA('viewangles[0]'),     bits: FLOAT32 },
	{ path: QS.FTA('weaponTime'),        bits: UINT16  },
	{ path: QS.FTA('origin[2]'),         bits: FLOAT32 },
	{ path: QS.FTA('velocity[2]'),       bits: FLOAT32 },
	{ path: QS.FTA('legsTimer'),         bits: UINT8   },
	{ path: QS.FTA('pm_time'),           bits: UINT16  },
	{ path: QS.FTA('eventSequence'),     bits: UINT16  },
	{ path: QS.FTA('torsoAnim'),         bits: UINT8   },
	{ path: QS.FTA('movementDir'),       bits: UINT8   }, /*4*/
	{ path: QS.FTA('events[0]'),         bits: UINT8   },
	{ path: QS.FTA('legsAnim'),          bits: UINT8   },
	{ path: QS.FTA('events[1]'),         bits: UINT8   },
	{ path: QS.FTA('pm_flags'),          bits: UINT16  },
	{ path: QS.FTA('groundEntityNum'),   bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: QS.FTA('weaponState'),       bits: UINT8   }, /*4*/
	{ path: QS.FTA('eFlags'),            bits: UINT16  },
	{ path: QS.FTA('externalEvent'),     bits: UINT16  }, /*10*/
	{ path: QS.FTA('gravity'),           bits: UINT16  },
	{ path: QS.FTA('speed'),             bits: UINT16  },
	{ path: QS.FTA('delta_angles[1]'),   bits: UINT16  },
	{ path: QS.FTA('externalEventParm'), bits: UINT8   },
	{ path: QS.FTA('viewheight'),        bits: UINT8   },
	{ path: QS.FTA('damageEvent'),       bits: UINT8   },
	{ path: QS.FTA('damageYaw'),         bits: UINT8   },
	{ path: QS.FTA('damagePitch'),       bits: UINT8   },
	{ path: QS.FTA('damageCount'),       bits: UINT8   },
	{ path: QS.FTA('generic1'),          bits: UINT8   },
	{ path: QS.FTA('pm_type'),           bits: UINT8   },
	{ path: QS.FTA('delta_angles[0]'),   bits: UINT16  },
	{ path: QS.FTA('delta_angles[2]'),   bits: UINT16  },
	{ path: QS.FTA('torsoTimer'),        bits: UINT16  }, /*12*/
	{ path: QS.FTA('eventParms[0]'),     bits: UINT8   },
	{ path: QS.FTA('eventParms[1]'),     bits: UINT8   },
	{ path: QS.FTA('clientNum'),         bits: UINT8   },
	{ path: QS.FTA('arenaNum'),          bits: UINT16  },
	{ path: QS.FTA('weapon'),            bits: UINT8   }, /*5*/
	{ path: QS.FTA('viewangles[2]'),     bits: FLOAT32 },
	// { path: QS.FTA('grapplePoint[0]'),   bits: FLOAT32 },
	// { path: QS.FTA('grapplePoint[1]'),   bits: FLOAT32 },
	// { path: QS.FTA('grapplePoint[2]'),   bits: FLOAT32 },
	{ path: QS.FTA('jumppad_ent'),       bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: QS.FTA('loopSound'),         bits: UINT16  }
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

		fromF = QS.AGET(from, field.path);
		toF = QS.AGET(to, field.path);

		if (fromF !== toF) {
			changed++;
		}
	}

	msg.writeInt8(changed);

	// Write out each field that has changed, prefixing
	// the changed field with its indexed into the ps
	// field array.
	for (i = 0; i < playerStateFields.length; i++) {
		field = playerStateFields[i];

		fromF = QS.AGET(from, field.path);
		toF = QS.AGET(to, field.path);
		if (fromF === toF) {
			continue;
		}

		func = fnwrite(field.bits);

		// TODO Could write out a master bitmask describing
		// the changed fields.
		msg.writeInt8(i);
		msg[func](QS.AGET(to, field.path));
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
	msg.writeInt8(arrbits);

	if (statsbits) {
		msg.writeInt16(statsbits);
		for (i = 0; i < QS.MAX_STATS; i++) {
			if (statsbits & (1 << i)) {
				msg.writeInt16(to.stats[i]);
			}
		}
	}
	if (persistantbits) {
		msg.writeInt16(persistantbits);
		for (i = 0; i < QS.MAX_PERSISTANT; i++) {
			if (persistantbits & (1 << i)) {
				msg.writeInt16(to.persistant[i]);
			}
		}
	}
	if (powerupsbits) {
		msg.writeInt16(powerupsbits);
		for (i = 0; i < QS.MAX_POWERUPS; i++) {
			if (powerupsbits & (1 << i)) {
				msg.writeInt16(to.powerups[i]);
			}
		}
	}
	if (ammobits) {
		msg.writeInt16(ammobits);
		for (i = 0; i < QS.MAX_WEAPONS; i++) {
			if (ammobits & (1 << i)) {
				msg.writeInt16(to.ammo[i]);
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
	changed = msg.readInt8();

	// Read all the changed fields.
	for (i = 0; i < changed; i++) {
		idx = msg.readInt8();
		field = playerStateFields[idx];
		func = fnread(field.bits);

		QS.ASET(to, field.path, msg[func]());
	}

	var arrbits = msg.readInt8();

	if (arrbits & 1) {
		var statsbits = msg.readInt16();
		for (i = 0; i < QS.MAX_STATS; i++) {
			if (statsbits & (1 << i)) {
				to.stats[i] = msg.readInt16();
			}
		}
	}
	if (arrbits & 2) {
		var persistantbits = msg.readInt16();
		for (i = 0; i < QS.MAX_PERSISTANT; i++) {
			if (persistantbits & (1 << i)) {
				to.persistant[i] = msg.readInt16();
			}
		}
	}

	if (arrbits & 4) {
		var powerupsbits = msg.readInt16();
		for (i = 0; i < QS.MAX_POWERUPS; i++) {
			if (powerupsbits & (1 << i)) {
				to.powerups[i] = msg.readInt16();
			}
		}
	}

	if (arrbits & 8) {
		var ammobits = msg.readInt16();
		for (i = 0; i < QS.MAX_WEAPONS; i++) {
			if (ammobits & (1 << i)) {
				to.ammo[i] = msg.readInt16();
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
	{ path: QS.FTA('arenaNum'),        bits: UINT16  },
	{ path: QS.FTA('pos.trTime'),      bits: UINT32  },
	{ path: QS.FTA('pos.trBase[0]'),   bits: FLOAT32 },
	{ path: QS.FTA('pos.trBase[1]'),   bits: FLOAT32 },
	{ path: QS.FTA('pos.trDelta[0]'),  bits: FLOAT32 },
	{ path: QS.FTA('pos.trDelta[1]'),  bits: FLOAT32 },
	{ path: QS.FTA('pos.trBase[2]'),   bits: FLOAT32 },
	{ path: QS.FTA('apos.trBase[1]'),  bits: FLOAT32 },
	{ path: QS.FTA('pos.trDelta[2]'),  bits: FLOAT32 },
	{ path: QS.FTA('apos.trBase[0]'),  bits: FLOAT32 },
	{ path: QS.FTA('event'),           bits: UINT16  }, /*10*/
	{ path: QS.FTA('angles2[1]'),      bits: FLOAT32 },
	{ path: QS.FTA('eType'),           bits: UINT8   },
	{ path: QS.FTA('torsoAnim'),       bits: UINT8   },
	{ path: QS.FTA('eventParm'),       bits: UINT8   },
	{ path: QS.FTA('legsAnim'),        bits: UINT8   },
	{ path: QS.FTA('groundEntityNum'), bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: QS.FTA('pos.trType'),      bits: UINT8   },
	{ path: QS.FTA('eFlags'),          bits: UINT32  }, /*19*/
	{ path: QS.FTA('otherEntityNum'),  bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: QS.FTA('weapon'),          bits: UINT8   },
	{ path: QS.FTA('clientNum'),       bits: UINT8   },
	{ path: QS.FTA('angles[1]'),       bits: FLOAT32 },
	{ path: QS.FTA('pos.trDuration'),  bits: UINT32  },
	{ path: QS.FTA('apos.trType'),     bits: UINT8   },
	{ path: QS.FTA('origin[0]'),       bits: FLOAT32 },
	{ path: QS.FTA('origin[1]'),       bits: FLOAT32 },
	{ path: QS.FTA('origin[2]'),       bits: FLOAT32 },
	{ path: QS.FTA('solid'),           bits: UINT32  }, /*24*/
	{ path: QS.FTA('powerups'),        bits: UINT16  }, /*QS.MAX_POWERUPS*/
	{ path: QS.FTA('modelIndex'),      bits: UINT8   },
	{ path: QS.FTA('otherEntityNum2'), bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: QS.FTA('loopSound'),       bits: UINT8   },
	{ path: QS.FTA('generic1'),        bits: UINT8   },
	{ path: QS.FTA('origin2[2]'),      bits: FLOAT32 },
	{ path: QS.FTA('origin2[0]'),      bits: FLOAT32 },
	{ path: QS.FTA('origin2[1]'),      bits: FLOAT32 },
	{ path: QS.FTA('modelIndex2'),     bits: UINT8   },
	{ path: QS.FTA('angles[0]'),       bits: FLOAT32 },
	{ path: QS.FTA('time'),            bits: UINT32  },
	{ path: QS.FTA('apos.trTime'),     bits: UINT32  },
	{ path: QS.FTA('apos.trDuration'), bits: UINT32  },
	{ path: QS.FTA('apos.trBase[2]'),  bits: FLOAT32 },
	{ path: QS.FTA('apos.trDelta[0]'), bits: FLOAT32 },
	{ path: QS.FTA('apos.trDelta[1]'), bits: FLOAT32 },
	{ path: QS.FTA('apos.trDelta[2]'), bits: FLOAT32 },
	{ path: QS.FTA('time2'),           bits: UINT32  },
	{ path: QS.FTA('angles[2]'),       bits: FLOAT32 },
	{ path: QS.FTA('angles2[0]'),      bits: FLOAT32 },
	{ path: QS.FTA('angles2[2]'),      bits: FLOAT32 },
	{ path: QS.FTA('constantLight'),   bits: UINT32  },
	{ path: QS.FTA('frame'),           bits: UINT16  }
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
		msg.writeInt16(from.number);  /* GENTITYNUM_BITS */
		msg.writeInt8(0 | 1);  // removed | no delta
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

		fromF = QS.AGET(from, field.path);
		toF = QS.AGET(to, field.path);

		if (fromF !== toF) {
			changed++;
		}
	}

	if (changed === 0) {
		// Nothing at all changed.
		if (!force) {
			return;  // write nothing
		}

		msg.writeInt16(to.number);  /* GENTITYNUM_BITS */
		msg.writeInt8(0);  // not removed | no delta
		return;
	}

	msg.writeInt16(to.number); /* GENTITYNUM_BITS */
	msg.writeInt8(0 | 2);  // not removed | we have a delta
	msg.writeInt8(changed); // number of fields changed

	// Write out each field that has changed, prefixing
	// the changed field with its indexed into the ps
	// field array.
	for (i = 0; i < entityStateFields.length; i++) {
		field = entityStateFields[i];

		fromF = QS.AGET(from, field.path);
		toF = QS.AGET(to, field.path);
		if (fromF === toF) {
			continue;
		}

		func = fnwrite(field.bits);

		msg.writeInt8(i);
		msg[func](QS.AGET(to, field.path));
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

	var opmask = msg.readInt8();
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
	changed = msg.readInt8();

	// Read all the changed fields.
	for (i = 0; i < changed; i++) {
		idx = msg.readInt8();
		field = entityStateFields[idx];
		func = fnread(field.bits);

		QS.ASET(to, field.path, msg[func]());
	}
}
