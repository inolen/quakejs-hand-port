<div id="message-frame">

	<div id="events-wrapper">
		<ul id="events">
			<% for (var i = 0; i < events.length; i++) { %>
				<% var ev = events[i]; %>
				<li class="event event-<%- ev.type %>">
				<% if (ev.type === 'print') { %>
					<span class="text"><%- ev.text %></span>
				<% } %>
				</li>
			<% } %>
		</ul>
	</div>

	<div class="control-group">
		<div class="control-label">Say:</div><div name="say" class="control-input input-text" data-value="<%- text %>"></div>
	</div>

</div>