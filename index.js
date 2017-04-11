const express = require('express')
const http = require('http')

const app = express()
const server = http.Server(app).listen(8000, '0.0.0.0')
app.use(express.static(__dirname + '/htdocs/'))

const io = require('socket.io')(server)
const webrtcNS = io.of('/')

webrtcNS.on('connection', (socket) => {
  // Send signaling message to the other user.
  const events = ['offer', 'answer', 'icecandidate', 'localparams', 'capabilities', 'ringoff']
  events.forEach((event) => {
    socket.on(event, (userId, payload) => {
      console.log(event)
      webrtcNS.to('/#' + userId).emit(event, socket.id.slice(2), payload)
    })
  })
})
