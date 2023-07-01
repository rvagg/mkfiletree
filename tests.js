import fs from 'fs/promises'
import path from 'path'
import assert from 'assert'
import { fileURLToPath } from 'url'
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
  // dir is appropriately named
  if (asTemp) {
    assert(new RegExp('^' + xregexp.escape(path.join(temp.dir, name)) + '[^\\/]+$').test(madeDir))
  } else {
    assert.strictEqual(madeDir, path.join(root, name))
  }

  const newList = await fs.readdir(root)
  let list = newList.filter((f) => originalList.indexOf(f) === -1)
  assert.strictEqual(path.join(root, list[0]), madeDir) // yee haw, we made the dir!
  // test all files and contents
  assertFile(madeDir, 'foo', 'FOO')
  assertFile(madeDir, 'bam/one', '1')
  assertFile(madeDir, 'bam/two', '2')
  assertFile(madeDir, 'bam/three/a', 'A')
  assertFile(madeDir, 'bam/three/b', 'B')
  assertFile(madeDir, 'bam/three/c', 'A\nB\nC\n')
  assertFile(madeDir, 'bar', 'BAR')
  // make sure there are the right number of files in there, no more than expected
  await assertTreeFileCount(madeDir, 7)
  await mkfiletree.cleanUp()

  const cleanList = await fs.readdir(root)
  list = cleanList.filter((f) => originalList.indexOf(f) === -1)
  if (asTemp) {
    // cleanup worked, back where we started!
    assert.strictEqual(list.length, 0)
    return
  }
  // cleanup shouldn't do anything for non-temp dirs
  assert.strictEqual(list.length, 1)
  assert.strictEqual(list[0], name)
  // clean up manually
  await rimraf(path.join(__dirname, name))
}

const bork = setTimeout(() => {
  assert.fail('timeout without completing tests')
}, 5000)

await runTest(true) // makeTemp & cleanUp
await runTest(false) // make
clearTimeout(bork)

console.log('Running... no assertions means no worries!')
