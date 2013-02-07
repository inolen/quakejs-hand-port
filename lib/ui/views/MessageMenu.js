var MAX_CONSOLE_EVENTS = 6;

var MessageModel = Backbone.Model.extend({
	defaults: function () {
		return {
			events: [],
			text: ''
		};
	}
});

var MessageMenu = UIView.extend({
	model: null,
	template: _.template('{{ include ../templates/MessageMenu.tpl }}'),
	events: {
		'change [name="say"]': 'textChanged',
		'blur [name="say"]': 'textBlur'
	},
	$say: null,
	initialize: function () {
		this.model = new MessageModel();

		this.model.on('change:events', this.update, this);

		this.render();
	},
	opened: function () {
		// Reset the text.
		this.$say[0].qk_text.val('');

		FocusElement(this.$say.get(0));
	},
	textChanged: function (ev) {
		var text = ev.value;
		if (text === '') {
			return;
		}

		// Escape quotes in text.
		text = text.replace(/"/g, '\\"');

		var cmd = 'say "' + text + '"';
		CL.ExecuteBuffer(cmd);
	},
	textBlur: function (ev) {
		PopMenu();
	},
	addEvent: function (ev) {
		var self = this;
		var events = this.model.get('events');

		// Shift one off the stack if we're full.
		if (events.length >= MAX_CONSOLE_EVENTS) {
			events.shift();
		}

		// Add event to stack.
		events.push(ev);

		// Manually trigger update.
		this.model.trigger('change:events', this, events);
	},
	update: function () {
		this.render();
	},
	renderView: function () {
		var data = this.model.toJSON();

		this.$el.html(this.template(data));

		this.$say = this.$el.find('[name="say"]');

		return this;
	}
});