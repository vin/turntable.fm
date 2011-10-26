// Copyright 2011 Vineet Kumar

var imports = {
	fs: require('fs'),
	repl: require('repl'),
	path: require('path'),
	ttapi: require('ttapi'),
};

Bot = function(configFile) {
	this.ttapi = null;
	this.configFile = configFile || process.argv[2] || Bot.usage();
	this.config = {};
	this.greetings = {};
	this.logChats = false;
	this.speechHandlers = {};
	this.djs = {};
};

Bot.usage = function() {
	throw "Usage: node " + process.argv[1] + " <config.json>";
};

Bot.prototype.start = function(cb) {
	var self = this;
	imports.fs.readFile(self.configFile, 'utf8', function(err, data) {
		if (err) throw err;
		self.config = JSON.parse(data);
		var prompt = imports.path.basename(self.configFile, imports.path.extname(self.configFile));
		if (!self.config.noRepl) {
			var replContext = imports.repl.start(prompt + "> ").context
			replContext.bot = self;
		}
		self.readGreetings();
		self.ttapi = new imports.ttapi(self.config.auth, self.config.userid, self.config.roomid);
		self.bindHandlers();
		if (cb) cb();
	});
};

Bot.prototype.bindHandlers = function() {
	this.ttapi.on('speak', this.onSpeak.bind(this));
	this.ttapi.on('registered', this.onRegistered.bind(this));
	this.ttapi.on('new_moderator', this.onNewModerator.bind(this));
	this.ttapi.on('roomChanged', this.onRoomInfo.bind(this));
	this.ttapi.on('add_dj', this.onAddDj.bind(this));
	this.ttapi.on('rem_dj', this.onRemDj.bind(this));
	this.ttapi.on('newsong', this.onNewSong.bind(this));
	this.ttapi.on('nosong', this.onNoSong.bind(this));
	this.speechHandlers['help'] = this.onHelp.bind(this);
	this.speechHandlers['commands'] = this.onHelpCommands.bind(this);
};

Bot.prototype.readGreetings = function() {
	var self = this;
	var greetingsPath = imports.path.join(imports.path.dirname(process.argv[2]), self.config.greetings_filename)
	imports.fs.readFile(greetingsPath, 'utf8', function(err, data) {
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
	this.say(this.config.messages.help);
};

Bot.prototype.onHelpCommands = function() {
	this.say('commands: ' +
			Object.keys(this.speechHandlers).map(function(s) { return "*" + s; })).join(', ');
};

Bot.prototype.onRegistered = function(data) {
	if (this.debug) {
		console.dir(data);
	}
	user = data.user[0];
	if (user.userid != this.config.userid) {
		this.refreshRoomInfo();
		this.say(this.greeting(user));
	}
};

Bot.prototype.greeting = function(user) {
	var message = this.greetings[user.userid];
	if (!message && user.created * 1000 > new Date() - 7 * 24 * 3600 * 1000) {
		message = randomElement(this.config.messages.newUserGreetings);
	}
	if (!message) {
		message = randomElement(this.config.messages.defaultGreetings);
	}
	return message.replace(/{user\.name}/g, user.name);
};

Bot.prototype.djAnnouncement = function(user) {
	var message;
	if (user.points == 0) {
		message = randomElement(this.config.messages.newDjAnnouncements);
	} else {
		message = randomElement(this.config.messages.djAnnouncements);
	}
	return message
		.replace(/{user\.name}/g, user.name)
		.replace(/{user\.points}/g, user.points)
		.replace(/{user\.fans}/g, user.fans);
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

Bot.prototype.refreshRoomInfo = function(cb) {
	var self = this;
	this.ttapi.roomInfo(function(data) {
		self.onRoomInfo.call(self, data);
		if (cb) cb.call(self, data);
	});
};

Bot.prototype.say = function(msg) {
	if (!msg) return;
	var message = msg
		.replace(/{room\.name}/g, this.roomInfo.room.name)
		.replace(/{bot\.name}/g, this.users[this.config.userid].name);
	if (this.debug) {
		console.log("say: %s", message);
	}
	this.ttapi.speak(message);
};

Bot.prototype.onNewModerator = function(data) {
	if (this.debug) {
		console.dir(data);
	}
	this.say(this.config.messages.newModerator
		.replace(/{user\.name}/g, this.users[data.userid].name));
};

Bot.prototype.onAddDj = function(data) {
	if (this.debug) {
		console.dir(data);
	}
	var user = data.user[0];
	this.djs[user.userid] = new DjStats(user);
	this.say(this.djAnnouncement(user));
};

Bot.prototype.djSummary = function(stats) {
	var message = randomElement(this.config.messages.djSummaries);
	return message
		.replace(/{user\.name}/g, stats.user.name)
		.replace(/{user\.points}/g, stats.user.points)
		.replace(/{lames}/g, stats.lames)
		.replace(/{gain}/g, stats.gain)
		.replace(/{plays}/g, stats.plays);

};

Bot.prototype.onRemDj = function(data) {
	if (this.debug) {
		console.dir(data);
	}
	var user = data.user[0];
	var stats = this.djs[user.userid];
	if (stats) {
		stats.update(user);
		delete this.djs[user.userid];
		this.say(this.djSummary(stats));
	}
};

Bot.prototype.onNewSong = function(data) {
	if (this.debug) {
		console.dir(data);
	}
	var song = data.room.metadata.current_song;
	var user = data.room.metadata.current_dj;
	var dj = this.djs[user] || (this.djs[user] = new DjStats(user));
	this.djs[user].play(song);
	this.finishSong(song);
};

Bot.prototype.finishSong = function(newSong) {
	if (this.lastSong) {
		var message = this.config.messages.songSummary;
		this.say(message
			.replace(/{user\.name}/g, this.users[this.lastSong.djid].name)
			.replace(/{song}/g, this.lastSong.metadata.song)
			.replace(/{artist}/g, this.lastSong.metadata.artist)
			.replace(/{album}/g, this.lastSong.metadata.album));
	}
	this.lastSong = newSong;
};

Bot.prototype.onNoSong = function(data) {
	if (this.debug) {
		console.dir(data);
	}
	this.finishSong(null);
};

Bot.bareCommands = [
	'help',
];

DjStats = function(user) {
	this.user = user;
	this.lames = 0;
	this.plays = 0;
	this.gain = 0;
};

DjStats.prototype.update = function(user) {
	this.gain += (user.points - this.user.points);
	this.user = user;
}

DjStats.prototype.play = function(song) {
	++this.plays;
};

exports.Bot = Bot;
exports.imports = imports;

if (process.argv.length > 2) {
	new Bot(process.argv[2]).start();
}
