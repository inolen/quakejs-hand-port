<div id="loading" class="fullscreen">
	<div id="logo"></div>
	<div class="content">
		<h1 class="mapname" data-bind="style: { visibility: mapname() ? 'visible' : 'hidden' }">Loading <span data-bind="text: mapname"></span></h1>
		<div class="progress" data-bind="style: { visibility: mapname() ? 'visible' : 'hidden' }">
			<div class="bar" data-bind="style: { width: progress() + '%' }">&nbsp;</div>
		</div>
	</div>
</div>