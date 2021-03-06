// Copyright 2011 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Wrapper for an IndexedDB index.
 *
 */


goog.provide('goog.db.Index');

goog.require('goog.async.Deferred');
goog.require('goog.db.Error');
goog.require('goog.debug');



/**
 * Creates an IDBIndex wrapper object. Indexes are associated with object
 * stores and provide methods for looking up objects based on their non-key
 * properties. Should not be created directly, access through the object store
 * it belongs to.
 * @see goog.db.ObjectStore#getIndex
 *
 * @param {!IDBIndex} index Underlying IDBIndex object.
 * @constructor
 */
goog.db.Index = function(index) {
  /**
   * Underlying IndexedDB index object.
   *
   * @type {!IDBIndex}
   * @private
   */
  this.index_ = index;
};


/**
 * @return {string} Name of the index.
 */
goog.db.Index.prototype.getName = function() {
  return this.index_.name;
};


/**
 * @return {string} Key path of the index.
 */
goog.db.Index.prototype.getKeyPath = function() {
  return this.index_.keyPath;
};


/**
 * @return {boolean} True if the index enforces that there is only one object
 *     for each unique value it indexes on.
 */
goog.db.Index.prototype.isUnique = function() {
  return this.index_.unique;
};


/**
 * Helper function for get and getKey.
 *
 * @param {string} fn Function name to call on the index to get the request.
 * @param {string} msg Message to give to the error.
 * @param {IDBKeyType} key The key to look up in the index.
 * @return {!goog.async.Deferred} The resulting deferred object.
 * @private
 */
goog.db.Index.prototype.get_ = function(fn, msg, key) {
  var d = new goog.async.Deferred();
  var request;
  try {
    request = this.index_[fn](key);
  } catch (err) {
    msg += ' with key ' + goog.debug.deepExpose(key);
    d.errback(goog.db.Error.fromException(err, msg));
    return d;
  }
  request.onsuccess = function(ev) {
    d.callback(ev.target.result);
  };
  request.onerror = function(ev) {
    msg += ' with key ' + goog.debug.deepExpose(key);
    d.errback(goog.db.Error.fromRequest(ev.target, msg));
  };
  return d;
};


/**
 * Fetches a single object from the object store. Even if there are multiple
 * objects that match the given key, this method will get only one of them.
 *
 * @param {IDBKeyType} key Key to look up in the index.
 * @return {!goog.async.Deferred} The deferred object for the given record.
 */
goog.db.Index.prototype.get = function(key) {
  return this.get_('get', 'getting from index ' + this.getName(), key);
};


/**
 * Looks up a single object from the object store and gives back the key that
 * it's listed under in the object store. Even if there are multiple records
 * that match the given key, this method returns the first.
 *
 * @param {IDBKeyType} key Key to look up in the index.
 * @return {!goog.async.Deferred} The deferred key for the record that matches
 *     the key.
 */
goog.db.Index.prototype.getKey = function(key) {
  return this.get_('getKey', 'getting key from index ' + this.getName(), key);
};


/**
 * Helper function for getAll and getAllKeys.
 *
 * @param {string} fn Function name to call on the index to get the request.
 * @param {string} msg Message to give to the error.
 * @param {IDBKeyType=} opt_key Key to look up in the index.
 * @return {!goog.async.Deferred} The resulting deferred array of objects.
 * @private
 */
goog.db.Index.prototype.getAll_ = function(fn, msg, opt_key) {
  // This is the most common use of IDBKeyRange. If more specific uses of
  // cursors are needed then a full wrapper should be created.
  var IDBKeyRange = goog.global.IDBKeyRange || goog.global.webkitIDBKeyRange;
  var d = new goog.async.Deferred();
  var request;
  try {
    if (opt_key) {
      request = this.index_[fn](IDBKeyRange.only(opt_key));
    } else {
      request = this.index_[fn]();
    }
  } catch (err) {
    if (opt_key) {
      msg += ' for key ' + goog.debug.deepExpose(opt_key);
    }
    d.errback(goog.db.Error.fromException(err, msg));
    return d;
  }
  var result = [];
  request.onsuccess = function(ev) {
    var cursor = ev.target.result;
    if (cursor) {
      result.push(cursor.value);
      cursor['continue']();
    } else {
      d.callback(result);
    }
  };
  request.onerror = function(ev) {
    if (opt_key) {
      msg += ' for key ' + goog.debug.deepExpose(opt_key);
    }
    d.errback(goog.db.Error.fromRequest(ev.target, msg));
  };
  return d;
};


/**
 * Gets all indexed objects. If the key is provided, gets all indexed objects
 * that match the key instead.
 *
 * @param {IDBKeyType=} opt_key Key to look up in the index.
 * @return {!goog.async.Deferred} A deferred array of objects that match the
 *     key.
 */
goog.db.Index.prototype.getAll = function(opt_key) {
  return this.getAll_(
      'openCursor',
      'getting all from index ' + this.getName(),
      opt_key);
};


/**
 * Gets the keys to look up all the indexed objects. If the key is provided,
 * gets all records for objects that match the key instead.
 *
 * @param {IDBKeyType=} opt_key Key to look up in the index.
 * @return {!goog.async.Deferred} A deferred array of keys for objects that
 *     match the key.
 */
goog.db.Index.prototype.getAllKeys = function(opt_key) {
  return this.getAll_(
      'openKeyCursor',
      'getting all keys from index ' + this.getName(),
      opt_key);
};
