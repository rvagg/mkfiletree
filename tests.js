import fs from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert'
import { fileURLToPath } from 'node:url'
import temp from 'temp'
import { rimraf } from 'rimraf'
import xregexp from 'xregexp'
import * as mkfiletree from './mkfiletree.js'

const __dirname = fileURLToPath(path.dirname(import.meta.url))

async function assertFile (dir, file, expectedContents) {
  const contents = await fs.readFile(path.join(dir, file), 'utf-8')
  assert.strictEqual(contents, expectedContents)
}

async function assertTreeFileCount (dir, count) {
  let total = 0

  async function countDir (dir) {
    for (const d of await fs.readdir(dir)) {
      const stat = await fs.stat(path.join(dir, d))
      if (stat.isDirectory()) {
        await countDir(path.join(dir, d))
      } else {
        total++
      }
    }
  }

  await countDir(dir)
  assert.strictEqual(total, count)
}

async function runTest (asTemp) {
  const root = asTemp ? temp.dir : __dirname
  const name = +new Date() + 'foobar'
  const fixture = {
    foo: 'FOO',
    bam: {
      one: '1',
      two: '2',
      three: {
        a: 'A',
        b: 'B',
        c: 'A\nB\nC\n'
      }
    },
    bar: 'BAR'
  }

  const originalList = await fs.readdir(root)
  const madeDir = await mkfiletree[asTemp ? 'makeTemp' : 'make'](name, fixture)
  assert(madeDir)
  assert(typeof madeDir === 'string')
  if (asTemp) {
    assert(new RegExp('^' + xregexp.escape(path.join(temp.dir, name)) + '[^\\/]+$').test(madeDir))
  } else {
    assert.strictEqual(madeDir, path.join(root, name))
  }

  const newList = await fs.readdir(root)
  let list = newList.filter((f) => originalList.indexOf(f) === -1)
  assert.strictEqual(path.join(root, list[0]), madeDir)
  await assertFile(madeDir, 'foo', 'FOO')
  await assertFile(madeDir, 'bam/one', '1')
  await assertFile(madeDir, 'bam/two', '2')
  await assertFile(madeDir, 'bam/three/a', 'A')
  await assertFile(madeDir, 'bam/three/b', 'B')
  await assertFile(madeDir, 'bam/three/c', 'A\nB\nC\n')
  await assertFile(madeDir, 'bar', 'BAR')
  await assertTreeFileCount(madeDir, 7)
  await mkfiletree.cleanUp()

  const cleanList = await fs.readdir(root)
  list = cleanList.filter((f) => originalList.indexOf(f) === -1)
  if (asTemp) {
    assert.strictEqual(list.length, 0)
    return
  }
  assert.strictEqual(list.length, 1)
  assert.strictEqual(list[0], name)
  await rimraf(path.join(__dirname, name))
}

test('makeTemp creates tree and cleanUp removes it', async () => {
  await runTest(true)
})

test('make creates tree at specified root', async () => {
  await runTest(false)
})
