// Copyright 2011 Vineet Kumar

var imports = {
	repl: require('repl'),
	ttapi: require('ttapi'),
	conf: require('node-config'),
	banlist: require('./banlist'),
	djlist: require('./djlist'),
	Store: require('./store').Store,
	stats: require('./stats')
};

Bot = function(configName) {
	this.ttapi = null;
	this.configName = configName || process.argv[2] || Bot.usage();
	this.config = {};
	this.logChats = false;
	this.speechHandlers = {};
	this.users = {};
	this.useridsByName = {};
	this.usernamesById = {};
	this.activity = {};
	this.djs = {};
	/** @type SongStats */
	this.currentSong = null;
	this.pendingGreetings = {};
	this.greetings = {};
	this.activity = {};
	this.djList = new imports.djlist.DjList();
	this.banList = null;
};

Bot.usage = function() {
	throw "Usage: node " + process.argv[1] + " <config name>";
};

Bot.prototype.onInitConfig = function(cb, err) {
	if (err) { throw err; }
	this.config = imports.conf;
	if (!this.config.noRepl) {
		var replContext = imports.repl.start(this.configName + "> ").context;
		replContext.bot = this;
		replContext.imports = imports;
	}
	this.debug = this.config.debug;
	this.mute = this.config.mute;
	this.readGreetings();
	this.readActivity();
	this.readUsernames();
	this.ttapi = new imports.ttapi(this.config.auth, this.config.userid, this.config.roomid);
	this.bindHandlers();
	if (cb) { cb(); }
};

Bot.prototype.start = function(cb) {
	imports.conf.initConfig(this.onInitConfig.bind(this, cb), this.configName);
};

Bot.prototype.bindHandlers = function() {
	this.ttapi.on('speak', this.onSpeak.bind(this));
	this.ttapi.on('registered', this.onRegistered.bind(this));
	this.ttapi.on('new_moderator', this.onNewModerator.bind(this));
	this.ttapi.on('roomChanged', this.onRoomInfo.bind(this));
	this.ttapi.on('roomChanged', this.initDjList.bind(this));
	this.ttapi.on('roomChanged', this.initBanList.bind(this));
	this.ttapi.on('deregistered', this.onDeregister.bind(this));
	this.ttapi.on('add_dj', this.onAddDj.bind(this));
	this.ttapi.on('rem_dj', this.onRemDj.bind(this));
	this.ttapi.on('newsong', this.onNewSong.bind(this));
	this.ttapi.on('nosong', this.onNoSong.bind(this));
	this.ttapi.on('update_votes', this.onUpdateVotes.bind(this));
	this.speechHandlers['help'] = this.onHelp.bind(this);
	this.speechHandlers['commands'] = this.onHelpCommands.bind(this);
	this.speechHandlers['mod-commands'] = this.onHelpModCommands.bind(this);
	this.speechHandlers['bonus'] = this.onBonus.bind(this);
	this.speechHandlers['bonys'] = this.onBonus.bind(this);
	this.speechHandlers['album'] = this.onAlbum.bind(this);
	this.speechHandlers['last'] = this.onLast.bind(this);
	this.speechHandlers['plays'] = this.onPlays.bind(this);
	this.speechHandlers['list'] = this.onList.bind(this);
	this.speechHandlers['list-on'] = this.onListOn.bind(this);
	this.speechHandlers['list-off'] = this.onListOff.bind(this);
	this.speechHandlers['list-reset'] = this.onListReset.bind(this);
	this.speechHandlers['addme'] = this.onAddme.bind(this);
	this.speechHandlers['add-first'] = this.onAddFirst.bind(this);
	this.speechHandlers['removeme'] = this.onRemoveme.bind(this);
	this.speechHandlers['remove'] = this.onRemove.bind(this);
	this.speechHandlers['remove-first'] = this.onRemoveFirst.bind(this);
	this.speechHandlers['ban'] = this.onBan.bind(this);
	this.speechHandlers['unban'] = this.onUnban.bind(this);
	this.speechHandlers['bans'] = this.onBans.bind(this);
	this.speechHandlers['banned'] = this.onBanned.bind(this);
	this.speechHandlers['greet'] = this.onGreet.bind(this);
	this.speechHandlers['approve-greeting'] = this.onApproveGreeting.bind(this);
	this.speechHandlers['show-greeting'] = this.onShowGreeting.bind(this);
	this.speechHandlers['reject-greeting'] = this.onRejectGreeting.bind(this);
	this.speechHandlers['pending-greetings'] = this.onPendingGreetings.bind(this);
};

Bot.prototype.readGreetings = function() {
	imports.Store.read(this.config.greetings_filename, function(data) {
		this.greetings = data;
		console.log('loaded %d greetings', Object.keys(this.greetings).length);
	}.bind(this));
	imports.Store.read(this.config.pending_greetings_filename, function(data) {
		this.pendingGreetings = data;
		console.log('loaded %d pending greetings', Object.keys(this.pendingGreetings).length);
	}.bind(this));
};

Bot.prototype.writeGreetings = function() {
	imports.Store.write(this.config.greetings_filename, this.greetings,
		console.log.bind(this, 'saved %d greetings to %s',
		       	Object.keys(this.greetings).length, this.config.greetings_filename));
};

Bot.prototype.writePendingGreetings = function() {
	imports.Store.write(this.config.pending_greetings_filename, this.pendingGreetings,
		console.log.bind(this, 'saved %d pending greetings to %s',
		       	Object.keys(this.pendingGreetings).length, this.config.pending_greetings_filename));
};

Bot.prototype.readActivity = function() {
	imports.Store.read(this.config.activity_filename, function(data) {
		this.activity = data;
		console.log('loaded %d activity records', Object.keys(this.activity).length);
	}.bind(this));
};

Bot.prototype.writeActivity = function() {
	if (this.config.activity_filename) {
		imports.Store.write(this.config.activity_filename, this.activity,
			console.log.bind(this, 'Activity data saved to %s', this.config.activity_filename));
	}
};

Bot.prototype.readUsernames = function() {
	imports.Store.read(this.config.usernames_filename, function(data) {
		this.usernamesById = data;
		for (var userid in this.usernamesById) {
			this.useridsByName[this.usernamesById[userid]] = userid;
		}
		console.log('loaded %d usernames', Object.keys(this.usernamesById).length);
	}.bind(this));
};

Bot.prototype.writeUsernames = function() {
	if (this.config.usernames_filename) {
		imports.Store.write(this.config.usernames_filename, this.usernamesById,
			console.log.bind(this, 'Username map saved to %s', this.config.usernames_filename));
	}
};

/**
  * @param {{name: string, userid: string, text: string}} data return by ttapi
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
        } else if (Bot.bareCommands.indexOf(data.text) === -1) { // bare commands must match the entire text line
                return;
        }
	if (Bot.moderatorCommands.indexOf(command) !== -1) {
		if (this.roomInfo.room.metadata.moderator_id.indexOf(data.userid) === -1) {
			return;
		}
	}
	if (command in this.speechHandlers) {
                this.speechHandlers[command](data.text, data.userid, data.name);
	}
};

Bot.prototype.onHelp = function() {
	this.say(this.config.messages.help);
};

Bot.prototype.onHelpCommands = function() {
	this.say('commands: ' +
			Object.keys(this.speechHandlers)
				.filter(function(s) { return Bot.moderatorCommands.indexOf(s) === -1})
				.map(function(s) { return "*" + s; }).join(', '));
};

Bot.prototype.onHelpModCommands = function() {
	this.say('moderator commands: ' +
			Object.keys(this.speechHandlers)
				.filter(function(s) { return Bot.moderatorCommands.indexOf(s) !== -1})
				.map(function(s) { return "*" + s; }).join(', '));
};

Bot.prototype.onBonus = function(text, userid, username) {
	if (!this.currentSong) {
	       return;
	}
	if (this.currentSong.dj.userid === userid) {
		this.say(this.config.messages.selfBonus
				.replace(/{user\.name\}/g, username));
	} else if (this.currentSong.bonusBy) {
		this.say(this.config.messages.bonusAlreadyUsed
				.replace(/\{user.name\}/g, this.lookupUsername(this.currentSong.bonusBy)));
	} else {
		this.ttapi.vote('up');
		this.currentSong.bonusBy = userid;
		this.say(this.config.messages.bonus
				.replace(/\{user.name\}/g, this.lookupUsername(this.currentSong.bonusBy))
				.replace(/\{dj.name\}/g, this.currentSong.dj.name));
	}
};

Bot.prototype.onAlbum = function() {
	if (this.currentSong && this.currentSong.song) {
		this.say(this.config.messages.album
				.replace(/\{song\}/g, this.currentSong.song.metadata.song)
				.replace(/\{artist\}/g, this.currentSong.song.metadata.artist)
				.replace(/\{album\}/g, this.currentSong.song.metadata.album || "(unknown)"));
	}
};

/**
  * Pulls the command off the front of a line of text.
  * @return a 2-element list of [command, rest]
  */
Bot.splitCommand = function(text) {
	var i = text.search(/\s/);
	if (i === -1) {
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
		var age_m = Math.floor(age_ms / 1000 / 60);
		var age = age_m + " minutes";
		if (age_m > 120) {
			age = Math.floor(age_m / 60) + " hours";
		}
		this.say(this.config.messages.lastActivity
				.replace(/\{user\.name\}/g, subject_name)
				.replace(/\{age\}/g, age));
	} else {
		this.say(this.config.messages.lastActivityUnknown.replace(/\{user\.name\}/g, subject_name));
	}
};

Bot.prototype.lookupUsername = function(userid) {
	return this.usernamesById[userid] || "(unknown)";
};

Bot.prototype.onPlays = function(text, userid, username) {
	var userid = bot.currentSong.dj.userid;
	var subject_name = Bot.splitCommand(text)[1];
	if (subject_name) {
		userid = this.useridsByName[subject_name];
	}
	var stats = this.djs[userid];
	if (stats) {
		this.say(this.djSummary(stats));
	}
};

Bot.prototype.onList = function(text, userid, username) {
	if (!this.djList.active) {
		this.say(this.config.messages.listInactive);
		return;
	}
	if (this.djList.length()) {
		this.say(this.config.messages.list
				.replace(/\{list\}/g, this.djList.list.map(this.lookupUsername.bind(this)).join(', ')));
	} else {
		this.say(this.config.messages.listEmpty);
	}
};

Bot.prototype.onListOn = function(text, userid, username) {
	if (this.djList.active) {
		this.say(this.config.messages.listAlreadyOn);
	} else {
		this.djList.active = true;
		this.djList.save(this.config.djlist_filename);
		this.say(this.config.messages.listOn);
	}
};

Bot.prototype.onListOff = function(text, userid, username) {
	if (this.djList.active) {
		this.djList.active = false;
		this.djList.save(this.config.djlist_filename);
		this.say(this.config.messages.listOff);
	} else {
		this.say(this.config.messages.listAlreadyOff);
	}
};

Bot.prototype.onListReset = function(text, userid, username) {
	if (this.djList) {
		this.djList.list = [];
		this.say(this.config.messages.listReset);
	}
};

Bot.prototype.onAddme = function(text, userid, username) {
	if (!this.djList.active) {
		this.say(this.config.messages.listInactive);
		return;
	}
	var position = this.djList.add(userid);
	if (position < 0) {
		this.say(this.config.messages.listAlreadyListed
				.replace(/\{user.name\}/g, username)
				.replace(/\{position\}/g, -position));
		return;
	}
	this.djList.save(this.config.djlist_filename);
	this.say(this.config.messages.listAdded
			.replace(/\{user.name\}/g, username)
			.replace(/\{position\}/g, position));
};

Bot.prototype.onAddFirst = function(text, userid, username) {
	if (!this.djList.active) {
		this.say(this.config.messages.listInactive);
		return;
	}
	var subject_name = Bot.splitCommand(text)[1];
	if (!subject_name) {
		this.say("Usage: " + Bot.splitCommand(text)[0] + " <username>");
		return;
	}
	var subjectid = this.useridsByName[subject_name];
	if (subjectid) {
		this.djList.addFirst(subjectid);
		this.djList.save(this.config.djlist_filename);
		this.say(this.config.messages.listAdded
				.replace(/\{user.name\}/g, subject_name)
				.replace(/\{position\}/g, 1));
	} else {
		this.say(this.config.messages.unknownUser
				.replace(/\{user.name\}/g, subject_name));
	}
};

Bot.prototype.onRemoveme = function(text, userid, username) {
	var i = this.djList.remove(userid);
	if (i !== -1) {
		this.djList.save(this.config.djlist_filename);
		this.say(this.config.messages.listRemoved
				.replace(/\{user.name\}/g, username)
				.replace(/\{position\}/g, i + 1));
	} else {
		this.say(this.config.messages.listRemoveNotListed
				.replace(/\{user.name\}/g, username));
	}
};

Bot.prototype.onRemove = function(text, userid, username) {
	var subject_name = Bot.splitCommand(text)[1];
	if (!subject_name) {
		this.say("Usage: " + Bot.splitCommand(text)[0] + " <username>");
		return;
	}
	var subjectid = this.useridsByName[subject_name];
	this.onRemoveme(text, subjectid, subject_name);
};

Bot.prototype.onRemoveFirst = function(text, userid, username) {
	var userid = this.djList.removeFirst;
	if (userid) {
		this.say(this.config.messages.listRemoved
				.replace(/\{user\.name\}/g, this.lookupUsername(userid))
				.replace(/\{position\}/g, 1));
	} else {
		this.say(this.config.messages.listEmpty);
	}
};

Bot.prototype.onBan = function(text, userid, username) {
	var args = Bot.splitCommand(text)[1];
	if (!args) {
		this.say("Usage: " + Bot.splitCommand(text)[0] + " <username>, <comment>");
		return;
	}
	var split = args.split(/,(.+)/);
	var subject_name = split[0];
	var comment = split[1] || "";
	var subjectid = this.useridsByName[subject_name];
	if (!subjectid) { return; }
	this.banList.ban(subjectid, comment + " -- " + username + " " + new Date());
	this.banList.save(this.config.banlist_filename);
	this.say(this.config.messages.ban
			.replace(/\{user\.name\}/g, subject_name)
			.replace(/\{banner\.name\}/g, username)
			.replace(/\{ban\.comment\}/g, comment));
};

Bot.prototype.onBans = function(text, userid, username) {
	var bans = this.banList.list();
	this.say(this.config.messages.bans
			.replace(/\{ban\.count\}/g, Object.keys(bans).length)
			.replace(/\{ban\.list\}/g, bans.map(this.lookupUsername.bind(this)).join(', ')));
};

Bot.prototype.onBanned = function(text, userid, username) {
	var subject_name = Bot.splitCommand(text)[1];
	if (!subject_name) {
		this.say("Usage: " + Bot.splitCommand(text)[0] + " <username>");
		return;
	}
	var subjectid = this.useridsByName[subject_name];
	var comment = this.banList.query(subjectid);
	if (!comment) {
		this.say(this.config.messages.notBanned
				.replace(/\{user\.name\}/g, subject_name));
	} else {
		this.say(this.config.messages.banned
				.replace(/\{user\.name\}/g, subject_name)
				.replace(/\{ban\.comment\}/g, comment));
	}
};

Bot.prototype.onUnban = function(text, userid, username) {
	var subject_name = Bot.splitCommand(text)[1];
	if (!subject_name) {
		this.say("Usage: " + Bot.splitCommand(text)[0] + " <username>");
		return;
	}
	var subjectid = this.useridsByName[subject_name];
	var comment = this.banList.query(subjectid);
	if (!comment) {
		this.say(this.config.messages.notBanned
				.replace(/\{user\.name\}/g, subject_name));
	} else {
		this.banList.unban(subjectid);
		this.banList.save(this.config.banlist_filename);
		this.say(this.config.messages.unbanned
				.replace(/\{user\.name\}/g, subject_name));
	}
};

Bot.prototype.onGreet = function(text, userid, username) {
	var greeting = Bot.splitCommand(text)[1];
	if (!greeting || greeting.indexOf(username) === -1) {
		this.say("Usage: " + Bot.splitCommand(text)[0] + " <greeting> -- greeting must contain your name.")
		return;
	}
	this.pendingGreetings[userid] = greeting.replace(username, "{user.name}");
	this.writePendingGreetings();
	this.say("(pending approval): " + greeting.replace(/\{user.name\}/g, username));
};

Bot.prototype.onApproveGreeting = function(text, userid, username) {
	var subject_name = Bot.splitCommand(text)[1];
	if (!subject_name) {
		this.say("Usage: " + Bot.splitCommand(text)[0] + " <username>");
		return;
	}
	var subjectid = this.useridsByName[subject_name];
	if (subjectid && this.pendingGreetings[subjectid]) {
		this.greetings[subjectid] = this.pendingGreetings[subjectid];
		delete this.pendingGreetings[subjectid];
		this.writeGreetings();
		this.writePendingGreetings();
		this.say(this.greeting({name: subject_name, userid: subjectid}));
	}
};

Bot.prototype.onShowGreeting = function(text, userid, username) {
	var subject_name = Bot.splitCommand(text)[1];
	if (!subject_name) {
		this.say("Usage: " + Bot.splitCommand(text)[0] + " <username>");
		return;
	}
	var subjectid = this.useridsByName[subject_name];
	if (!subjectid) {
	       return;
	}
	if (this.pendingGreetings[subjectid]) {
		this.say("(pending approval): " + this.pendingGreetings[subjectid].replace(/\{user.name\}/g, subject_name));
	} else if (this.greetings[subjectid]) {
		this.say("(approved): " + this.greetings[subjectid].replace(/\{user.name\}/g, subject_name));
	}
};

Bot.prototype.onRejectGreeting = function(text, userid, username) {
	var subject_name = Bot.splitCommand(text)[1];
	if (!subject_name) {
		this.say("Usage: " + Bot.splitCommand(text)[0] + " <username>");
		return;
	}
	var subjectid = this.useridsByName[subject_name];
	if (!subjectid) {
	       return;
	}
	if (subjectid in this.pendingGreetings) {
		delete this.pendingGreetings[subjectid];
		this.writePendingGreetings();
		this.say(this.config.messages.pendingGreetingRejected.replace(/\{user.name\}/g, subject_name));
	} else if (subjectid in this.greetings) {
		delete this.greetings[subjectid];
		this.writeGreetings();
		this.say(this.config.messages.greetingRejected.replace(/\{user.name\}/g, subject_name));
	} else {
		this.say(this.config.messages.noGreeting.replace(/\{user.name\}/g, subject_name));
	}
};

Bot.prototype.onPendingGreetings = function(text, userid, username) {
	this.say(this.config.messages.pendingGreetings
			.replace(/\{list\}/,
			       	Object.keys(this.pendingGreetings).map(this.lookupUsername.bind(this)).join(', ')));
};


Bot.prototype.onRegistered = function(data) {
	if (this.debug) {
		console.dir(data);
	}
	user = data.user[0];
	if (user.userid !== this.config.userid) {
		this.recordActivity(user.userid);
		this.refreshRoomInfo();
		if (this.banList) {
			var ban_comment = this.banList.query(user.userid);
			if (ban_comment) {
				this.say(this.config.messages.banned
						.replace(/\{user\.name\}/g, subject_name)
						.replace(/\{ban\.comment\}/g, ban_comment));
				this.ttapi.bootUser(user.userid, banned_reason);
				return;
			}
		}
		this.say(this.greeting(user));
	}
};

MS_FROM_S = 1000;
S_FROM_M = 60;
M_FROM_H = 60;
H_FROM_D = 24;
D_FROM_W = 7;
MS_FROM_W = MS_FROM_S * S_FROM_M * M_FROM_H * H_FROM_D * D_FROM_W;

Bot.prototype.greeting = function(user) {
	var message = this.greetings[user.userid];
	var now = new Date();
	var aWeekAgo = new Date().setDate(now.getDate() - 7);
	if (!message && (new Date(MS_FROM_S * user.created) > aWeekAgo)) {
		message = randomElement(this.config.messages.newUserGreetings);
	}
	if (!message) {
		message = randomElement(this.config.messages.defaultGreetings);
	}
	return message.replace(/\{user\.name\}/g, user.name);
};

Bot.prototype.djAnnouncement = function(user) {
	var message;
	if (user.points === 0) {
		message = randomElement(this.config.messages.newDjAnnouncements);
	} else {
		message = randomElement(this.config.messages.djAnnouncements);
	}
	return message
		.replace(/\{user\.name\}/g, user.name)
		.replace(/\{user\.points\}/g, user.points)
		.replace(/\{user\.fans\}/g, user.fans);
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
	if (data.success) {
		this.roomInfo.users.forEach(function(user) {
			this.users[user.userid] = user;
			this.useridsByName[user.name] = user.userid;
			this.usernamesById[user.userid] = user.name;
		}, this);
		this.writeUsernames();
		if (!this.currentSong) {
			this.currentSong = new imports.stats.SongStats(
					data.room.metadata.current_song,
					this.users[data.room.metadata.current_dj]);
			this.currentSong.updateVotes(data.room.metadata);
		}
	}
};

/** @param {RoomInfo} data */
Bot.prototype.initBanList = function(data) {
	this.banList = null;
	if (data.success) {
		BanList.fromFile(this.config.banlist_filename, data.room.roomid, function(banList) {
			this.banList = banList;
		}.bind(this));
	}
};

/** @param {RoomInfo} data */
Bot.prototype.initDjList = function(data) {
	if (data.success) {
		DjList.fromFile(this.config.djlist_filename, data.room.roomid, function(djList) {
			this.djList = djList;
		}.bind(this));
	} else {
		this.djList = new DjList();
	}
};

Bot.prototype.refreshRoomInfo = function(cb) {
	this.ttapi.roomInfo(function(data) {
		this.onRoomInfo.call(this, data);
		if (cb) { cb.call(this, data); }
	}.bind(this));
};

Bot.prototype.onDeregister = function(data) {
	if (this.debug) {
		console.dir(data);
	}
	if (data.userid === this.config.userid) {
		this.roomInfo = null;
		this.users = {};
	} else {
		this.recordActivity(data.userid);
		this.refreshRoomInfo();
	}
};

Bot.prototype.say = function(msg) {
	if (!msg) { return; }
	var message = msg
		.replace(/\{room\.name\}/g, this.roomInfo.room.name)
		.replace(/\{bot\.name\}/g, this.lookupUsername(this.config.userid));
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
		.replace(/\{user\.name\}/g, this.lookupUsername(data.userid)));
};

Bot.prototype.onAddDj = function(data) {
	if (this.debug) {
		console.dir(data);
	}
	var user = data.user[0];
	this.djs[user.userid] = new imports.stats.DjStats(user);
	if (this.djList.active) {
		var next = this.djList.next();
		if (next) {
			if (user.userid === next) {
				this.djList.remove(user.userid);
			} else {
				this.say(this.config.messages.wrongDj
					.replace(/\{right.name\}/g, this.lookupUsername(next))
					.replace(/\{wrong.name\}/g, user.name));
				return;
			}
		}
	}
	this.say(this.djAnnouncement(user));
};

Bot.prototype.djSummary = function(stats) {
	var message = randomElement(this.config.messages.djSummaries);
	return message
		.replace(/\{user\.name\}/g, stats.user.name)
		.replace(/\{user\.points\}/g, stats.user.points)
		.replace(/\{lames\}/g, stats.lames)
		.replace(/\{gain\}/g, stats.gain)
		.replace(/\{plays\}/g, stats.plays);

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
	if (this.djList.active) {
		var next = this.djList.next();
		if (next) {
			this.say(this.config.messages.nextDj
					.replace(/\{user.name\}/, this.lookupUsername(next)));
		};
	}
};

Bot.prototype.onNewSong = function(data) {
	if (this.debug) {
		console.dir(data);
	}
	var song = data.room.metadata.current_song;
	var userid = data.room.metadata.current_dj;
	var djstats = this.djs[userid] || (this.djs[userid] = new imports.stats.DjStats(this.users[userid]));
	djstats.play(song);
	this.finishSong();
	this.currentSong = new imports.stats.SongStats(song, this.users[song.djid]);
};

Bot.prototype.finishSong = function() {
	if (this.currentSong && this.currentSong.song && this.currentSong.dj) {
		var message = this.config.messages.songSummary;
		this.say(message
			.replace(/\{user\.name\}/g, this.currentSong.dj.name)
			.replace(/\{awesomes\}/g, isNaN(this.currentSong.votes.upvotes) ? 0 : this.currentSong.votes.upvotes)
			.replace(/\{lames\}/g, isNaN(this.currentSong.votes.downvotes) ? 0 : this.currentSong.votes.downvotes)
			.replace(/\{song\}/g, this.currentSong.song.metadata.song)
			.replace(/\{artist\}/g, this.currentSong.song.metadata.artist)
			.replace(/\{album\}/g, this.currentSong.song.metadata.album));
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
	'help'
];

Bot.moderatorCommands = [
	'list-on',
	'list-off',
	'list-reset',
	'remove',
	'add-first',
	'remove-first',
	'ban',
	'bans',
	'banned',
	'unban',
	'approve-greeting',
	'reject-greeting',
	'show-greeting',
	'pending-greetings'
];

Bot.prototype.recordActivity = function(userid) {
	if (userid === this.config.userid) { return; }
	this.activity[userid] = new Date();
	this.writeActivity();
};



exports.Bot = Bot;
exports.imports = imports;

if (process.argv.length > 2) {
	new Bot(process.argv[2]).start();
}
