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

	SetEntitySoundPosition(cent);

	AddEntityEvent(cent, cent.lerpOrigin);
}

/**
 * ItemPickup
 *
 * A new item was picked up this frame
 */
function ItemPickup(itemNum) {
	cg.itemPickup = itemNum;
	cg.itemPickupTime = cg.time;
	cg.itemPickupBlendTime = cg.time;
	// See if it should be the grabbed weapon.
	if ( bg.ItemList[itemNum].giType == IT.WEAPON ) {
		// select it immediately
		if ( /*cg_autoswitch.integer &&*/ bg.ItemList[itemNum].giTag != WP.MACHINEGUN ) {
			cg.weaponSelectTime = cg.time;
			cg.weaponSelect = bg.ItemList[itemNum].giTag;
		}
	}
}

/**
 * AddEntityEvent
 *
 * An entity has an event value
 * also called by CG_CheckPlayerstateEvents
 */
function AddEntityEvent(cent, position) {
	var es = cent.currentState;
	var ci = cgs.clientinfo[es.clientNum];

	var event = es.event & ~EV_EVENT_BITS;
	var dir = [0, 0, 0];
	
	// log('EntityEvent', 'ent:', es.number, ', event: ', event);
	
	switch (event) {
		case EV.FOOTSTEP:
			snd.StartSound(null, es.number, snd.RegisterSound('sound/player/footsteps/step' + Math.ceil(Math.random() * 4)));
			break;

		case EV.JUMP_PAD:
			var up = [0, 0, 1];
			SmokePuff(cent.lerpOrigin, up,
			          32,
			          1, 1, 1, 0.33,
			          1000,
			          cg.time, 0,
			          LEF.PUFF_DONT_SCALE,
			          cgs.media.smokePuffShader);

			// Boing sound at origin, jump sound on player.
			snd.StartSound(cent.lerpOrigin, -1, cgs.media.jumpPadSound);
			snd.StartSound(null, es.number, CustomSound(es.number, '*jump1'));
			break;

		case EV.JUMP:
			snd.StartSound(null, es.number, CustomSound(es.number, '*jump1'));
			break;
		
		case EV.ITEM_PICKUP:
			var item;
			var index;
			
			index = es.eventParm;  // player predicted
			
			if (index < 0 || index >= bg.ItemList.length) {
				break;
			}
			
			item = bg.ItemList[index];
			
			// Powerups and team items will have a separate global sound, this one
			// will be played at prediction time.
			if (item.giType === IT.POWERUP || item.giType === IT.TEAM) {
// 				snd.StartSound(null, es.number, cgs.media.n_healthSound);
			} else {
				snd.StartSound(null, es.number, snd.RegisterSound(item.pickupSound));
			}
			
			// Show icon and name on status bar.
			if (es.number === cg.snap.ps.clientNum) {
				ItemPickup(index);
			}
			
			break;
		
		case EV.NOAMMO:
			snd.StartSound(null, es.number, snd.RegisterSound('sound/weapons/noammo'));
			
			if (es.number === cg.snap.ps.clientNum) {
				OutOfAmmoChange();
			}
			
			break;
		
		case EV.CHANGE_WEAPON:
			snd.StartSound(null, es.number, snd.RegisterSound('sound/weapons/change'));
			break;
		
		case EV.FIRE_WEAPON:
			FireWeapon(cent);
			break;

		//
		// Other events
		//
		case EV.ITEM_POP:
			snd.StartSound(null, es.number, /*CHAN_AUTO,*/ cgs.media.respawnSound);
			break;

		case EV.ITEM_RESPAWN:
			cent.miscTime = cg.time;  // scale up from this
			snd.StartSound(null, es.number, /*CHAN_AUTO,*/ cgs.media.respawnSound);
			break;
		
		case EV.GRENADE_BOUNCE:
			if (Math.floor(Math.random() * 2) === 0) {
				snd.StartSound(null, es.number, /*CHAN_AUTO,*/ cgs.media.hgrenb1aSound);
			} else {
				snd.StartSound(null, es.number, /*CHAN_AUTO,*/ cgs.media.hgrenb2aSound);
			}
			break;
		
		//
		// Missile impacts
		//
		case EV.MISSILE_HIT:
			QMath.ByteToDir(es.eventParm, dir);
			MissileHitPlayer(es.weapon, position, dir, es.otherEntityNum);
			break;

		case EV.MISSILE_MISS:
			QMath.ByteToDir(es.eventParm, dir);
			MissileHitWall(es.weapon, 0, position, dir, IMPACTSOUND.DEFAULT);
			break;

		case EV.MISSILE_MISS_METAL:
			QMath.ByteToDir(es.eventParm, dir);
			MissileHitWall(es.weapon, 0, position, dir, IMPACTSOUND.METAL);
			break;

		case EV.RAILTRAIL:
			cent.currentState.weapon = WP.RAILGUN;
			
			if (es.clientNum === cg.snap.ps.clientNum && !cg.renderingThirdPerson) {
				// if (cg_drawGun.integer == 2)
				// 	VectorMA(es.origin2, 8, cg.refdef.viewaxis[1], es.origin2);
				// else if(cg_drawGun.integer == 3)
				// 	VectorMA(es.origin2, 4, cg.refdef.viewaxis[1], es.origin2);
			}

			RailTrail(ci, es.origin2, es.pos.trBase);

			// If the end was on a nomark surface, don't make an explosion
			if (es.eventParm !== 255) {
				QMath.ByteToDir(es.eventParm, dir);
				MissileHitWall(es.weapon, es.clientNum, position, dir, IMPACTSOUND.DEFAULT);
			}
			break;

		case EV.BULLET_HIT_FLESH:
			BulletHit(es.pos.trBase, es.otherEntityNum, dir, true, es.eventParm);
			break;

		case EV.BULLET_HIT_WALL:
			QMath.ByteToDir(es.eventParm, dir);
			BulletHit(es.pos.trBase, es.otherEntityNum, dir, false, ENTITYNUM_WORLD);
			break;
		
		case EV.SHOTGUN:
			ShotgunFire(es);
			break;

		case EV.PAIN:
			// Local player sounds are triggered in CheckLocalSounds,
			// so ignore events on the player.
			if (cent.currentState.number !== cg.snap.ps.clientNum) {
				PainEvent(cent, es.eventParm);
			}
			break;
	}
}

/**
 * PainEvent
 * 
 * Also called by playerstate transition.
 */
function PainEvent(cent, health) {
	// Don't do more than two pain sounds a second.
	if (cg.time - cent.pe.painTime < 500) {
		return;
	}

	var sound;
	if (health < 25 ) {
		sound = '*pain25_1';
	} else if ( health < 50 ) {
		sound = '*pain50_1';
	} else if ( health < 75 ) {
		sound = '*pain75_1';
	} else {
		sound = '*pain100_1';
	}

	// // Play a gurp sound instead of a normal pain sound.
	// if (WaterLevel(cent) >= 1) {
	// 	if (rand()&1) {
	// 		trap_S_StartSound(NULL, cent.currentState.number, CHAN_VOICE, CG_CustomSound(cent.currentState.number, "sound/player/gurp1.wav"));
	// 	} else {
	// 		trap_S_StartSound(NULL, cent.currentState.number, CHAN_VOICE, CG_CustomSound(cent.currentState.number, "sound/player/gurp2.wav"));
	// 	}
	// } else {
		snd.StartSound(null, cent.currentState.number, /*CHAN_VOICE,*/ CustomSound(cent.currentState.number, sound));
	// }

	// Save pain time for programitic twitch animation.
	cent.pe.painTime = cg.time;
	cent.pe.painDirection ^= 1;
}
