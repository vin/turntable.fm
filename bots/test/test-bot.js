var
    assert = require('assert'),
    bots = require('bots'),
    events = require('events'),
    sys = require('sys');


// stubs
FakeTtapi = function() {
  events.EventEmitter.call(this);
  this.isFake = true;
};
sys.inherits(FakeTtapi, events.EventEmitter);

bots.imports.ttapi = FakeTtapi;
bots.imports.Store.write = function(path, data, cb) {
  process.nextTick(cb);
};
bots.imports.djlist.imports.Store.write = bots.imports.Store.write;

describe('Bot', function() {
  var instance;
  var said;

  beforeEach(function(done) {
    said = false;
    delete require.cache[require.resolve('node-config')];
    bots.imports.conf = require('node-config');
    instance = new bots.Bot('test');
    instance.start(function() {
      assert.ok(instance.ttapi.isFake);
      instance.say = function(message) {
        said = message;
      };
      done();
    });
  });

  describe('init', function() {
    it('should read test-greetings.json', function(done) {
      assert.equal('conf/test-greetings.json', instance.config.greetings_filename);
      instance.on('greetingsLoaded', function() {
        assert.equal(2, Object.keys(instance.greetings).length);
	done();
      });
    });
  });

  describe('#helpCommands()', function() {
    it('should reply with commands', function() {
      instance.onHelpCommands();
      assert.ok(/^commands: /.test(said));
    });
  });

  describe('#greeting()', function() {
    var fakeUser1 = { name: 'fake1', created: 1319511222.52, laptop: 'linux', userid: 'userid1', acl: 0, fans: 0, points: 0, avatarid: 7 }
    var fakeUser2 = { name: 'fake2', created: 1319511222.52, laptop: 'linux', userid: 'userid2', acl: 0, fans: 0, points: 0, avatarid: 7 }
    var newUser = { name: 'noob', created: new Date().getTime() / 1000, laptop: 'linux', userid: 'noob', acl: 0, fans: 0, points: 0, avatarid: 7 }
    var unknownUser = { name: 'stranger', created: 1319511222.52, laptop: 'linux', userid: 'stranger', acl: 0, fans: 0, points: 0, avatarid: 7 }
    it('should greet unknown users', function() {
      var greeting = instance.greeting(unknownUser);
      assert.ok(/^((Hi stranger!)|(Hello stranger)|(Hey there stranger))$/.test(greeting));
    });
    it('should greet new users', function() {
      var greeting = instance.greeting(newUser);
      assert.ok(/^((Welcome to turntable noob!)|(Hi noob, welcome to turntable!))$/.test(greeting));
    });
    it('should greet known users', function(done) {
      instance.on('greetingsLoaded', function() {
        var greeting1 = instance.greeting(fakeUser1);
        var greeting2 = instance.greeting(fakeUser2);
        assert.ok(/^fake1 has a custom greeting!$/.test(greeting1), greeting1);
        assert.ok(/^fake2 also has a custom greeting!$/.test(greeting2), greeting2);
	done();
      });
    });
  });

  describe('bare addme', function() {
    it('adds the speaker to the dj queue', function() {
      instance.djList.active = true;
      instance.ttapi.emit('speak', { "command": "speak", "userid": "4dea70c94fe7d0517b1a3519", "name": "@richhemsley", "text": "addme" });
      assert.deepEqual(['4dea70c94fe7d0517b1a3519'], instance.djList.list);
    });
  });
});

describe('Bot statics', function() {
  describe('#splitCommand()', function() {
    it('works on a single word', function() {
      assert.deepEqual(['foo', ''], bots.Bot.splitCommand('foo'));
    });
    it('splits the first word from the rest of a command line', function() {
      assert.deepEqual(['foo', 'bar'], bots.Bot.splitCommand('foo bar'));
      assert.deepEqual(['foo', 'bar'], bots.Bot.splitCommand('foo   bar'));
      assert.deepEqual(['foo', 'bar baz'], bots.Bot.splitCommand('foo bar baz'));
    });
    it('preserves whitespace in the remainder of the command', function() {
      assert.deepEqual(['foo', 'bar   baz'], bots.Bot.splitCommand('foo    bar   baz'));
    });
  });
});
