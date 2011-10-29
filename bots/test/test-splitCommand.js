var
    assert = require('assert'),
    bots = require('bots');


assert.deepEqual(['foo', ''], bots.Bot.splitCommand('foo'));
assert.deepEqual(['foo', 'bar'], bots.Bot.splitCommand('foo bar'));
assert.deepEqual(['foo', 'bar'], bots.Bot.splitCommand('foo   bar'));
assert.deepEqual(['foo', 'bar baz'], bots.Bot.splitCommand('foo bar baz'));
assert.deepEqual(['foo', 'bar   baz'], bots.Bot.splitCommand('foo    bar   baz'));
