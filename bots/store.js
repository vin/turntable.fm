// Copyright 2011 Vineet Kumar

var imports = {
  fs: require('fs'),
  path: require('path')
};

Store = function() {};

Store.fullpath = function(path) {
  return imports.path.join(imports.path.dirname(process.argv[1]), path);
};

Store.tempfile = function(path) {
  return Store.fullpath(path + '.tmp.' + process.pid);
};

Store.read = function(path, cb, errCb) {
  var fullpath = Store.fullpath(path);
  imports.fs.readFile(fullpath, 'utf8', function(err, data) {
    if (err) {
      if (errCb) {
        errCb(err);
        return;
      } else {
        throw err;
      }
    }
    var parsed = null;
    try {
      parsed = JSON.parse(data);
    } catch (ex) {
      throw "Couldn't parse " + fullpath;
    }
    if (cb) { cb(parsed); }
  });
};

Store.write = function(path, data, cb) {
  var tempfile = Store.tempfile(path);
  var fullpath = Store.fullpath(path);
  imports.fs.writeFile(tempfile, JSON.stringify(data), function(err) {
    if (err) { throw err; }
    imports.fs.rename(tempfile, fullpath, cb);
  });
};

exports.Store = Store;
exports.imports = imports;
