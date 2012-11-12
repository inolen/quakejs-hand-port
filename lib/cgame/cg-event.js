/**
 * CheckEvents
 */
function CheckEvents(cent) {
	// Check for event-only entities.
	if (cent.currentState.eType > EntityType.EVENTS) {
		if (cent.previousEvent) {
			return;  // already fired
		}

		// If this is a player event set the entity number of the client entity number.
		if (cent.currentState.eFlags & EntityFlags.PLAYER_EVENT) {
			cent.currentState.number = cent.currentState.otherEntityNum;
		}

		cent.previousEvent = 1;
		cent.currentState.event = cent.currentState.eType - EntityType.EVENTS;
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
		case EntityEvent.JUMP:
// 			trap_S_StartSound (NULL, es->number, CHAN_VOICE, CG_CustomSound( es->number, "*jump1" ) );
			snd.StartSound(es.origin, es.number, 'player/sarge/jump1');
			break;
		
		case EntityEvent.CHANGE_WEAPON:
			snd.StartSound(es.origin, es.number, 'weapons/change');
			break;
		
		case EntityEvent.FIRE_WEAPON:
			switch(es.weapon) {
				case Weapon.GAUNTLET: // gauntlet
					snd.StartSound(es.origin, es.number, 'weapons/melee/fstatck');
					break;
				
				case Weapon.MACHINEGUN: // machine gun
					snd.StartSound(es.origin, es.number, 'weapons/machinegun/machgf' + Math.ceil(Math.random() * 4) + 'b');
					break;
					
				case Weapon.SHOTGUN: // shotgun
					snd.StartSound(es.origin, es.number, 'weapons/shotgun/sshotf1b');
					break;
					
				case Weapon.ROCKET_LAUNCHER: // rocket
					snd.StartSound(es.origin, es.number, 'weapons/rocket/rocklf1a');
					break;
				
				case Weapon.LIGHTNING: // lightning
					snd.StartSound(es.origin, es.number, 'weapons/lightning/lg_fire');
					break;
				
				case Weapon.RAILGUN: // railgun
					snd.StartSound(es.origin, es.number, 'weapons/railgun/railgf1a');
					break;
					
				case Weapon.PLASMAGUN: // plasma
					snd.StartSound(es.origin, es.number, 'weapons/plasma/plasmx1a');
					break;
			}
			
			break;
			
		case EntityEvent.BULLET_HIT_WALL:
			//ByteToDir( es->eventParm, dir );
			AddBullet(es.pos.trBase, es.otherEntityNum, [0, 1, 0]/*dir*/, false, ENTITYNUM_WORLD);
			break;
	}
}
