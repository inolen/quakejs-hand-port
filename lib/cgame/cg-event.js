/**
 * CheckEvents
 */
function CheckEvents(cent) {
	// Check for event-only entities.
	if (cent.currentState.eType > ET.EVENTS) {
		if (cent.previousEvent) {
			return;  // already fired
		}

		// If this is a player event set the entity number of the client entity number.
		if (cent.currentState.eFlags & EF.PLAYER_EVENT) {
			cent.currentState.number = cent.currentState.otherEntityNum;
		}

		cent.previousEvent = 1;
		cent.currentState.event = cent.currentState.eType - ET.EVENTS;
	} else {
		// Check for events riding with another entity.
		if (cent.currentState.event === cent.previousEvent) {
			return;
		}
		cent.previousEvent = cent.currentState.event;
		if ((cent.currentState.event & ~EV_EVENT_BITS) === 0) {
			return;
		}
	}

	// Calculate the position at exactly the frame time
	bg.EvaluateTrajectory(cent.currentState.pos, cg.snap.serverTime, cent.lerpOrigin);
	// CG_SetEntitySoundPosition( cent );

	AddEntityEvent(cent, cent.lerpOrigin);
}

/**
 * AddEntityEvent
 *
 * An entity has an event value
 * also called by CG_CheckPlayerstateEvents
 */
function AddEntityEvent(cent, position) {
	var es = cent.currentState;
	var event = es.event & ~EV_EVENT_BITS;
	
	// log('EntityEvent', 'ent:', es.number, ', event: ', event);
	
	switch (event) {
		case EV.JUMP:
// 			trap_S_StartSound (NULL, es->number, CHAN_VOICE, CG_CustomSound( es->number, "*jump1" ) );
			imp.snd_StartSound(es.origin, es.number, 'player/sarge/jump1');
			break;
		
		case EV.CHANGE_WEAPON:
			imp.snd_StartSound(es.origin, es.number, 'weapons/change');
			break;
		
		case EV.FIRE_WEAPON:
			switch(es.weapon) {
				case WP.GAUNTLET: // gauntlet
					imp.snd_StartSound(es.origin, es.number, 'weapons/melee/fstatck');
					break;
				
				case WP.MACHINEGUN: // machine gun
					imp.snd_StartSound(es.origin, es.number, 'weapons/machinegun/machgf' + Math.ceil(Math.random() * 4) + 'b');
					break;
					
				case WP.SHOTGUN: // shotgun
					imp.snd_StartSound(es.origin, es.number, 'weapons/shotgun/sshotf1b');
					break;
					
				case WP.ROCKET_LAUNCHER: // rocket
					imp.snd_StartSound(es.origin, es.number, 'weapons/rocket/rocklf1a');
					break;
				
				case WP.LIGHTNING: // lightning
					imp.snd_StartSound(es.origin, es.number, 'weapons/lightning/lg_fire');
					break;
				
				case WP.RAILGUN: // railgun
					imp.snd_StartSound(es.origin, es.number, 'weapons/railgun/railgf1a');
					break;
					
				case WP.PLASMAGUN: // plasma
					imp.snd_StartSound(es.origin, es.number, 'weapons/plasma/plasmx1a');
					break;
			}
			
			break;
			
		case EV.BULLET_HIT_WALL:
			//ByteToDir( es->eventParm, dir );
			AddBullet(es.pos.trBase, es.otherEntityNum, [0, 1, 0]/*dir*/, false, ENTITYNUM_WORLD);
			break;
	}
}
