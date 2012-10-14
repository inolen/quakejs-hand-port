// Static item descriptions.
var itemList = {
	'item_armor_shard': new GameItemDesc('item_armor_shard', ItemType.ARMOR)
};

function TouchJumpPad(ps, jumppad) {
	// if we didn't hit this same jumppad the previous frame
	// then don't play the event sound again if we are in a fat trigger
	/*if (ps.jumppad_ent !== jumppad.number ) {		
		vectoangles( jumppad->origin2, angles);
		p = fabs( AngleNormalize180( angles[PITCH] ) );
		if( p < 45 ) {
			effectNum = 0;
		} else {
			effectNum = 1;
		}
		BG_AddPredictableEventToPlayerstate( EV_JUMP_PAD, effectNum, ps );
	}*/
	// remember hitting this jumppad this frame
	ps.jumppad_ent = jumppad.number;
	ps.jumppad_frame = ps.pmove_framecount;

	// give the player the velocity from the jumppad
	vec3.set(jumppad.origin2, ps.velocity);
}

function PlayerStateToEntityState(ps, s) {
	/*if (ps.pm_type === PM_INTERMISSION || ps->pm_type === PM_SPECTATOR) {
		s.eType = ET_INVISIBLE;
	} else if ( ps.stats[STAT_HEALTH] <= GIB_HEALTH ) {
		s.eType = ET_INVISIBLE;
	} else {
		s.eType = ET_PLAYER;
	}*/

	s.number = ps.clientNum;

	s.pos.trType = TR_INTERPOLATE;
	vec3.set(ps.origin, s.pos.trBase);
	vec3.set(ps.velocity, s.pos.trDelta);

	s.apos.trType = TR_INTERPOLATE;
	vec3.set(ps.viewangles, s.apos.trBase);

	s.angles2[YAW] = ps.movementDir;
	//s.legsAnim = ps->legsAnim;
	//s.torsoAnim = ps->torsoAnim;
	s.clientNum = ps.clientNum;                  // ET_PLAYER looks here instead of at number
	                                             // so corpses can also reference the proper config
	s.eFlags = ps.eFlags;
	/*if ( ps->stats[STAT_HEALTH] <= 0 ) {
		s->eFlags |= EntityFlags.DEAD;
	} else {
		s->eFlags &= ~EntityFlags.DEAD;
	}*/

	/*if ( ps->externalEvent ) {
		s->event = ps->externalEvent;
		s->eventParm = ps->externalEventParm;
	} else if ( ps->entityEventSequence < ps->eventSequence ) {
		int		seq;

		if ( ps->entityEventSequence < ps->eventSequence - MAX_PS_EVENTS) {
			ps->entityEventSequence = ps->eventSequence - MAX_PS_EVENTS;
		}
		seq = ps->entityEventSequence & (MAX_PS_EVENTS-1);
		s->event = ps->events[ seq ] | ( ( ps->entityEventSequence & 3 ) << 8 );
		s->eventParm = ps->eventParms[ seq ];
		ps->entityEventSequence++;
	}*/

	//s->weapon = ps->weapon;
	s.groundEntityNum = ps.groundEntityNum;

	/*s->powerups = 0;
	for ( i = 0 ; i < MAX_POWERUPS ; i++ ) {
		if ( ps->powerups[ i ] ) {
			s->powerups |= 1 << i;
		}
	}

	s->loopSound = ps->loopSound;
	s->generic1 = ps->generic1;*/
}