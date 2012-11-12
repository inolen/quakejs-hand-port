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
		case EntityEvent.BULLET_HIT_WALL:
			//ByteToDir( es->eventParm, dir );
			AddBullet(es.pos.trBase, es.otherEntityNum, [0, 1, 0]/*dir*/, false, ENTITYNUM_WORLD);
			break;
	}
}