var
    assert = require('assert'),
    bots = require('bots');


// stubs
bots.imports.ttapi = function() {
	this.isFake = true;
};

bots.imports.ttapi.prototype.on = function() {
}


// tests
var instance = new bots.Bot('test.json');
var sayCalled = false;
instance.say = function(message) {
	sayCalled = true;
	assert.ok(/^commands: /.test(message));
};

instance.start(function() {
		assert.ok(instance.ttapi.isFake);
		instance.onHelpCommands();
		assert.ok(sayCalled);
});
