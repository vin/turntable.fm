// Copyright 2011 Vineet Kumar

var imports = {
  Store: require('./store').Store
};

BanList = function(roomid) {
  this.roomid = roomid;

  /** A map of banned userIDs to comments */
  this.bans = {};
};


/**
  * Bans a user ID, storing a comment.  If the user was already banned, does nothing,
  * and returns the original comment.
  */
BanList.prototype.ban = function(userid, comment) {
  if (this.bans[userid]) {
    return this.bans[userid];
  }
  this.bans[userid] = comment;
};

BanList.prototype.query = function(userid) {
  return this.bans[userid];
};

BanList.prototype.list = function() {
  return Object.keys(this.bans);
};

BanList.prototype.unban = function(userid) {
  result = this.bans[userid];
  delete this.bans[userid];
  return result;
};

BanList.fromFile = function(filename_pattern, roomid, cb) {
  var result = new BanList();
  result.roomid = roomid;
  if (roomid) {
    var filename = filename_pattern.replace(/\{roomid\}/g, roomid);
    var onData = function(data) {
      result.bans = data.bans;
      console.log('loaded ban list: %s entries', Object.keys(result.bans).length);
      if (cb) { cb(result); }
    }.bind(this);
    var onErr = function(err) {
      console.log('no ban list for room %s: %s', roomid, err);
      if (cb) { cb(result); }
    }.bind(this);
    imports.Store.read(filename, onData, onErr);
  }
};

BanList.prototype.save = function(filename_pattern, cb) {
  var filename = filename_pattern.replace(/\{roomid\}/g, this.roomid);
  imports.Store.write(filename, this,
      cb || console.log.bind(this, 'Ban list saved to %s', filename));
};

exports.BanList = BanList;
