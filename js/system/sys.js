define('system/sys', [], function () {
	function GetMilliseconds() {	
		if (window.performance.now) {
			return parseInt(window.performance.now());
		} else if (window.performance.webkitNow) {
			return parseInt(window.performance.webkitNow());
		} else {
			return Date.now();
		}
	}

	return {
		GetMilliseconds: GetMilliseconds
	};
});
