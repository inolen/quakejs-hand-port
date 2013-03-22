<div class="tabbable tabs-left">
	<ul class="nav nav-tabs">
		<li><a href="#player" data-bind="tab: true">Player</a></li>
		<li><a href="#controls" data-bind="tab: false">Controls</a></li>
		<li><a href="#game" data-bind="tab: false">Game</a></li>
		<li><a href="#sound" data-bind="tab: false">Sound</a></li>
	</ul>

	<div class="tab-content">
		<div class="tab-pane" id="player">
			<div class="control-group">
				<div class="control-label">Name:</div><div name="name" class="control-input input-text" data-bind="textinput: name, event: { change: updated }"></div>
			</div>
		</div>

		<div class="tab-pane" id="controls">
			<div class="tabbable">
				<ul class="nav nav-pills">
					<li><a href="#move" data-bind="tab: true">Move</a></li>
					<li><a href="#shoot" data-bind="tab: false">Shoot</a></li>
					<li><a href="#weapons" data-bind="tab: false">Weapons</a></li>
					<li><a href="#misc" data-bind="tab: false">Misc</a></li>
				</ul>

				<div class="tab-content">
					<div class="tab-pane active" id="move">
						<div class="control-group">
							<div class="control-label">Sensitivity:</div><div name="sensitivity" class="control-input input-range" min="0" max="10" data-bind="rangeinput: sensitivity, event: { change: updated }"></div>
						</div>
						<div class="control-group">
							<div class="control-label">Mouse filtering:</div><div name="filter" class="control-input input-radio" data-bind="radioinput: filter, event: { change: updated }"></div>
						</div>
						<div class="control-group">
							<div class="control-label">Move forward:</div><div name="forwardKey" class="control-input input-key" data-bind="keyinput: forwardKey, event: { change: updated }"></div>
						</div>
						<div class="control-group">
							<div class="control-label">Move left:</div><div name="leftKey" class="control-input input-key" data-bind="keyinput: leftKey, event: { change: updated }"></div>
						</div>
						<div class="control-group">
							<div class="control-label">Move back:</div><div name="backKey" class="control-input input-key" data-bind="keyinput: backKey, event: { change: updated }"></div>
						</div>
						<div class="control-group">
							<div class="control-label">Move right:</div><div name="rightKey" class="control-input input-key" data-bind="keyinput: rightKey, event: { change: updated }"></div>
						</div>
						<div class="control-group">
							<div class="control-label">Jump:</div><div name="upKey" class="control-input input-key" data-bind="keyinput: upKey, event: { change: updated }"></div>
						</div>
					</div>

					<div class="tab-pane" id="shoot">
						<div class="control-group">
							<div class="control-label">Attack:</div><div name="attackKey" class="control-input input-key" data-bind="keyinput: attackKey, event: { change: updated }"></div>
						</div>
						<div class="control-group">
							<div class="control-label">Zoom:</div><div name="zoomKey" class="control-input input-key" data-bind="keyinput: zoomKey, event: { change: updated }"></div>
						</div>
						<div class="control-group">
							<div class="control-label">Next weapon:</div><div name="weapnextKey" class="control-input input-key" data-bind="keyinput: weapnextKey, event: { change: updated }"></div>
						</div>
						<div class="control-group">
							<div class="control-label">Prev weapon:</div><div name="weapprevKey" class="control-input input-key" data-bind="keyinput: weapprevKey, event: { change: updated }"></div>
						</div>
					</div>

					<div class="tab-pane" id="weapons">
						<div class="control-group">
							<div class="control-label">Gauntlet:</div><div name="weapon1Key" class="control-input input-key" data-bind="keyinput: weapon1Key, event: { change: updated }"></div>
						</div>
						<div class="control-group">
							<div class="control-label">Machinegun:</div><div name="weapon2Key" class="control-input input-key" data-bind="keyinput: weapon2Key, event: { change: updated }"></div>
						</div>
						<div class="control-group">
							<div class="control-label">Shotgun:</div><div name="weapon3Key" class="control-input input-key" data-bind="keyinput: weapon3Key, event: { change: updated }"></div>
						</div>
						<div class="control-group">
							<div class="control-label">Grenade launcher:</div><div name="weapon4Key" class="control-input input-key" data-bind="keyinput: weapon4Key, event: { change: updated }"></div>
						</div>
						<div class="control-group">
							<div class="control-label">Rocket launcher:</div><div name="weapon5Key" class="control-input input-key" data-bind="keyinput: weapon5Key, event: { change: updated }"></div>
						</div>
						<div class="control-group">
							<div class="control-label">Lightning gun:</div><div name="weapon6Key" class="control-input input-key" data-bind="keyinput: weapon6Key, event: { change: updated }"></div>
						</div>
						<div class="control-group">
							<div class="control-label">Railgun:</div><div name="weapon7Key" class="control-input input-key" data-bind="keyinput: weapon7Key, event: { change: updated }"></div>
						</div>
						<div class="control-group">
							<div class="control-label">Plasma gun:</div><div name="weapon8Key" class="control-input input-key" data-bind="keyinput: weapon8Key, event: { change: updated }"></div>
						</div>
						<div class="control-group">
							<div class="control-label">BFG:</div><div name="weapon9Key" class="control-input input-key" data-bind="keyinput: weapon9Key, event: { change: updated }"></div>
						</div>
					</div>

					<div class="tab-pane" id="misc">
						<div class="control-group">
							<div class="control-label">Chat:</div><div name="chatKey" class="control-input input-key" data-bind="keyinput: chatKey, event: { change: updated }"></div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="tab-pane" id="game">
			<div class="control-group">
				<div class="control-label">Autoswitch weapons:</div><div name="autoSwitch" class="control-input input-radio" data-bind="radioinput: autoSwitch, event: { change: updated }"></div>
			</div>

			<div class="control-group">
				<div class="control-label">Net time nudge:</div><div name="timeNudge" class="control-input input-range" min="0" max="30" data-bind="rangeinput: timeNudge, event: { change: updated }"></div>
			</div>
		</div>

		<div class="tab-pane" id="sound">
			<div class="control-group">
				<div class="control-label">Volume:</div><div name="volume" class="control-input input-range" min="0" max="2" data-bind="rangeinput: volume, event: { change: updated }"></div>
			</div>
		</div>
	</div>
</div>