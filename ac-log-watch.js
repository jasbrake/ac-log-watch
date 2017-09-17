const Tail = require('always-tail')
const fs = require('fs')
const acLogExpressions = require('./regex-expressions')

const config = require('./config')

const loginStream = fs.createWriteStream(config.inputPath, { flags: 'a' })

let bytesRead = null

if (fs.existsSync(config.positionPath)) {
  bytesRead = Number.parseInt(fs.readFileSync(config.positionPath, { encoding: 'utf8' }))
  console.log(`Saved position found. Starting from byte: ${bytesRead}`)
} else {
  bytesRead = 0
  console.log(`Saved position not found. Starting from byte: ${bytesRead}`)
}

const tail = new Tail(config.inputPath, '\n', { start: bytesRead })

tail.on('line', (line) => {
  bytesRead += getBytes(line) + 1 // we add 1 for the newline byte
  const logged = line.match(acLogExpressions.loggedIn)
  if (logged) {
    loginStream.write(`${logged[3]}\t${logged[4]}\n`)
  } else {
    const changed = line.match(acLogExpressions.changedName)
    if (changed) {
      loginStream.write(`${changed[3]}\t${changed[5]}\n`)
    }
  }
})

tail.on('error', (error) => {
  console.error(error)
})

function savePosition (path, position) {
  console.log(`Writing position ${position}`)
  fs.writeFileSync(path, position)
}

function getBytes (string) {
  return Number.parseInt(Buffer.byteLength(string, 'utf8'))
}

function closeGracefully () {
  console.log('quitting...')
  savePosition(config.positionPath, bytesRead)
  tail.unwatch()
  loginStream.end()
  console.log('Position saved')
  process.exit()
}

process.on('SIGINT', closeGracefully)
process.on('SIGTERM', closeGracefully)

tail.watch()
