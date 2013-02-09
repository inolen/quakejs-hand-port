<div id="message" data-bind="visible: visible">
	<div id="message-frame">
		<div id="events-wrapper">
			<ul id="events" data-bind="foreach: events">
				<li class="event">
					<span data-bind="html: text"></span>
				</li>
			</ul>
		</div>

		<div class="control-group">
			<div class="control-label">Say:</div>
			<div name="say" class="control-input input-text" data-bind="textinput: '', hasfocus: visible, event: { change: textChange }"></div>
		</div>
	</div>
</div>