var ConnectionState = {
	UNINITIALIZED: 0,
	DISCONNECTED:  1,                        // not talking to a server
	CONNECTING:    2,                        // sending request packets to the server
	CHALLENGING:   3,                        // sending challenge packets to the server
	CONNECTED:     4,                        // netchan_t established, getting gamestate
	LOADING:       5,                        // only during cgame initialization, never during main loop
	PRIMED:        6,                        // got gamestate, waiting for first frame
	ACTIVE:        7                        // game views should be displayed
};

var SNAPFLAG_RATE_DELAYED   = 1;
var SNAPFLAG_NOT_ACTIVE     = 2;                 // snapshot used during connection and for zombies
var SNAPFLAG_SERVERCOUNT    = 4;                 // toggled every map_restart so transitions can be detected