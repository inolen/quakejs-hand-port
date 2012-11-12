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
}