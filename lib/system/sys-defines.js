/**
 * MetaSockets are the object we pass to the
 * cl, sv and com layers instead of the raw
 * WebSocket instance.
 */
var MetaSocket = function (handle) {
	this.handle    = handle;
	this.onopen    = null;
	this.onmessage = null;
	this.onclose   = null;
};