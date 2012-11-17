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
		case EV.FOOTSTEP:
			imp.snd_StartSound(null, es.number, imp.snd_RegisterSound('sound/player/footsteps/step' + Math.ceil(Math.random() * 4)));
			break;
			
		case EV.JUMP:
			imp.snd_StartSound(null, es.number, imp.snd_RegisterSound('sound/player/sarge/jump1'));
			break;
		
		case EV.ITEM_PICKUP:
			var item;
			var index;
			
			index = es.eventParm;		// player predicted
			
			if (index < 1 || index >= bg.ItemList.length) {
				break;
			}
			
			item = bg.ItemList[index];
			
			// powerups and team items will have a separate global sound, this one
			// will be played at prediction time
			if (item.giType == IT.POWERUP || item.giType == IT.TEAM) {
// 				imp.snd_StartSound(null, es.number, cgs.media.n_healthSound);
			} else {
				imp.snd_StartSound(null, es.number, imp.snd_RegisterSound(item.pickupSound));
			}
			
			// show icon and name on status bar
// 			if (es.number == cg.snap.ps.clientNum) {
// 				CG_ItemPickup(index);
// 			}
			
			break;
		
		case EV.NOAMMO:
			imp.snd_StartSound(null, es.number, imp.snd_RegisterSound('sound/weapons/noammo'));
			
			if (es.number == cg.snap.ps.clientNum) {
// 				CG_OutOfAmmoChange();
			}
			
			break;
		
		case EV.CHANGE_WEAPON:
			imp.snd_StartSound(null, es.number, imp.snd_RegisterSound('sound/weapons/change'));
			break;
		
		case EV.FIRE_WEAPON:
			FireWeapon(cent);
			break;
			
		case EV.BULLET_HIT_WALL:
			var dir = [0, 0, 0];
			qm.ByteToDir(es.eventParm, dir);
			AddBullet(es.pos.trBase, es.otherEntityNum, dir, false, ENTITYNUM_WORLD);
			break;
	}
}
