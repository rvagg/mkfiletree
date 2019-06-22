/* Copyright (c) 2012 Rod Vagg <@rvagg> */

const fs     = require('fs')
    , path   = require('path')
    , temp   = require('temp')
    , rimraf = require('rimraf')
    , after  = require('after')


var dirs = []


function makeEntry (dir, key, value, callback) {
  var p = path.join(dir, key)

  if (typeof value == 'string')
    return fs.writeFile(p, value, 'utf-8', callback)
  
  if (typeof value == 'object')
    return make(fs, p, value, callback)
  
  // huh? perhaps this could be a callable function
  callback()
}


function make (mod, dir, data, callback) {
  mod.mkdir(dir, function (err, _dir) {
    if (err)
      return callback(err)

    if (_dir)
      dirs.push(_dir) // _dir if we made it with temp.mkdir, otherwise leave it alone

    var entries = Object.keys(data)
      , done    = after(entries.length, onComplete)

    function onComplete (err) {
      if (err)
        return callback(err)

      callback(null, path.resolve(_dir || dir))  // return the dir
    }

    function makeKeyEntry (k) {
      makeEntry(_dir || dir, k, data[k], done)
    }

    entries.forEach(makeKeyEntry)
  })
}

function cleanUp (callback) {
  function onComplete (err) {
    dirs = []

    callback(err)
  }

  var done = after(dirs.length, onComplete)

  dirs.forEach(function (dir) {
    rimraf(dir, done)
  })
}


module.exports.makeTemp = function (prefix, data, callback) {
  make(temp, prefix, data, callback)
}

module.exports.make = function (root, data, callback) {
  make(fs, root, data, callback)
}

module.exports.cleanUp = cleanUp