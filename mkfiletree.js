/* Copyright (c) 2012 Rod Vagg <@rvagg> */

const fs = require('fs')
const path = require('path')
const temp = require('temp')
const rimraf = require('rimraf')
const after = require('after')

let dirs = []

function makeEntry (dir, key, value, callback) {
  let p = path.join(dir, key)

  if (typeof value === 'string') {
    return fs.writeFile(p, value, 'utf-8', callback)
  }

  if (typeof value === 'object') {
    return _make(fs, p, value, callback)
  }

  // huh? perhaps this could be a callable function
  callback()
}

function _make (fs, dir, data, callback) {
  fs.mkdir(dir, afterMake)

  function afterMake (err, _dir) {
    if (err) {
      return callback(err)
    }

    if (_dir) { // _dir if we made it with temp.mkdir, otherwise leave it alone
      dirs.push(_dir)
    }

    const entries = Object.keys(data)
    const done = after(entries.length, (err) => {
      if (err) {
        return callback(err)
      }

      callback(null, path.resolve(_dir || dir)) // return the dir
    })

    entries.forEach((k) => {
      makeEntry(_dir || dir, k, data[k], done)
    })
  }
}

function makeTemp (prefix, data, callback) {
  _make(temp, prefix, data, callback)
}

function make (root, data, callback) {
  _make(fs, root, data, callback)
}

function cleanUp (callback) {
  const done = after(dirs.length, (err) => {
    dirs = []
    callback(err)
  })

  dirs.forEach(function (dir) {
    rimraf(dir, done)
  })
}

function maybePromisify (fn) {
  function maybePromiseWrap (...args) {
    if (typeof args[args.length - 1] === 'function') {
      return fn(...args)
    }

    return new Promise((resolve, reject) => {
      args.push((err, data) => {
        if (err) {
          return reject(err)
        }
        resolve(data)
      })

      fn(...args)
    })
  }

  return maybePromiseWrap
}

module.exports.makeTemp = maybePromisify(makeTemp)
module.exports.make = maybePromisify(make)
module.exports.cleanUp = maybePromisify(cleanUp)
