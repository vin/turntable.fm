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
	setTimeout(function() { cb(fakeRoomInfo); }, 0);
}


// tests
var instance = new bots.Bot('test.json');
instance.start(function() {
		assert.ok(instance.ttapi.isFake);
	instance.refreshRoomInfo(function(data) {
		assert.ok(data);
		assert.equal(instance.users['userid1'], fakeUser1);
		assert.equal(instance.users['userid2'], fakeUser2);
		assert.equal(Object.keys(instance.users).length, 2);
	});
});
