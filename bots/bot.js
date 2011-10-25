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
};

Bot.usage = function() {
	throw "Usage: node " + process.argv[1] + " <config.json>";
};

Bot.prototype.start = function() {
	var self = this;
	fs.readFile(self.configFile, 'utf8', function(err, data) {
		if (err) throw err;
		self.config = JSON.parse(data);
		repl.start(self.config.name + "> ").context.bot = self;
		self.readGreetings();
		self.ttapi = new ttapi(self.config.auth, self.config.userid, self.config.roomid);
	});
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

exports.Bot = Bot;
