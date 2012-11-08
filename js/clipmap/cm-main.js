/**
 * log
 */
function log() {
	var args = Array.prototype.slice.call(arguments);
	args.splice(0, 0, 'CM:');
	Function.apply.call(console.log, console, args);
}