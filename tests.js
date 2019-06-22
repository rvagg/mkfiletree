const fs = require('fs')
const path = require('path')
const assert = require('assert')
const temp = require('temp')
const rimraf = require('rimraf')
const xregexp = require('xregexp').XRegExp
const mkfiletree = require('./mkfiletree')

function assertFile (dir, file, expectedContents) {
  fs.readFile(path.join(dir, file), 'utf-8', (err, contents) => {
    assert.ifError(err)
    assert.strictEqual(contents, expectedContents)
  })
}

function assertTreeFileCount (dir, count, callback) {
  let total = 0
  let counting = 0

  function finish () {
    assert.strictEqual(total, count)
    callback()
  }

  function countDir (dir) {
    counting++
    fs.readdir(dir, (err, list) => {
      assert.ifError(err)
      list.forEach((d) => {
        counting++
        fs.stat(path.join(dir, d), (err, stat) => {
          assert.ifError(err)
          if (stat.isDirectory()) {
            countDir(path.join(dir, d))
          } else {
            total++
          }
          if (--counting === 0) {
            finish()
          }
        })
      })
      if (--counting === 0) {
        finish()
      }
    })
  }

  countDir(dir)
}

function runTest (asTemp, asPromise, callback) {
  const root = asTemp ? temp.dir : __dirname
  const name = +new Date() + 'foobar'
  const fixture = {
    'foo': 'FOO',
    'bam': {
      'one': '1',
      'two': '2',
      'three': {
        'a': 'A',
        'b': 'B',
        'c': 'A\nB\nC\n'
      }
    },
    'bar': 'BAR'
  }

  fs.readdir(root, (err, originalList) => {
    assert.ifError(err)
    if (!asPromise) {
      mkfiletree[asTemp ? 'makeTemp' : 'make'](name, fixture, (err, madeDir) => {
        assert.ifError(err)
        onMade(madeDir, originalList)
      })
    } else {
      mkfiletree[asTemp ? 'makeTemp' : 'make'](name, fixture)
        .catch((err) => assert.ifError(err))
        .then((madeDir) => {
          assert.ifError(err)
          onMade(madeDir, originalList, asPromise)
        })
    }
  })

  function onMade (madeDir, originalList, asPromise) {
    assert(madeDir)
    assert(typeof madeDir === 'string')
    // dir is appropriately named
    if (asTemp) {
      assert(new RegExp('^' + xregexp.escape(path.join(temp.dir, name)) + '[^\\/]+$').test(madeDir))
    } else {
      assert.strictEqual(madeDir, path.join(root, name))
    }

    fs.readdir(root, function (err, newList) {
      assert.ifError(err)
      var list = newList.filter((f) => originalList.indexOf(f) === -1)
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
      assertTreeFileCount(madeDir, 7, () => {
        if (!asPromise) {
          mkfiletree.cleanUp((err) => {
            assert.ifError(err)
            afterClean()
          })
        } else {
          mkfiletree.cleanUp()
            .catch((err) => assert.ifError(err))
            .then(afterClean)
        }

        function afterClean () {
          fs.readdir(root, (err, cleanList) => {
            assert.ifError(err)

            list = cleanList.filter((f) => originalList.indexOf(f) === -1)
            if (asTemp) {
              // cleanup worked, back where we started!
              assert.strictEqual(list.length, 0)
              callback()
            } else {
              // cleanup shouldn't do anything for non-temp dirs
              assert.strictEqual(list.length, 1)
              assert.strictEqual(list[0], name)
              // clean up manually
              rimraf(path.join(__dirname, name), callback)
            }
          })
        }
      })
    })
  }
}

let bork = setTimeout(() => {
  assert.fail('timeout without completing tests')
}, 2000)

// callbacks
runTest(true, false, () => { // makeTemp & cleanUp
  runTest(false, false, () => { // make
    // Promises
    runTest(true, true, () => { // makeTemp & cleanUp
      runTest(false, true, () => { // make
        clearTimeout(bork)
      })
    })
  })
})

console.log('Running... no assertions means no worries!')
