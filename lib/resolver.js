var utils = require('./utils');
var goog = require('./goog');

// TODO(vojta): can we handle provide "same thing provided multiple times" ?
var DependencyResolver = function() {
  // the state
  var fileMap = Object.create(null);
  var provideMap = Object.create(null);

  var updateProvideMap = function(filepath, oldProvides, newProvides) {
    oldProvides.forEach(function(dep) {
      if (provideMap[dep] === filepath) {
        provideMap[dep] = null;
      }
    });

    newProvides.forEach(function(dep) {
      provideMap[dep] = filepath;
    });
  };

  var resolveFile = function(filepath, files, alreadyResolvedMap) {
    if (!fileMap[filepath]) {
      // console.log('IGORED', filepath);
      files.push(filepath);
      return;
    }

    // resolve all dependencies first
    fileMap[filepath].requires.forEach(function(dep) {
      if (!alreadyResolvedMap[dep]) {
        // TODO(vojta): error if dep not provided
        resolveFile(provideMap[dep], files, alreadyResolvedMap);
      }
    });

    files.push(filepath);
    fileMap[filepath].provides.forEach(function(dep) {
      alreadyResolvedMap[dep] = true;
    });
  };

  this.removeFile = function(filepath) {
    // TODO(vojta): handle if unknown file
    fileMap[filepath].provides.forEach(function(dep) {
      if (provideMap[dep] === filepath) {
        provideMap[dep] = null;
      }
    });
    fileMap[filepath] = null;
  };

  this.updateFile = function(filepath, content) {
    var parsed = goog.parseProvideRequire(content);

    if (!fileMap[filepath]) {
      // console.log('New file', filepath, 'adding to the map.');
      // console.log(parsed);
      updateProvideMap(filepath, [], parsed.provides);
      fileMap[filepath] = parsed;
      return;
    }

    var diffProvides = utils.diffSorted(fileMap[filepath].provides, parsed.provides);
    var diffRequires = utils.diffSorted(fileMap[filepath].requires, parsed.requires);

    if (diffProvides) {
      // console.log('Provides change in', filepath);
      // console.log('Added', diffProvides.added);
      // console.log('Removed', diffProvides.removed);
    } else {
      // console.log('No provides change in', filepath);
    }

    if (diffRequires) {
      // console.log('Requires change in', filepath);
      // console.log('Added', diffRequires.added);
      // console.log('Removed', diffRequires.removed);
    } else {
      // console.log('No requires change in', filepath);
    }

    updateProvideMap(filepath, fileMap[filepath].provides, parsed.provides);
    fileMap[filepath] = parsed;
  };

  this.resolveFiles = function(files) {
    // console.log('RESOLVING', files);
    // console.log(fileMap);

    var resolvedFiles = [];
    var alreadyResolvedMap = Object.create(null);

    files.forEach(function(file) {
      resolveFile(file, resolvedFiles, alreadyResolvedMap);
    });

    return resolvedFiles;
  };

  this.loadExternalDeps = function(filepath, content) {
    var parsed = goog.parseDepsJs(filepath, content);

    fileMap.__proto__ = parsed.fileMap;
    provideMap.__proto__ = parsed.provideMap;
  };
};

module.exports = DependencyResolver;