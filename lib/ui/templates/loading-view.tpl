<div id="loading" data-bind="visible: visible">
	<div id="logo" data-bind="img: 'ui/logo.png'"></div>
	<div class="loading">
		<div class="description">Loading <span class="map-name" data-bind="text: mapName"></span></div>
		<div class="progress">
			<div class="bar" data-bind="style: { width: progress() + '%' }">&nbsp;</div>
		</div>
	</div>
</div>