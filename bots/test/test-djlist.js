var
    assert = require('assert'),
    djlist = require('../djlist'),
    events = require('events'),
    sys = require('sys');


// stubs
djlist.imports.Store.write = function(path, data, cb) {
  process.nextTick(cb);
};

describe('DjList', function() {
  var instance;

  beforeEach(function() {
    instance = new djlist.DjList();
  });

  describe('length', function() {
    it('should start empty', function() {
      assert.equal(0, instance.length());
    });

    it('should increase as unique users are added', function() {
      instance.add('userid1');
      assert.equal(1, instance.length());
      instance.add('userid2');
      assert.equal(2, instance.length());
    });
  });

  describe('add', function() {
    it('should return the position of the newly-added user', function() {
      assert.equal(1, instance.add('userid1'));
      assert.equal(2, instance.add('userid2'));
    });
    it('should not append duplicates', function() {
      assert.equal(1, instance.add('userid1'));
      assert.equal(-1, instance.add('userid1'));
      assert.equal(1, instance.length());
      assert.equal(2, instance.add('userid2'));
      assert.equal(-1, instance.add('userid1'));
      assert.equal(-2, instance.add('userid2'));
      assert.equal(2, instance.length());
    });
    it('should add users at the back', function() {
      instance.add('userid1');
      assert.equal('userid1', instance.next());
      assert.equal(1, instance.length());
      instance.add('userid2');
      assert.equal('userid1', instance.next());
      assert.equal(2, instance.length());
    });
  });

  describe('addFirst', function() {
    it('should increase the length of the list', function() {
      instance.addFirst('userid1');
      assert.equal(1, instance.length());
      instance.addFirst('userid2');
      assert.equal(2, instance.length());
    });
    it('should not increase the length of the list for dupes', function() {
      instance.addFirst('userid1');
      assert.equal(1, instance.length());
      instance.addFirst('userid1');
      assert.equal(1, instance.length());
    });
    it('should add users at the front', function() {
      instance.addFirst('userid1');
      assert.equal('userid1', instance.next());
      assert.equal(1, instance.length());
      instance.addFirst('userid2');
      assert.equal('userid2', instance.next());
      assert.equal(2, instance.length());
    });
    it('should return -1 for newly-added users', function() {
      assert.equal(-1, instance.addFirst('userid1'));
      assert.equal(-1, instance.addFirst('userid2'));
    });
    it('should return the original position for already-added users', function() {
      instance.add('userid1');
      instance.add('userid2');
      assert.equal(0, instance.addFirst('userid1'));
      assert.equal('userid1', instance.next());
      assert.equal(1, instance.addFirst('userid2'));
      assert.equal('userid2', instance.next());
    });
  });

  describe('removeFirst', function() {
    beforeEach(function() {
      instance.add('userid1');
      instance.add('userid2');
    });

    it('should decrease the length of the list', function() {
      assert.equal(2, instance.length());
      instance.removeFirst();
      assert.equal(1, instance.length());
      instance.removeFirst();
      assert.equal(0, instance.length());
    });
    it('should return the userid of the removed user', function() {
      assert.equal('userid1', instance.removeFirst());
      assert.equal('userid2', instance.removeFirst());
    });
    it('should do nothing when the list is empty', function() {
      instance.removeFirst(); 
      instance.removeFirst(); 
      assert.equal(null, instance.removeFirst());
    });
  });
});
