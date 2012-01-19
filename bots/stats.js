// Copyright 2011 Vineet Kumar

assert = require('assert');

SongStats = function(song) {
  this.song = song;
  this.votes = {upvotes: 0, downvotes: 0, votelog: []};
  assert.ok(song);
};

SongStats.prototype.updateVotes = function(votes) {
  this.votes.upvotes = votes.upvotes;
  this.votes.downvotes = votes.downvotes;
  this.votes.votelog = this.votes.votelog.concat(votes.votelog);
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
};

DjStats.prototype.play = function(song) {
  ++this.plays;
};

exports.DjStats = DjStats;
exports.SongStats = SongStats;
