var
    assert = require('assert'),
    bots = require('bots');


// stubs
bots.imports.ttapi = function() {
  this.isFake = true;
};

bots.imports.ttapi.prototype.on = function() {
}


describe('Bot', function() {
  var instance;
  var said;

  beforeEach(function(done) {
    said = false;
    instance = new bots.Bot('test.json');
    instance.start(function() {
      assert.ok(instance.ttapi.isFake);
      instance.say = function(message) {
        said = message;
      };
      done();
    });
  });

  describe('#helpCommands()', function() {
    it('should reply with commands', function() {
      instance.onHelpCommands();
      assert.ok(/^commands: /.test(said));
    });
  });
});
