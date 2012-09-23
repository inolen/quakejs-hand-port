var GameEntity = function () {
	//entityState_t  s;				// communicated by server to clients
	//entityShared_t r;				// shared by both the server system and game

	// DO NOT MODIFY ANYTHING ABOVE THIS, THE SERVER
	// EXPECTS THE FIELDS IN THAT ORDER!
	//================================

	//struct gclient_s	*client;	// NULL if not a client

	this.classname = null;			// set in QuakeEd
	this.spawnflags = 0;			// set in QuakeEd
	this.clipmask = 0;				// brushes with this content value will be collided against
									// when moving.  items and corpses do not collide against
									// players, for instance

	/*int			nextthink;
	void		(*think)(gentity_t *self);
	void		(*reached)(gentity_t *self);	// movers call this when hitting endpoint
	void		(*blocked)(gentity_t *self, gentity_t *other);
	void		(*touch)(gentity_t *self, gentity_t *other, trace_t *trace);
	void		(*use)(gentity_t *self, gentity_t *other, gentity_t *activator);
	void		(*pain)(gentity_t *self, gentity_t *attacker, int damage);
	void		(*die)(gentity_t *self, gentity_t *inflictor, gentity_t *attacker, int damage, int mod);*/
};

var LevelLocals = function () {
	this.gentities = [];
};