/* Copyright (c) 2012 Rod Vagg <@rvagg> */

import fs from 'fs/promises'
import path from 'path'
import temp from 'temp'
import { rimraf } from 'rimraf'

const dirs = []

async function makeEntry (dir, key, value) {
  const p = path.join(dir, key)

  if (typeof value === 'string') {
    return fs.writeFile(p, value, 'utf-8')
  }

  if (typeof value === 'object') {
    return _make(fs, p, value)
  }
}

async function _make (fs, dir, data) {
  const _dir = await fs.mkdir(dir)
  if (_dir) { // _dir if we made it with temp.mkdir, otherwise leave it alone
    dirs.push(_dir)
  }

  await Promise.all(Object.keys(data).map((k) => {
    return makeEntry(_dir || dir, k, data[k])
  }))

  return path.resolve(_dir || dir)
}

export async function makeTemp (prefix, data) {
  return _make(temp, prefix, data)
}

export async function make (root, data) {
  return _make(fs, root, data)
}

export async function cleanUp (callback) {
  return Promise.all(dirs.map((dir) => {
    return rimraf(dir)
  }))
}
