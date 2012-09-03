define('renderer/r-world', [], function () {
	return function () {
		return {
			RecursiveWorldNode: function (nodes) {
			},

			AddWorldSurfaces: function (map) {
				this.RecursiveWorldNode(nodes);
			}
		};
	};
});