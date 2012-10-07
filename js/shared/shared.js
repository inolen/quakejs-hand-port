var CA_UNINITIALIZED = 0;
var CA_DISCONNECTED  = 1;                        // not talking to a server
var CA_CONNECTING    = 2;                        // sending request packets to the server
var CA_CHALLENGING   = 3;                        // sending challenge packets to the server
var CA_CONNECTED     = 4;                        // netchan_t established, getting gamestate
var CA_LOADING       = 5;                        // only during cgame initialization, never during main loop
var CA_PRIMED        = 6;                        // got gamestate, waiting for first frame
var CA_ACTIVE        = 7;                        // game views should be displayed

var SNAPFLAG_RATE_DELAYED   = 1;
var SNAPFLAG_NOT_ACTIVE     = 2;                 // snapshot used during connection and for zombies
var SNAPFLAG_SERVERCOUNT    = 4;                 // toggled every map_restart so transitions can be detected