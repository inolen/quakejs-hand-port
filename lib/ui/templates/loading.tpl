<div id="loading" class="fullscreen" data-bind="visible: visible">
	<div id="logo" data-bind="img: 'ui/logo.png'"></div>
	<div class="loading">
		<h2 class="address">Connecting to <span data-bind="text: address"></span></h2>
		<h1 class="mapname" data-bind="style: { visibility: mapname() ? 'visible' : 'hidden' }">Loading <span data-bind="text: mapname"></span></h1>
		<div class="progress" data-bind="style: { visibility: mapname() ? 'visible' : 'hidden' }">
			<div class="bar" data-bind="style: { width: progress() + '%' }">&nbsp;</div>
		</div>
	</div>
</div>