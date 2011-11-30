// Copyright 2011 Vineet Kumar

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
};

DjStats.prototype.play = function(song) {
  ++this.plays;
};

exports.DjStats = DjStats;
exports.SongStats = SongStats;
