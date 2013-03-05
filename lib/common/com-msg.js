//
// Helper functions to get/set object properties based on a string.
//
var FLOAT64 = 0;
var INT8    = 1;
var UINT8   = 2;
var UINT16  = 3;
var UINT32  = 4;

function fnread(bits) {
	switch (bits) {
		case FLOAT64:
			return 'readFloat64';
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
		case FLOAT64:
			return 'writeFloat64';
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

// var kbitmask = [
// 	0x00000001, 0x00000003, 0x00000007, 0x0000000F,
// 	0x0000001F, 0x0000003F, 0x0000007F, 0x000000FF,
// 	0x000001FF, 0x000003FF, 0x000007FF, 0x00000FFF,
// 	0x00001FFF, 0x00003FFF, 0x00007FFF, 0x0000FFFF,
// 	0x0001FFFF, 0x0003FFFF, 0x0007FFFF, 0x000FFFFF,
// 	0x001FFFFf, 0x003FFFFF, 0x007FFFFF, 0x00FFFFFF,
// 	0x01FFFFFF, 0x03FFFFFF, 0x07FFFFFF, 0x0FFFFFFF,
// 	0x1FFFFFFF, 0x3FFFFFFF, 0x7FFFFFFF, 0xFFFFFFFF
// ];

function WriteDeltaKey(msg, key, oldV, newV, bits) {
	if (oldV === newV) {
		msg.writeBits(0, 1);
		return;
	}
	msg.writeBits(1, 1);
	msg.writeBits(newV/* ^ key*/, bits);
}

function ReadDeltaKey(msg, key, oldV, bits) {
	if (msg.readBits(1)) {
		// Negative bits are signed.
		return msg.readBits(Math.abs(bits), (bits < 0))/* ^ (key & kbitmask[bits])*/;
	}
	return oldV;
}

function WriteDeltaUsercmd(msg, from, to) {
	if (!from) {
		from = dummyUsercmd;
	}

	if (to.serverTime - from.serverTime < 256) {
		msg.writeBits(1, 1);
		msg.writeBits(to.serverTime - from.serverTime, 8);
	} else {
		msg.writeBits(0, 1);
		msg.writeBits(to.serverTime, 32);
	}

	if (from.angles[0] === to.angles[0] &&
		from.angles[1] === to.angles[1] &&
		from.angles[2] === to.angles[2] &&
		from.forwardmove === to.forwardmove &&
		from.rightmove === to.rightmove &&
		from.upmove === to.upmove &&
		from.buttons === to.buttons &&
		from.weapon === to.weapon) {
			msg.writeBits(0, 1);  // no change
			return;
	}

	// key ^= to.serverTime;

	msg.writeBits(1, 1);  // change

	WriteDeltaKey(msg, 0/*key*/, from.angles[0], to.angles[0], 16);
	WriteDeltaKey(msg, 0/*key*/, from.angles[1], to.angles[1], 16);
	WriteDeltaKey(msg, 0/*key*/, from.angles[2], to.angles[2], 16);
	WriteDeltaKey(msg, 0/*key*/, from.forwardmove, to.forwardmove, 8);
	WriteDeltaKey(msg, 0/*key*/, from.rightmove, to.rightmove, 8);
	WriteDeltaKey(msg, 0/*key*/, from.upmove, to.upmove, 8);
	WriteDeltaKey(msg, 0/*key*/, from.buttons, to.buttons, 16);
	WriteDeltaKey(msg, 0/*key*/, from.weapon, to.weapon, 8);
}

function ReadDeltaUsercmd(msg, from, to) {
	if (!from) {
		from = dummyUsercmd;
	}

	if (msg.readBits(1)) {
		to.serverTime = from.serverTime + msg.readBits(8);
	} else {
		to.serverTime = msg.readBits(32);
	}

	if (msg.readBits(1)) {
		// key ^= to.serverTime;
		to.angles[0] = ReadDeltaKey(msg, 0/*key*/, from.angles[0], 16);
		to.angles[1] = ReadDeltaKey(msg, 0/*key*/, from.angles[1], 16);
		to.angles[2] = ReadDeltaKey(msg, 0/*key*/, from.angles[2], 16);
		to.forwardmove = ReadDeltaKey(msg, 0/*key*/, from.forwardmove, -8);
		to.rightmove = ReadDeltaKey(msg, 0/*key*/, from.rightmove, -8);
		to.upmove = ReadDeltaKey(msg, 0/*key*/, from.upmove, -8);
		to.buttons = ReadDeltaKey(msg, 0/*key*/, from.buttons, 16);
		to.weapon = ReadDeltaKey(msg, 0/*key*/, from.weapon, 8);
	} else {
		to.angles[0] = from.angles[0];
		to.angles[1] = from.angles[1];
		to.angles[2] = from.angles[2];
		to.forwardmove = from.forwardmove;
		to.rightmove = from.rightmove;
		to.upmove = from.upmove;
		to.buttons = from.buttons;
		to.weapon = from.weapon;
	}
}

/**********************************************************
 *
 * Playerstate communication
 *
 **********************************************************/

var playerStateFields = [
	{ path: QS.FTA('commandTime'),       bits: UINT32  },
	{ path: QS.FTA('origin[0]'),         bits: FLOAT64 },
	{ path: QS.FTA('origin[1]'),         bits: FLOAT64 },
	{ path: QS.FTA('bobCycle'),          bits: UINT8   },
	{ path: QS.FTA('velocity[0]'),       bits: FLOAT64 },
	{ path: QS.FTA('velocity[1]'),       bits: FLOAT64 },
	{ path: QS.FTA('viewangles[1]'),     bits: FLOAT64 },
	{ path: QS.FTA('viewangles[0]'),     bits: FLOAT64 },
	{ path: QS.FTA('weaponTime'),        bits: UINT16  },
	{ path: QS.FTA('origin[2]'),         bits: FLOAT64 },
	{ path: QS.FTA('velocity[2]'),       bits: FLOAT64 },
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
	{ path: QS.FTA('weapon'),            bits: UINT8   }, /*5*/
	{ path: QS.FTA('viewangles[2]'),     bits: FLOAT64 },
	// { path: QS.FTA('grapplePoint[0]'),   bits: FLOAT64 },
	// { path: QS.FTA('grapplePoint[1]'),   bits: FLOAT64 },
	// { path: QS.FTA('grapplePoint[2]'),   bits: FLOAT64 },
	{ path: QS.FTA('jumppad_ent'),       bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: QS.FTA('loopSound'),         bits: UINT16  },
	{ path: QS.FTA('arenaNum'),          bits: UINT16  }
];

var dummyPlayerState = new QS.PlayerState();

/**
 * WriteDeltaPlayerState
 */
function WriteDeltaPlayerState(msg, from, to) {
	var i, lastChanged;
	var field, fromF, toF, func;

	if (!from) {
		from = dummyPlayerState;
	}

	// Figure out the last changed field.
	lastChanged = 0;
	for (i = 0; i < playerStateFields.length; i++) {
		field = playerStateFields[i];

		fromF = QS.AGET(from, field.path);
		toF = QS.AGET(to, field.path);

		if (fromF !== toF) {
			lastChanged = i + 1;
		}
	}

	msg.writeUint8(lastChanged);

	// Write out up to last changed, prefixing each field with a
	// 0 or 1 to indicated if they've changed.
	for (i = 0; i < lastChanged; i++) {
		field = playerStateFields[i];

		fromF = QS.AGET(from, field.path);
		toF = QS.AGET(to, field.path);
		if (fromF === toF) {
			msg.writeBits(0, 1);  // no change
			continue;
		}

		msg.writeBits(1, 1);  // changed

		func = fnwrite(field.bits);

		msg[func](QS.AGET(to, field.path));
	}

	// Write out a 0 or 1 before each array indicating if
	// it's changed as well asa mask for each array describing
	// which of its elements have changed.
	var statsbits      = 0,
		persistantbits = 0,
		powerupbits    = 0,
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
			powerupbits |= 1 << i;
		}
	}
	for (i = 0; i < QS.MAX_WEAPONS; i++) {
		if (to.ammo[i] !== from.ammo[i]) {
			ammobits |= 1 << i;
		}
	}

	if (!statsbits && !persistantbits && !powerupbits && !ammobits) {
		msg.writeBits(0, 1);  // no change
		return;
	}

	msg.writeBits(1, 1);  // changed

	if (statsbits) {
		msg.writeBits(1, 1);  // change
		msg.writeBits(statsbits, QS.MAX_STATS);
		for (i = 0; i < QS.MAX_STATS; i++) {
			if (statsbits & (1 << i)) {
				msg.writeInt16(to.stats[i]);
			}
		}
	} else {
		msg.writeBits(0, 1);  // no change
	}

	if (persistantbits) {
		msg.writeBits(1, 1);  // change
		msg.writeBits(persistantbits, QS.MAX_PERSISTANT);
		for (i = 0; i < QS.MAX_PERSISTANT; i++) {
			if (persistantbits & (1 << i)) {
				msg.writeInt16(to.persistant[i]);
			}
		}
	} else {
		msg.writeBits(0, 1);  // no change
	}

	if (powerupbits) {
		msg.writeBits(1, 1);  // change
		msg.writeBits(powerupbits, QS.MAX_POWERUPS);
		for (i = 0; i < QS.MAX_POWERUPS; i++) {
			if (powerupbits & (1 << i)) {
				msg.writeInt16(to.powerups[i]);
			}
		}
	} else {
		msg.writeBits(0, 1);  // no change
	}

	if (ammobits) {
		msg.writeBits(1, 1);  // change
		msg.writeBits(ammobits, QS.MAX_WEAPONS);
		for (i = 0; i < QS.MAX_WEAPONS; i++) {
			if (ammobits & (1 << i)) {
				msg.writeInt16(to.ammo[i]);
			}
		}
	} else {
		msg.writeBits(0, 1);  // no change
	}
}

function ReadDeltaPlayerState(msg, from, to) {
	var i, lastChanged;
	var idx, field, fromF, toF, func;

	if (!from) {
		from = dummyPlayerState;
	}

	// Clone the initial state.
	from.clone(to);

	// Get the last field index changed.
	lastChanged = msg.readUint8();

	if (lastChanged > playerStateFields.length || lastChanged < 0) {
		error('invalid playerState field count');
	}

	for (i = 0; i < lastChanged; i++) {
		if (!msg.readBits(1)) {
			continue;  // no change
		}

		field = playerStateFields[i];
		func = fnread(field.bits);
		QS.ASET(to, field.path, msg[func]());
	}

	if (msg.readBits(1)) {
		if (msg.readBits(1)) {
			var statsbits = msg.readBits(QS.MAX_STATS);
			for (i = 0; i < QS.MAX_STATS; i++) {
				if (statsbits & (1 << i)) {
					to.stats[i] = msg.readInt16();
				}
			}
		}

		if (msg.readBits(1)) {
			var persistantbits = msg.readBits(QS.MAX_PERSISTANT);
			for (i = 0; i < QS.MAX_PERSISTANT; i++) {
				if (persistantbits & (1 << i)) {
					to.persistant[i] = msg.readInt16();
				}
			}
		}

		if (msg.readBits(1)) {
			var powerupbits = msg.readBits(QS.MAX_POWERUPS);
			for (i = 0; i < QS.MAX_POWERUPS; i++) {
				if (powerupbits & (1 << i)) {
					to.powerups[i] = msg.readInt16();
				}
			}
		}

		if (msg.readBits(1)) {
			var ammobits = msg.readBits(QS.MAX_WEAPONS);
			for (i = 0; i < QS.MAX_WEAPONS; i++) {
				if (ammobits & (1 << i)) {
					to.ammo[i] = msg.readInt16();
				}
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
	{ path: QS.FTA('pos.trBase[0]'),   bits: FLOAT64 },
	{ path: QS.FTA('pos.trBase[1]'),   bits: FLOAT64 },
	{ path: QS.FTA('pos.trDelta[0]'),  bits: FLOAT64 },
	{ path: QS.FTA('pos.trDelta[1]'),  bits: FLOAT64 },
	{ path: QS.FTA('pos.trBase[2]'),   bits: FLOAT64 },
	{ path: QS.FTA('apos.trBase[1]'),  bits: FLOAT64 },
	{ path: QS.FTA('pos.trDelta[2]'),  bits: FLOAT64 },
	{ path: QS.FTA('apos.trBase[0]'),  bits: FLOAT64 },
	{ path: QS.FTA('event'),           bits: UINT16  }, /*10*/
	{ path: QS.FTA('angles2[1]'),      bits: FLOAT64 },
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
	{ path: QS.FTA('angles[1]'),       bits: FLOAT64 },
	{ path: QS.FTA('pos.trDuration'),  bits: UINT32  },
	{ path: QS.FTA('apos.trType'),     bits: UINT8   },
	{ path: QS.FTA('origin[0]'),       bits: FLOAT64 },
	{ path: QS.FTA('origin[1]'),       bits: FLOAT64 },
	{ path: QS.FTA('origin[2]'),       bits: FLOAT64 },
	{ path: QS.FTA('solid'),           bits: UINT32  }, /*24*/
	{ path: QS.FTA('powerups'),        bits: UINT16  }, /*QS.MAX_POWERUPS*/
	{ path: QS.FTA('modelIndex'),      bits: UINT8   },
	{ path: QS.FTA('otherEntityNum2'), bits: UINT16  }, /*GENTITYNUM_BITS*/
	{ path: QS.FTA('loopSound'),       bits: UINT8   },
	{ path: QS.FTA('generic1'),        bits: UINT8   },
	{ path: QS.FTA('origin2[2]'),      bits: FLOAT64 },
	{ path: QS.FTA('origin2[0]'),      bits: FLOAT64 },
	{ path: QS.FTA('origin2[1]'),      bits: FLOAT64 },
	{ path: QS.FTA('modelIndex2'),     bits: UINT8   },
	{ path: QS.FTA('angles[0]'),       bits: FLOAT64 },
	{ path: QS.FTA('time'),            bits: UINT32  },
	{ path: QS.FTA('apos.trTime'),     bits: UINT32  },
	{ path: QS.FTA('apos.trDuration'), bits: UINT32  },
	{ path: QS.FTA('apos.trBase[2]'),  bits: FLOAT64 },
	{ path: QS.FTA('apos.trDelta[0]'), bits: FLOAT64 },
	{ path: QS.FTA('apos.trDelta[1]'), bits: FLOAT64 },
	{ path: QS.FTA('apos.trDelta[2]'), bits: FLOAT64 },
	{ path: QS.FTA('time2'),           bits: UINT32  },
	{ path: QS.FTA('angles[2]'),       bits: FLOAT64 },
	{ path: QS.FTA('angles2[0]'),      bits: FLOAT64 },
	{ path: QS.FTA('angles2[2]'),      bits: FLOAT64 },
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
	var i, lastChanged;
	var field, fromF, toF, func;

	// A null to is a delta remove message.
	if (to === null) {
		if (from === null) {
			return;
		}
		msg.writeInt16(from.number);  /* GENTITYNUM_BITS */
		msg.writeBits(1, 1);
		return;
	}

	// Sanity check.
	if (to.number < 0 || to.number >= QS.MAX_GENTITIES) {
		throw new Error('WriteDeltaEntityState: Bad entity number: ', to.number);
	}

	// Figure out the number of fields that have changed.
	lastChanged = 0;
	for (i = 0; i < entityStateFields.length; i++) {
		field = entityStateFields[i];

		fromF = QS.AGET(from, field.path);
		toF = QS.AGET(to, field.path);

		if (fromF !== toF) {
			lastChanged = i + 1;
		}
	}

	if (lastChanged === 0) {
		// Nothing at all changed.
		if (!force) {
			return;  // write nothing
		}

		msg.writeInt16(to.number);  /* GENTITYNUM_BITS */
		msg.writeBits(0, 1);  // not removed
		msg.writeBits(0, 1);  // no delta
		return;
	}

	msg.writeInt16(to.number); /* GENTITYNUM_BITS */
	msg.writeBits(0, 1);  // not removed
	msg.writeBits(1, 1);  // we have a delta
	msg.writeInt8(lastChanged); // number of fields changed

	// Write out each field that has changed, prefixing
	// the field with a 0 or 1 denoting if it's changed.
	for (i = 0; i < lastChanged; i++) {
		field = entityStateFields[i];

		fromF = QS.AGET(from, field.path);
		toF = QS.AGET(to, field.path);
		if (fromF === toF) {
			msg.writeBits(0, 1);  // no change
			continue;
		}

		msg.writeBits(1, 1);  // no change

		func = fnwrite(field.bits);

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
	var i, lastChanged;
	var idx, field, fromF, toF, func;

	if (number < 0 || number >= QS.MAX_GENTITIES) {
		throw new Error('Bad delta entity number: ', number);
	}

	// Check for a remove.
	if (msg.readBits(1)) {
		to.reset();
		to.number = QS.MAX_GENTITIES - 1;
		return;
	}

	// Clone the initial state.
	from.clone(to);
	to.number = number;

	// Check for no delta.
	if (!msg.readBits(1)) {
		return;
	}

	// Get the last changed field index.
	lastChanged = msg.readInt8();

	// Read all the changed fields.
	for (i = 0; i < lastChanged; i++) {
		if (!msg.readBits(1)) {
			continue;  // not changed
		}

		field = entityStateFields[i];
		func = fnread(field.bits);

		QS.ASET(to, field.path, msg[func]());
	}
}
