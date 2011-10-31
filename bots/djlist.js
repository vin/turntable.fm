// Copyright 2011 Vineet Kumar

DjList = function(data) {
	data = data || {};
	this.roomid = data.roomid;
	this.active = data.active;
	this.list = data.list || [];
};

DjList.prototype.length = function() {
	return this.list.length;
}

DjList.prototype.next = function() {
	return this.list[0];
}

/**
  * Adds the given userid to the list, and returns the position at which it was added.
  * Returns negative if the userid is already on the list.  In that case, the return value
  * is the existing position subtracted from -1.  (e.g. -1 means the userid is already listed
  * at position 0; -2 means already at position 1, etc.)
  */
DjList.prototype.add = function(userid) {
	var i = this.list.indexOf(userid);
	if (i == -1) {
		this.list.push(userid);
		return this.list.length;
	}
       	// already listed
	return -1 - i;
};

/** Remove the given userid from the list and return the index it was removed
  * from, or -1 if it was not on the list.
  */
DjList.prototype.remove = function(userid) {
	var i = this.list.indexOf(userid);
	if (i != -1) {
		this.djList.list.splice(i, 1);
	}
	return i;
};

DjList.fromFile = function(store, filename_pattern, roomid, cb) {
	var result = new DjList();
	result.roomid = roomid;
	if (roomid) {
		var filename = filename_pattern.replace(/{roomid}/g, roomid);
		var onData = function(data) {
			result.list = data.list;
			result.active = data.active;
			console.log('loaded dj list: %s entries', result.list.length);
			if (cb) cb(result);
		}.bind(this);
		var onErr = console.log.bind(this, 'no DJ list for room %s: %s', roomid);
		store.read(filename, onData, onErr);
	}
};

DjList.prototype.save = function(store, filename_pattern, cb) {
	var filename = filename_pattern.replace(/{roomid}/g, this.roomid);
	store.write(filename, this,
		console.log.bind(this, 'DJ list saved to %s', filename));
};


exports.DjList = DjList;
