// Copyright 2011 Vineet Kumar

var fs = require('fs');
var repl = require('repl');
var path = require('path');
var ttapi = require('ttapi');

Bot = function(configFile) {
	this.ttapi = null;
	this.configFile = configFile || process.argv[2] || Bot.usage();
	this.config = {};
	this.greetings = {};
	this.logChats = false;
	this.speechHandlers = {};
};

Bot.usage = function() {
	throw "Usage: node " + process.argv[1] + " <config.json>";
};

Bot.prototype.start = function() {
	var self = this;
	fs.readFile(self.configFile, 'utf8', function(err, data) {
		if (err) throw err;
		self.config = JSON.parse(data);
		var prompt = path.basename(self.configFile, path.extname(self.configFile));
		var replContext = repl.start(prompt + "> ").context
		replContext.bot = self;
		self.readGreetings();
		self.ttapi = new ttapi(self.config.auth, self.config.userid, self.config.roomid);
		replContext.say = self.ttapi.speak.bind(self.ttapi);
		self.bindHandlers();
	});
};

Bot.prototype.bindHandlers = function() {
	this.ttapi.on('speak', this.onSpeak.bind(this));
	this.ttapi.on('registered', this.onRegistered.bind(this));
	this.ttapi.on('new_moderator', this.onNewModerator.bind(this));
	this.speechHandlers['help'] = this.onHelp.bind(this);
	this.speechHandlers['commands'] = this.onHelpCommands.bind(this);
};

Bot.prototype.readGreetings = function() {
	var self = this;
	var greetingsPath = path.join(path.dirname(process.argv[2]), self.config.greetings_filename)
	fs.readFile(greetingsPath, 'utf8', function(err, data) {
		if (err) throw err;
		self.greetings = JSON.parse(data);
		console.log('loaded %d greetings', Object.keys(self.greetings).length);
	});
};

/**
  * @param {{name: string, text: string}} data return by ttapi
  */
Bot.prototype.onSpeak = function(data) {
	if (this.debug) {
		console.dir(data);
	}
	if (this.logChats) {
		console.log('chat: %s: %s', data.name, data.text);
	}
        var words = data.text.split(/\s+/);
        var command = words[0].toLowerCase();
        if (command.match(/^[!*\/]/)) {
                command = command.substring(1);
        } else if (Bot.bareCommands.indexOf(data.text) == -1) { // bare commands must match the entire text line
                return;
        }
        var handler = this.speechHandlers[command];
        if (handler) {
                handler(data.text, data.name);
        }
};

Bot.prototype.onHelp = function() {
	this.ttapi.speak(this.config.messages.help.replace(/{room\.name}/g, this.roomInfo.room.name));
};

Bot.prototype.onHelpCommands = function() {
	this.ttapi.speak(
		'commands: ' + Object.keys(this.speechHandlers).map(function(s) { return "*" + s; })).join(', ');
};

Bot.prototype.onRegistered = function(data) {
	if (this.debug) {
		console.dir(data);
	}
	user = data.user[0];
	if (user.userid == this.config.userid) {
		this.ttapi.roomInfo(this.onRoomInfo.bind(this));
	} else {
		this.ttapi.speak(this.greeting(user));
	}
};

Bot.prototype.greeting = function(user) {
	var message = this.greetings[user.userid];
	if (!message && user.created * 1000 > new Date() - 7 * 24 * 3600 * 1000) {
		message = randomElement(this.config.messages.newUserGreetings);
	} else {
		message = randomElement(this.config.messages.defaultGreetings);
	}
	return message.replace(/{user\.name}/g, user.name);
};

randomElement = function(ar) {
	return ar[Math.floor(Math.random() * ar.length)];
};

Bot.prototype.onRoomInfo = function(data) {
	var self = this;
	if (this.debug) {
		console.dir(data);
	}
	this.roomInfo = data;
	this.users = {};
	this.roomInfo.users.forEach(function(user) {
		self.users[user.userid] = user;
	});
};

Bot.prototype.onNewModerator = function(data) {
	if (this.debug) {
		console.dir(data);
	}
	this.ttapi.speak(this.config.messages.newModerator
			.replace(/{user\.name}/g, this.users[data.userid].name)
			.replace(/{room\.name}/g, this.roomInfo.name));
};

Bot.bareCommands = [
	'help',
];

exports.Bot = Bot;

if (process.argv.length > 2) {
	new Bot(process.argv[2]).start();
}
