const leveldown   = require('../../lmdb/')
    , crypto      = require('crypto')
    , fs          = require('fs')
    , du          = require('du')
    , uuid        = require('node-uuid')

    , entryCount  = 10000000
    , concurrency = 10
    , timesFile   = './write_random_times.csv'
    , dbDir       = './write_random.db'
    , data        = crypto.randomBytes(256) // buffer

var db          = leveldown(dbDir)
  , timesStream = fs.createWriteStream(timesFile, 'utf8')

function report (ms) {
  console.log('Wrote', entryCount, 'in', Math.floor(ms / 1000) + 's')
  timesStream.end()
  du(dbDir, function (err, size) {
    if (err)
      throw err
    console.log('Database size:', Math.floor(size / 1024 / 1024) + 'M')
  })
  console.log('Wrote times to ', timesFile)
}

db.open(function (err) {
  if (err)
    throw err

  var inProgress  = 0
    , totalWrites = 0
    , startTime   = Date.now()
    //, timesTotal  = 0
    , writeBuf    = ''

  function write() {
    if (totalWrites % 100000 == 0) console.log(inProgress, totalWrites)

    if (totalWrites % 1000 == 0) {
      //timesStream.write((Date.now() - startTime) + ',' + Math.floor(timesTotal / 1000) + '\n')
      //timesTotal = 0
      timesStream.write(writeBuf)
      writeBuf = ''
    }

    if (totalWrites++ == entryCount)
      return report(Date.now() - startTime)

    if (inProgress >= concurrency || totalWrites > entryCount)
      return

    var time = process.hrtime()
    inProgress++

    db.put(uuid.v4(), data, function (err) {
      if (err)
        throw err
      //timesTotal += process.hrtime(time)[1]
      writeBuf += (Date.now() - startTime) + ',' + process.hrtime(time)[1] + '\n'
      inProgress--
      process.nextTick(write)
    })

    process.nextTick(write)
  }

  write()
})
