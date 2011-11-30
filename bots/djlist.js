// Copyright 2011 Vineet Kumar

var imports = {
  Store: require('./store').Store
};

DjList = function(data) {
  data = data || {};
  this.roomid = data.roomid;
  this.active = data.active;
  this.list = data.list || [];
};

DjList.prototype.length = function() {
  return this.list.length;
};

DjList.prototype.next = function() {
  return this.list[0];
};

/**
  * Adds the given userid to the list, and returns the position at which it was added.
  * Returns negative if the userid is already on the list.  In that case, the return value
  * is the existing position subtracted from -1.  (e.g. -1 means the userid is already listed
  * at position 0; -2 means already at position 1, etc.)
  */
DjList.prototype.add = function(userid) {
  var i = this.list.indexOf(userid);
  if (i === -1) {
    this.list.push(userid);
    return this.list.length;
  }
  // already listed
  return -1 - i;
};

/**
  * Adds the given userid to the front of the list.  If the user was already listed, they are
  * removed from their current posiiton and added to the front of the list.  The user's original
  * position (if any) is returned, or -1 if the user was previously unlisted.
  */
DjList.prototype.addFirst = function(userid) {
  var i = this.remove(userid);
  this.list.unshift(userid);
  return i;
};

/**
  * Removes and returns the first user from the list.
  */
DjList.prototype.removeFirst = function() {
  return this.list.shift();
};

/** Remove the given userid from the list and return the index it was removed
  * from, or -1 if it was not on the list.
  */
DjList.prototype.remove = function(userid) {
  var i = this.list.indexOf(userid);
  if (i !== -1) {
    this.list.splice(i, 1);
  }
  return i;
};

DjList.fromFile = function(filename_pattern, roomid, cb) {
  var result = new DjList();
  result.roomid = roomid;
  if (roomid) {
    var filename = filename_pattern.replace(/\{roomid\}/g, roomid);
    var onData = function(data) {
      result.list = data.list;
      result.active = data.active;
      console.log('loaded dj list: %s entries', result.list.length);
      if (cb) { cb(result); }
    }.bind(this);
    var onErr = function(err) {
      console.log('no DJ list for room %s: %s', roomid, err);
      if (cb) { cb(result); }
    }.bind(this);
    imports.Store.read(filename, onData, onErr);
  }
};

DjList.prototype.save = function(filename_pattern, cb) {
  var filename = filename_pattern.replace(/\{roomid\}/g, this.roomid);
  imports.Store.write(filename, this,
      cb || console.log.bind(this, 'DJ list saved to %s', filename));
};


exports.DjList = DjList;
