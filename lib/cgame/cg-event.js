/**
 * EntityEvent
 *
 * An entity has an event value
 * also called by CG_CheckPlayerstateEvents
 */
function EntityEvent(cent, position) {
	var es = cent.currentState;
	var event = es.event & ~EV_EVENT_BITS;
	
	log('EntityEvent', 'ent:', es.number, ', event: ', event);
	
	switch (event) {
		// TODO: EntityEvent enum is coming back as undefined, using raw numbers for now
		
		case 14: // EV_JUMP
			log('EV_JUMP');
// 			trap_S_StartSound (NULL, es->number, CHAN_VOICE, CG_CustomSound( es->number, "*jump1.wav" ) );
			snd.StartSound(es.origin, es.number, 'player/sarge/jump1.wav');
			break;
		
		case 22: // CHANGE_WEAPON
			log('CHANGE_WEAPON');
			snd.StartSound(es.origin, es.number, 'weapons/change.wav');
			break;
		
		case 23: // FIRE_WEAPON
			log('FIRE_WEAPON', es.weapon);
			
// 			NONE:             0,
// 			GAUNTLET:         1,
// 			MACHINEGUN:       2,
// 			SHOTGUN:          3,
// 			GRENADE_LAUNCHER: 4,
// 			ROCKET_LAUNCHER:  5,
// 			LIGHTNING:        6,
// 			RAILGUN:          7,
// 			PLASMAGUN:        8,
// 			BFG:              9,
// 			GRAPPLING_HOOK:   10,
// 			NUM_WEAPONS:      11
			
			switch(es.weapon) {
				case 1: // gauntlet
					snd.StartSound(es.origin, es.number, 'weapons/melee/fstatck.wav');
					break;
				
				case 2: // machine gun
					snd.StartSound(es.origin, es.number, 'weapons/machinegun/machgf' + Math.ceil(Math.random() * 4) + 'b.wav');
					break;
					
				case 3: // shotgun
					snd.StartSound(es.origin, es.number, 'weapons/shotgun/sshotf1b.wav');
					break;
					
				case 5: // rocket
					snd.StartSound(es.origin, es.number, 'weapons/rocket/rocklf1a.wav');
					break;
				
				case 6: // lightning
					snd.StartSound(es.origin, es.number, 'weapons/lightning/lg_fire.wav');
					break;
				
				case 7: // railgun
					snd.StartSound(es.origin, es.number, 'weapons/railgun/railgf1a.wav');
					break;
					
				case 8: // plasma
					snd.StartSound(es.origin, es.number, 'weapons/plasma/plasmx1a.wav');
					break;
			}
			
			break;
			
		case EntityEvent.BULLET_HIT_WALL:
			//ByteToDir( es->eventParm, dir );
			AddBullet(es.pos.trBase, es.otherEntityNum, [0, 1, 0]/*dir*/, false, ENTITYNUM_WORLD);
			break;
	}
}
