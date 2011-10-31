// Copyright 2011 Vineet Kumar

var imports = {
	fs: require('fs'),
	path: require('path'),
};

Store = function() {
	this.dir = imports.path.dirname(process.argv[1]);
};


Store.prototype.fullpath = function(path) {
	return imports.path.join(this.dir, path);
};

Store.prototype.tempfile = function(path) {
	return this.fullpath(path + '.tmp.' + process.pid);
};

Store.prototype.read = function(path, cb, errCb) {
	var fullpath = this.fullpath(path);
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
		} catch (err) {
			throw "Couldn't parse " + fullpath;
		}
		if (cb) cb(parsed);
	}.bind(this));
};

Store.prototype.write = function(path, data, cb) {
	var tempfile = this.tempfile(path);
	var fullpath = this.fullpath(path);
	imports.fs.writeFile(tempfile, JSON.stringify(data), function(err) {
		if (err) throw err;
		imports.fs.rename(tempfile, fullpath, cb);
	}.bind(this));
};

exports.Store = Store;
exports.imports = imports;
