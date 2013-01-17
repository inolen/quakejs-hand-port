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
 * AddEntityEvent
 *
 * An entity has an event value
 * also called by CG_CheckPlayerstateEvents
 */
function AddEntityEvent(cent, position) {
	var es = cent.currentState;
	var ci = cgs.clientinfo[es.clientNum];

	var event = es.event & ~EV_EVENT_BITS;
	var dir = vec3.create();

	// log('EntityEvent', 'ent:', es.number, ', event: ', event);

	switch (event) {
		case EV.FOOTSTEP:
			snd.StartSound(null, es.number, /*CHAN_BODY, */ cgs.media['footstep' + ci.footsteps + QMath.irrandom(0, 3)]);
			break;

		case EV.STEP_4:
		case EV.STEP_8:
		case EV.STEP_12:
		case EV.STEP_16:  // smooth out step up transitions
		{
			if (es.clientNum !== cg.predictedPlayerState.clientNum) {
				break;
			}

			// If we are interpolating, we don't need to smooth steps.
			if ((cg.snap.ps.pm_flags & PMF.FOLLOW) /*|| cg_nopredict.integer || cg_synchronousClients.integer*/) {
				break;
			}

			// Check for stepping up before a previous step is completed.
			var oldStep = 0;

			var delta = cg.time - cg.stepTime;
			if (delta < STEP_TIME) {
				oldStep = cg.stepChange * (STEP_TIME - delta) / STEP_TIME;
			}

			// Add this amount.
			var step = 4 * (event - EV.STEP_4 + 1);
			cg.stepChange = oldStep + step;
			if (cg.stepChange > MAX_STEP_CHANGE) {
				cg.stepChange = MAX_STEP_CHANGE;
			}
			cg.stepTime = cg.time;
		}
		break;

		case EV.JUMP_PAD:
			var up = vec3.createFrom(0, 0, 1);
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

		case EV.WATER_TOUCH:
			snd.StartSound(null, es.number,/* CHAN_AUTO,*/ cgs.media.watrInSound);
			break;

		case EV.WATER_LEAVE:
			snd.StartSound(null, es.number,/* CHAN_AUTO,*/ cgs.media.watrOutSound);
			break;

		case EV.WATER_UNDER:
			snd.StartSound(null, es.number,/* CHAN_AUTO,*/ cgs.media.watrUnSound);
			break;

		case EV.WATER_CLEAR:
			snd.StartSound(null, es.number,/* CHAN_AUTO,*/ CustomSound(es.number, '*gasp'));
			break;

		case EV.ITEM_PICKUP:
			var index = es.eventParm;  // player predicted
			if (index < 1 || index >= bg.ItemList.length) {
				break;
			}

			var item = bg.ItemList[index];
			var itemInfo = cg.itemInfo[index];

			// Powerups and team items will have a separate global sound, this one
			// will be played at prediction time.
			if (item.giType === IT.POWERUP || item.giType === IT.TEAM) {
				snd.StartSound(null, es.number, cgs.media.n_healthSound);
			} else {
				snd.StartSound(null, es.number, itemInfo.sounds.pickup);
			}

			// Show icon and name on status bar.
			if (es.number === cg.snap.ps.clientNum) {
				ItemPickup(index);
			}
			break;

		case EV.GLOBAL_ITEM_PICKUP:
			var index = es.eventParm;  // player predicted
			if (index < 1 || index >= bg.ItemList.length) {
				break;
			}

			var item = bg.ItemList[index];
			var itemInfo = cg.itemInfo[index];

			// Powerup pickups are global.
			if (itemInfo.sounds.pickup) {
				snd.StartSound(null, cg.snap.ps.clientNum,/* CHAN_AUTO,*/ itemInfo.sounds.pickup);
			}

			// Show icon and name on status bar.
			if (es.number === cg.snap.ps.clientNum) {
				ItemPickup(index);
			}
			break;


		case EV.NOAMMO:
			snd.StartSound(null, es.number, cgs.media.noAmmoSound);

			if (es.number === cg.snap.ps.clientNum) {
				OutOfAmmoChange();
			}

			break;

		case EV.CHANGE_WEAPON:
			snd.StartSound(null, es.number, cgs.media.selectSound);
			break;

		case EV.FIRE_WEAPON:
			FireWeapon(cent);
			break;

		//
		// Powerups
		//
		case EV.POWERUP_QUAD:
			// if (es.number == cg.snap.ps.clientNum) {
			// 	cg.powerupActive = PW.QUAD;
			// 	cg.powerupTime = cg.time;
			// }
			var quadInfo = FindItemInfo(IT.POWERUP, PW.QUAD);
			snd.StartSound(null, es.number, /*CHAN_ITEM,*/ quadInfo.sounds.use);
			break;

		case EV.POWERUP_BATTLESUIT:
			// if (es.number === cg.snap.ps.clientNum) {
			// 	cg.powerupActive = PW.BATTLESUIT;
			// 	cg.powerupTime = cg.time;
			// }
			var battlesuitInfo = FindItemInfo(IT.POWERUP, PW.BATTLESUIT);
			snd.StartSound(null, es.number, /*CHAN_ITEM,*/ battlesuitInfo.sounds.pickup);
			break;

		case EV.POWERUP_REGEN:
			// if (es.number === cg.snap.ps.clientNum) {
			// 	cg.powerupActive = PW.REGEN;
			// 	cg.powerupTime = cg.time;
			// }
			var regenInfo = FindItemInfo(IT.POWERUP, PW.REGEN);
			snd.StartSound(null, es.number, /*CHAN_ITEM,*/ regenInfo.sounds.use);
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

		case EV.GLOBAL_TEAM_SOUND:  // play from the player's head so it never diminishes
			switch (es.eventParm) {
				case GTS.RED_CAPTURE: // CTF: red team captured the blue flag, 1FCTF: red team captured the neutral flag
					if (cg.snap.ps.persistant[PERS.TEAM] === TEAM.RED) {
						AddBufferedSound(cgs.media.captureYourTeamSound);
					} else {
						AddBufferedSound(cgs.media.captureOpponentSound);
					}
					break;
				case GTS.BLUE_CAPTURE: // CTF: blue team captured the red flag, 1FCTF: blue team captured the neutral flag
					if (cg.snap.ps.persistant[PERS.TEAM] === TEAM.BLUE) {
						AddBufferedSound(cgs.media.captureYourTeamSound);
					} else {
						AddBufferedSound(cgs.media.captureOpponentSound);
					}
					break;
				case GTS.RED_RETURN: // CTF: blue flag returned, 1FCTF: never used
					if (cg.snap.ps.persistant[PERS.TEAM] === TEAM.RED) {
						AddBufferedSound(cgs.media.returnYourTeamSound);
					} else {
						AddBufferedSound(cgs.media.returnOpponentSound);
					}
					//
					AddBufferedSound(cgs.media.blueFlagReturnedSound);
					break;
				case GTS.BLUE_RETURN: // CTF red flag returned, 1FCTF: neutral flag returned
					if (cg.snap.ps.persistant[PERS.TEAM] == TEAM.BLUE) {
						AddBufferedSound(cgs.media.returnYourTeamSound);
					} else {
						AddBufferedSound(cgs.media.returnOpponentSound);
					}
					//
					AddBufferedSound(cgs.media.redFlagReturnedSound);
					break;
				case GTS.RED_TAKEN:  // CTF: red team took blue flag, 1FCTF: blue team took the neutral flag
					// If this player picked up the flag then a sound is played in CG_CheckLocalSounds.
					if (cg.snap.ps.powerups[PW.BLUEFLAG] || cg.snap.ps.powerups[PW.NEUTRALFLAG]) {
					} else {
						if (cg.snap.ps.persistant[PERS.TEAM] === TEAM.BLUE) {
							if (cgs.gametype == GT.NFCTF) {
								AddBufferedSound(cgs.media.yourTeamTookTheFlagSound);
							} else {
								AddBufferedSound(cgs.media.enemyTookYourFlagSound);
							}
						}
						else if (cg.snap.ps.persistant[PERS.TEAM] === TEAM.RED) {
							if (cgs.gametype == GT.NFCTF) {
								AddBufferedSound(cgs.media.enemyTookTheFlagSound);
							} else {
								AddBufferedSound(cgs.media.yourTeamTookEnemyFlagSound);
							}
						}
					}
					break;
				case GTS.BLUE_TAKEN: // CTF: blue team took the red flag, 1FCTF red team took the neutral flag
					// if this player picked up the flag then a sound is played in CG_CheckLocalSounds
					if (cg.snap.ps.powerups[PW.REDFLAG] || cg.snap.ps.powerups[PW.NEUTRALFLAG]) {
					}
					else {
						if (cg.snap.ps.persistant[PERS.TEAM] == TEAM.RED) {
							if (cgs.gametype == GT.NFCTF) {
								AddBufferedSound(cgs.media.yourTeamTookTheFlagSound);
							} else {
								AddBufferedSound(cgs.media.enemyTookYourFlagSound);
							}
						}
						else if (cg.snap.ps.persistant[PERS.TEAM] == TEAM.BLUE) {
							if (cgs.gametype == GT.NFCTF) {
								AddBufferedSound(cgs.media.enemyTookTheFlagSound);
							} else {
								AddBufferedSound(cgs.media.yourTeamTookEnemyFlagSound);
							}
						}
					}
					break;

				case GTS.REDTEAM_SCORED:
					AddBufferedSound(cgs.media.redScoredSound);
					break;
				case GTS.BLUETEAM_SCORED:
					AddBufferedSound(cgs.media.blueScoredSound);
					break;
				case GTS.REDTEAM_TOOK_LEAD:
					AddBufferedSound(cgs.media.redLeadsSound);
					break;
				case GTS.BLUETEAM_TOOK_LEAD:
					AddBufferedSound(cgs.media.blueLeadsSound);
					break;
				case GTS.TEAMS_ARE_TIED:
					AddBufferedSound(cgs.media.teamsTiedSound);
					break;
				default:
					break;
				}
			break;

		case EV.PAIN:
			// Local player sounds are triggered in CheckLocalSounds,
			// so ignore events on the player.
			if (cent.currentState.number !== cg.snap.ps.clientNum) {
				PainEvent(cent, es.eventParm);
			}
			break;

		case EV.DEATH1:
		case EV.DEATH2:
		case EV.DEATH3:
			// if (CG_WaterLevel(cent) >= 1) {
			// 	trap_S_StartSound(NULL, es->number, CHAN_VOICE, CG_CustomSound(es->number, "*drown.wav"));
			// } else {
			// 	trap_S_StartSound(NULL, es->number, CHAN_VOICE, CG_CustomSound(es->number, va("*death%i.wav", event - EV_DEATH1 + 1)));
			// }
			break;

		case EV.OBITUARY:
			PrintObituary(es);
			break;

		//
		// Other events
		//
		case EV.PLAYER_TELEPORT_IN:
			snd.StartSound(null, es.number, /*CHAN_AUTO,*/ cgs.media.teleInSound);
			SpawnEffect(position);
			break;

		case EV.PLAYER_TELEPORT_OUT:
			snd.StartSound(null, es.number, /*CHAN_AUTO,*/ cgs.media.teleOutSound);
			SpawnEffect(position);
			break;

		case EV.ITEM_POP:
			snd.StartSound(null, es.number, /*CHAN_AUTO,*/ cgs.media.respawnSound);
			break;

		case EV.ITEM_RESPAWN:
			cent.miscTime = cg.time;  // scale up from this
			snd.StartSound(null, es.number, /*CHAN_AUTO,*/ cgs.media.respawnSound);
			break;

		case EV.GRENADE_BOUNCE:
			var itemInfo = FindItemInfo(IT.WEAPON, WP.GRENADE_LAUNCHER);
			if (QMath.irrandom(0, 1)) {
				snd.StartSound(null, es.number, /*CHAN_AUTO,*/ itemInfo.sounds.bounce0);
			} else {
				snd.StartSound(null, es.number, /*CHAN_AUTO,*/ itemInfo.sounds.bounce1);
			}
			break;

		case EV.GIB_PLAYER:
			GibPlayer(cent);
			break;

		case EV.GENERAL_SOUND:
			// if ( cgs.gameSounds[ es->eventParm ] ) {
			// 	trap_S_StartSound (NULL, es->number, CHAN_VOICE, cgs.gameSounds[ es->eventParm ] );
			// } else {
			// 	s = CG_ConfigString( CS_SOUNDS + es->eventParm );
			// 	trap_S_StartSound (NULL, es->number, CHAN_VOICE, CG_CustomSound( es->number, s ) );
			// }
			break;

		case EV.GLOBAL_SOUND:  // play from the player's head so it never diminishes
			// if ( cgs.gameSounds[ es->eventParm ] ) {
			// 	trap_S_StartSound (NULL, cg.snap->ps.clientNum, CHAN_AUTO, cgs.gameSounds[ es->eventParm ] );
			// } else {
			// 	s = CG_ConfigString( CS_SOUNDS + es->eventParm );
			// 	trap_S_StartSound (NULL, cg.snap->ps.clientNum, CHAN_AUTO, CG_CustomSound( es->number, s ) );
			// }
			break;
		
		case EV.STOPLOOPINGSOUND:
			snd.StopLoopingSound(es.number);
			es.loopSound = 0;
			break;
	}
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
	if (bg.ItemList[itemNum].giType === IT.WEAPON) {
		// Select it immediately.
		if (cg_autoSwitch() && bg.ItemList[itemNum].giTag !== WP.MACHINEGUN) {
			cg.weaponSelectTime = cg.time;
			cg.weaponSelect = bg.ItemList[itemNum].giTag;
		}
	}
}

/**
 * WaterLevel
 *
 * Returns waterlevel for entity origin
 */
function WaterLevel(cent) {
	var anim = cent.currentState.legsAnim & ~ANIM_TOGGLEBIT;

	var viewheight;
	if (anim === ANIM.LEGS_WALKCR || anim === ANIM.LEGS_IDLECR) {
		viewheight = CROUCH_VIEWHEIGHT;
	} else {
		viewheight = DEFAULT_VIEWHEIGHT;
	}

	return bg.GetWaterLevel(cent.lerpOrigin, viewheight, PointContents);
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
	if (health < 25) {
		sound = '*pain25_1';
	} else if (health < 50) {
		sound = '*pain50_1';
	} else if (health < 75) {
		sound = '*pain75_1';
	} else {
		sound = '*pain100_1';
	}

	// // Play a gurp sound instead of a normal pain sound.
	if (WaterLevel(cent) >= 1) {
		if (QMath.irrandom(0, 1)) {
			snd.StartSound(null, cent.currentState.number,/* CHAN_VOICE,*/ cgs.media.gurp1Sound);
		} else {
			snd.StartSound(null, cent.currentState.number,/* CHAN_VOICE,*/ cgs.media.gurp2Sound);
		}
	} else {
		snd.StartSound(null, cent.currentState.number, /*CHAN_VOICE,*/ CustomSound(cent.currentState.number, sound));
	}

	// Save pain time for programitic twitch animation.
	cent.pe.painTime = cg.time;
	cent.pe.painDirection ^= 1;
}

/**
 * PrintObituary
 */
function PrintObituary(ent) {
	var targetNum = ent.otherEntityNum;
	var attackerNum = ent.otherEntityNum2;
	var mod = ent.eventParm;

	var ci = cgs.clientinfo[targetNum];

	// Get target name.
	if (targetNum < 0 || targetNum >= MAX_CLIENTS) {
		error('Obituary: target out of range');
	}
	var targetInfo = ConfigString('player' + targetNum);
	if (!targetInfo) {
		return;
	}

	var targetName = targetInfo.name;

	// Check for single client messages.
	var message, message2;

	switch (mod) {
		case MOD.SUICIDE:
			message = 'suicides';
			break;
		case MOD.FALLING:
			message = 'cratered';
			break;
		case MOD.CRUSH:
			message = 'was squished';
			break;
		case MOD.WATER:
			message = 'sank like a rock';
			break;
		case MOD.SLIME:
			message = 'melted';
			break;
		case MOD.LAVA:
			message = 'does a back flip into the lava';
			break;
		case MOD.TARGET_LASER:
			message = 'saw the light';
			break;
		case MOD.TRIGGER_HURT:
			message = 'was in the wrong place';
			break;
		default:
			message = null;
			break;
	}

	if (attackerNum === targetNum) {
		var gender = ci.gender;

		switch (mod) {
			case MOD.GRENADE_SPLASH:
				if (gender === GENDER.FEMALE) {
					message = 'tripped on her own grenade';
				} else if (gender === GENDER.NEUTER) {
					message = 'tripped on its own grenade';
				} else {
					message = 'tripped on his own grenade';
				}
				break;
			case MOD.ROCKET_SPLASH:
				if (gender === GENDER.FEMALE) {
					message = 'blew herself up';
				} else if (gender === GENDER.NEUTER) {
					message = 'blew itself up';
				 } else {
					message = 'blew himself up';
				}
				break;
			case MOD.PLASMA_SPLASH:
				if (gender === GENDER.FEMALE) {
					message = 'melted herself';
				} else if (gender === GENDER.NEUTER) {
					message = 'melted itself';
				} else {
					message = 'melted himself';
				}
				break;
			case MOD.BFG_SPLASH:
				message = 'should have used a smaller gun';
				break;
			default:
				if (gender == GENDER.FEMALE) {
					message = 'killed herself';
				} else if (gender == GENDER.NEUTER) {
					message = 'killed itself';
				} else {
					message = 'killed himself';
				}
				break;
		}
	}

	if (message) {
		log('print', targetName + ' ' + message);
		return;
	}

	// // Check for kill messages from the current clientNum.
	// if (attacker === cg.snap->ps.clientNum ) {
	// 	if (cgs.gametype < GT_TEAM) {
	// 		s = va("You fragged %s\n%s place with %i", targetName,
	// 			CG_PlaceString( cg.snap->ps.persistant[PERS_RANK] + 1 ),
	// 			cg.snap->ps.persistant[PERS_SCORE] );
	// 	} else {
	// 		s = va("You fragged %s", targetName );
	// 	}

	// 	CG_CenterPrint( s, SCREEN_HEIGHT * 0.30, BIGCHAR_WIDTH );

	// 	// print the text message as well
	// }

	// Check for double client messages.
	var attackerInfo;
	if (attackerNum < 0 || attackerNum >= MAX_CLIENTS) {
		attackerNum = ENTITYNUM_WORLD;
		attackerInfo = null;
	} else {
		attackerInfo = ConfigString('player' + attackerNum);
	}

	var attackerName;
	if (!attackerInfo) {
		attackerNum = ENTITYNUM_WORLD;
		attackerName = 'noname';
	} else {
		attackerName = attackerInfo.name;
		// strcat( attackerName, S_COLOR_WHITE );
		// Check for kill messages about the current clientNum.
		if (targetNum === cg.snap.ps.clientNum) {
			// Q_strncpyz( cg.killerName, attackerName, sizeof( cg.killerName ) );
		}
	}

	if (attackerNum !== ENTITYNUM_WORLD) {
		switch (mod) {
			case MOD.GRAPPLE:
				message = 'was caught by';
				break;
			case MOD.GAUNTLET:
				message = 'was pummeled by';
				break;
			case MOD.MACHINEGUN:
				message = 'was machinegunned by';
				break;
			case MOD.SHOTGUN:
				message = 'was gunned down by';
				break;
			case MOD.GRENADE:
				message = 'ate';
				message2 = '\'s grenade';
				break;
			case MOD.GRENADE_SPLASH:
				message = 'was shredded by';
				message2 = '\'s shrapnel';
				break;
			case MOD.ROCKET:
				message = 'ate';
				message2 = '\'s rocket';
				break;
			case MOD.ROCKET_SPLASH:
				message = 'almost dodged';
				message2 = '\'s rocket';
				break;
			case MOD.PLASMA:
				message = 'was melted by';
				message2 = '\'s plasmagun';
				break;
			case MOD.PLASMA_SPLASH:
				message = 'was melted by';
				message2 = '\'s plasmagun';
				break;
			case MOD.RAILGUN:
				message = 'was railed by';
				break;
			case MOD.LIGHTNING:
				message = 'was electrocuted by';
				break;
			case MOD.BFG:
			case MOD.BFG_SPLASH:
				message = 'was blasted by';
				message2 = '\'s BFG';
				break;
			case MOD.TELEFRAG:
				message = 'tried to invade';
				message2 = '\'s personal space';
				break;
			default:
				message = 'was killed by';
				break;
		}

		if (message) {
			log('print', targetName + ' ' + message + ' ' + attackerName + (message2 || '') + '.');
			return;
		}
	}

	// We don't know what it was.
	log('print', targetName + ' died.');
}
