var
    assert = require('assert'),
    bots = require('bots');


// stubs
bots.imports.ttapi = function() {
	this.isFake = true;
};

bots.imports.ttapi.prototype.on = function() {
}

var fakeUser1 = { name: 'fake1', created: 1319511222.52, laptop: 'linux', userid: 'userid1', acl: 0, fans: 0, points: 0, avatarid: 7 }
var fakeUser2 = { name: 'fake2', created: 1319511222.52, laptop: 'linux', userid: 'userid2', acl: 0, fans: 0, points: 0, avatarid: 7 }

var fakeRoomInfo = {
	room: {
		name: "fake room"
	},
	users: [ fakeUser1, fakeUser2 ],
	roomid: 'fakeroomid',
}

bots.imports.ttapi.prototype.roomInfo = function(cb) {
	process.nextTick(function() { cb(fakeRoomInfo); });
}


// tests
var instance = new bots.Bot('test.json');
instance.start(function() {
		assert.ok(instance.ttapi.isFake);
	instance.refreshRoomInfo(function(data) {
		assert.ok(data);
		assert.equal(fakeUser1, instance.users['userid1']);
		assert.equal(fakeUser2, instance.users['userid2']);
		assert.equal(2, Object.keys(instance.users).length);
	});
});
