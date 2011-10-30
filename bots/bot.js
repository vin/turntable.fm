// Copyright 2011 Vineet Kumar

var imports = {
	fs: require('fs'),
	repl: require('repl'),
	path: require('path'),
	ttapi: require('ttapi'),
	conf: require('node-config'),
};

Bot = function(configName) {
	this.ttapi = null;
	this.configName = configName || process.argv[2] || Bot.usage();
	this.config = {};
	this.greetings = {};
	this.logChats = false;
	this.speechHandlers = {};
	this.users = {};
	this.useridsByName = {};
	this.activity = {};
	this.djs = {};
	this.currentSong = null;
	this.greetings = {};
	this.activity = {};
	this.djList = {active: false, list: []};
};

Bot.usage = function() {
	throw "Usage: node " + process.argv[1] + " <config name>";
};

Bot.prototype.onInitConfig = function(cb, err) {
	if (err) throw err;
	this.config = imports.conf;
	if (!this.config.noRepl) {
		var replContext = imports.repl.start(this.configName + "> ").context
		replContext.bot = this;
	}
	this.debug = this.config.debug;
	this.mute = this.config.mute;
	this.readGreetings();
	this.readActivity();
	this.readUsernames();
	this.ttapi = new imports.ttapi(this.config.auth, this.config.userid, this.config.roomid);
	this.bindHandlers();
	if (cb) cb();
};

Bot.prototype.start = function(cb) {
	imports.conf.initConfig(this.onInitConfig.bind(this, cb), this.configName);
};

Bot.prototype.bindHandlers = function() {
	this.ttapi.on('speak', this.onSpeak.bind(this));
	this.ttapi.on('registered', this.onRegistered.bind(this));
	this.ttapi.on('new_moderator', this.onNewModerator.bind(this));
	this.ttapi.on('roomChanged', this.onRoomInfo.bind(this));
	this.ttapi.on('deregistered', this.onDeregister.bind(this));
	this.ttapi.on('add_dj', this.onAddDj.bind(this));
	this.ttapi.on('rem_dj', this.onRemDj.bind(this));
	this.ttapi.on('newsong', this.onNewSong.bind(this));
	this.ttapi.on('nosong', this.onNoSong.bind(this));
	this.ttapi.on('update_votes', this.onUpdateVotes.bind(this));
	this.speechHandlers['help'] = this.onHelp.bind(this);
	this.speechHandlers['commands'] = this.onHelpCommands.bind(this);
	this.speechHandlers['bonus'] = this.onBonus.bind(this);
	this.speechHandlers['album'] = this.onAlbum.bind(this);
	this.speechHandlers['last'] = this.onLast.bind(this);
	this.speechHandlers['list'] = this.onList.bind(this);
	this.speechHandlers['addme'] = this.onAddme.bind(this);
	this.speechHandlers['removeme'] = this.onRemoveme.bind(this);
};

Bot.prototype.readData = function(path, cb, errCb) {
	var fullpath = imports.path.join(imports.path.dirname(process.argv[1]), path);
	imports.fs.readFile(fullpath, 'utf8', function(err, data) {
		if (err) {
			if (errCb) {
				errCb(err);
				return;
			} else {
				throw err;
			}
		}
		var parsed = null;
		try {
			parsed = JSON.parse(data);
		} catch (err) {
			throw "Couldn't parse " + fullpath;
		}
		if (cb) cb(parsed);
	}.bind(this));
};

Bot.prototype.writeData = function(path, data, cb) {
	var fullpath = imports.path.join(imports.path.dirname(process.argv[1]), path);
	imports.fs.writeFile(fullpath, JSON.stringify(data), function(err) {
		if (err) throw err;
		if (cb) cb();
	}.bind(this));
};

Bot.prototype.readGreetings = function() {
	this.readData(this.config.greetings_filename, function(data) {
		this.greetings = data;
		console.log('loaded %d greetings', Object.keys(this.greetings).length);
	}.bind(this));
};

Bot.prototype.readActivity = function() {
	this.readData(this.config.activity_filename, function(data) {
		this.activity = data;
		console.log('loaded %d activity records', Object.keys(this.activity).length);
	}.bind(this));
};

Bot.prototype.writeActivity = function() {
	if (this.config.activity_filename) {
		this.writeData(this.config.activity_filename, this.activity,
			console.log.bind(this, 'Activity data saved to %s', this.config.activity_filename));
	};
};

Bot.prototype.readUsernames = function() {
	this.readData(this.config.usernames_filename, function(data) {
		this.useridsByName = data;
		console.log('loaded %d usernames', Object.keys(this.useridsByName).length);
	}.bind(this));
};

Bot.prototype.writeUsernames = function() {
	if (this.config.usernames_filename) {
		this.writeData(this.config.usernames_filename, this.useridsByName,
			console.log.bind(this, 'Username map saved to %s', this.config.usernames_filename));
	};
};

Bot.prototype.readDjList = function() {
	this.djList = {active: false, list: []};
	if (this.roomInfo.room) {
		var filename = this.config.djlist_filename.replace(/{roomid}/g, this.roomInfo.room.roomid);
		var onData = function(data) {
			this.djList = data;
			console.log('loaded dj list: %s', this.djList);
		}.bind(this);
		var onErr = console.log.bind(this, 'no DJ list for room %s: %s', this.roomInfo.room.roomid);
		this.readData(filename, onData, onErr);
	}
};

Bot.prototype.writeDjList = function() {
	var filename = this.config.djlist_filename.replace(/{roomid}/g, this.roomInfo.room.roomid);
	this.writeData(filename, this.djList,
		console.log.bind(this, 'DJ list saved to %s', filename));
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
	this.recordActivity(data.userid);
        var words = data.text.split(/\s+/);
        var command = words[0].toLowerCase();
        if (command.match(/^[!*\/]/)) {
                command = command.substring(1);
        } else if (Bot.bareCommands.indexOf(data.text) == -1) { // bare commands must match the entire text line
                return;
        }
        var handler = this.speechHandlers[command];
        if (handler) {
                handler(data.text, data.userid, data.name);
        }
};

Bot.prototype.onHelp = function() {
	this.say(this.config.messages.help);
};

Bot.prototype.onHelpCommands = function() {
	this.say('commands: ' +
			Object.keys(this.speechHandlers).map(function(s) { return "*" + s; }).join(', '));
};

Bot.prototype.onBonus = function(text, userid, username) {
	if (!this.currentSong) {
	       return;
	}
	if (this.currentSong.bonusBy) {
		this.say(this.config.messages.bonusAlreadyUsed
				.replace(/{user.name}/g, this.users[this.currentSong.bonusBy].name));
	} else {
		this.ttapi.vote('up');
		this.currentSong.bonusBy = userid;
		this.say(this.config.messages.bonus
				.replace(/{user.name}/g, this.users[this.currentSong.bonusBy].name)
				.replace(/{dj.name}/g, this.users[this.roomInfo.room.metadata.current_dj].name));
	}
};

Bot.prototype.onAlbum = function() {
	if (this.currentSong) {
		this.say(this.config.messages.album
				.replace(/{song}/g, this.currentSong.song.metadata.song)
				.replace(/{artist}/g, this.currentSong.song.metadata.artist)
				.replace(/{album}/g, this.currentSong.song.metadata.album || "(unknown)"));
	}
};

/**
  * Pulls the command off the front of a line of text.
  * @return a 2-element list of [command, rest]
  */
Bot.splitCommand = function(text) {
	var i = text.search(/\s/);
	if (i == -1) {
		return [text, ''];
	}
	return [text.substr(0, i), text.substr(i).trimLeft()];
};

Bot.prototype.onLast = function(text, unused_userid, unused_username) {
	var subject_name = Bot.splitCommand(text)[1];
	if (!subject_name) {
		this.say("Usage: " + Bot.splitCommand(text)[0] + " <username>");
		return;
	}
	var last = null;
	var userid = this.useridsByName[subject_name];
	if (userid) {
		last = this.activity[userid];
	}
	if (last) {
		var age_ms = new Date() - new Date(last);
		var age_h = Math.floor(age_ms / 1000 / 3600);
		this.say(this.config.messages.lastActivity
				.replace(/{user\.name}/g, subject_name)
				.replace(/{age}/g, age_h + " hours"));
	} else {
		this.say(this.config.messages.lastActivityUnknown.replace(/{user\.name}/g, subject_name));
	}
};

Bot.prototype.lookupUsername = function(userid) {
	return this.users[userid].name;
};

Bot.prototype.onList = function(text, userid, username) {
	if (!this.djList.active) {
		this.say(this.config.messages.listInactive);
		return;
	}
	if (this.djList.list.length) {
		this.say(this.config.messages.list
				.replace(/{list}/g, this.djList.list.map(this.lookupUsername.bind(this)).join(', ')));
	} else {
		this.say(this.config.messages.listEmpty);
	}
};

Bot.prototype.onAddme = function(text, userid, username) {
	if (!this.djList.active) {
		this.say(this.config.messages.listInactive);
		return;
	}
	if (this.djList.list.indexOf(userid) != -1) {
		this.say(this.config.messages.listAlreadyOn
				.replace(/{user.name}/g, username)
				.replace(/{position}/g, this.djList.list.indexOf(userid) + 1));
		return;
	}
	this.djList.list.push(userid);
	this.writeDjList();
	this.say(this.config.messages.listAdded
			.replace(/{user.name}/g, username)
			.replace(/{position}/g, this.djList.list.length));
};

Bot.prototype.onRemoveme = function(text, userid, username) {
	var i = this.djList.list.indexOf(userid);
	if (i != -1) {
		this.djList.list.splice(i, 1);
		this.writeDjList();
		this.say(this.config.messages.listRemoved
				.replace(/{user.name}/g, username)
				.replace(/{position}/g, i + 1));
	} else {
		this.say(this.config.messages.listRemoveNotListed
				.replace(/{user.name}/g, username));
	}
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
	if (this.debug) {
		console.dir(data);
	}
	this.roomInfo = data;
	this.users = {};
	this.readDjList();
	if (data.success) {
		this.roomInfo.users.forEach(function(user) {
			this.users[user.userid] = user;
			this.useridsByName[user.name] = user.userid;
		}, this);
		this.writeUsernames();
		if (!this.currentSong) {
			this.currentSong = new SongStats(
					data.room.metadata.current_song,
					this.users[data.room.metadata.current_dj]);
			this.currentSong.updateVotes(data.room.metadata);
		}
	}
};

Bot.prototype.refreshRoomInfo = function(cb) {
	this.ttapi.roomInfo(function(data) {
		this.onRoomInfo.call(this, data);
		if (cb) cb.call(this, data);
	}.bind(this));
};

Bot.prototype.onDeregister = function(data) {
	if (this.debug) {
		console.dir(data);
	}
	if (data.userid == this.config.userid) {
		this.roomInfo = null;
		this.users = {};
	} else {
		this.refreshRoomInfo();
	}
};

Bot.prototype.say = function(msg) {
	if (!msg) return;
	var message = msg
		.replace(/{room\.name}/g, this.roomInfo.room.name)
		.replace(/{bot\.name}/g, this.users[this.config.userid].name);
	if (this.debug) {
		console.log("say: %s", message);
	}
	if (!this.mute) {
		this.ttapi.speak(message);
	}
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
	var userid = data.room.metadata.current_dj;
	var dj = this.djs[userid] || (this.djs[userid] = new DjStats(this.users[userid]));
	this.djs[userid].play(song);
	this.finishSong();
	this.currentSong = new SongStats(song, this.users[song.djid]);
};

Bot.prototype.finishSong = function() {
	if (this.currentSong) {
		var message = this.config.messages.songSummary;
		this.say(message
			.replace(/{user\.name}/g, this.currentSong.dj.name)
			.replace(/{awesomes}/g, this.currentSong.votes.upvotes)
			.replace(/{lames}/g, this.currentSong.votes.downvotes)
			.replace(/{song}/g, this.currentSong.song.metadata.song)
			.replace(/{artist}/g, this.currentSong.song.metadata.artist)
			.replace(/{album}/g, this.currentSong.song.metadata.album));
	}
};

Bot.prototype.onUpdateVotes = function(data) {
	if (this.debug) {
		console.dir(data);
	}
	this.recordActivity(data.room.metadata.votelog[0][0]);
	if (this.currentSong) {
		this.currentSong.updateVotes(data.room.metadata);
	} else {
		this.refreshRoomInfo();
	}
};

Bot.prototype.onNoSong = function(data) {
	if (this.debug) {
		console.dir(data);
	}
	this.finishSong();
	this.currentSong = null;
};

Bot.bareCommands = [
	'help',
];

Bot.prototype.recordActivity = function(userid) {
	if (userid == this.config.userid) return;
	this.activity[userid] = new Date();
	this.writeActivity();
};

SongStats = function(song, dj) {
	this.song = song;
	this.votes = {};
	this.dj = dj;
};

SongStats.prototype.updateVotes = function(votes) {
	this.votes.upvotes = votes.upvotes;
	this.votes.downvotes = votes.downvotes;
	this.votes.votelog = votes.votelog;
};

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
