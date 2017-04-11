window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection
var targetId = null
var conn = null
var pcConstraints = {iceServers: []}

function createPeerConnection(){
  conn = new RTCPeerConnection(pcConstraints)
  // Retrieve MediaStreamTrack objects from MediaStream object.
  localMediaStream.getTracks().forEach((track) => {
    var sender = conn.addTrack(track, localMediaStream)
    console.log(sender)
  })
  console.log(conn)

  // Send found ICE candidates to the counterpart.
  conn.onicecandidate = (event) => {
    console.log(event.candidate)
    if(event.candidate){
      socket.emit('icecandidate', targetId, event.candidate)
    }
  }

  //==========
  // Callee
  //==========
  var remoteStream = new MediaStream()
  var elem = document.createElement('video')
  elem.src = URL.createObjectURL(remoteStream)
  //elem.srcObject = remoteStream // newer API
  elem.autoplay = true
  document.querySelector('#stream').appendChild(elem)
  // Callback when the counterpart's track becomes available.
  conn.ontrack = (event) => {
    console.log(event)
    remoteStream.addTrack(event.track)
  }

  // Callback on disconnected.
  conn.oniceconnectionstatechange = function (e){
    if(conn.iceConnectionState == 'disconnected'){
      ringOff()
    }
  }
  return conn
}

function ringOff(){
  var remoteStream = document.querySelector('#stream')
  remoteStream.removeChild(remoteStream.firstElementChild)
  conn = null
  targetId = null
}

document.querySelector('#ringOff').addEventListener('click', ()=>{
  socket.emit('ringoff', targetId)
  ringOff()
})

//==========
// Caller
//==========
document.querySelector('#callingFrom').addEventListener('submit', (e) => {
  targetId = document.querySelector('#calleeId').value
  // Do not offer connecting when already connected to another user.
  if(conn != null){
    e.preventDefault()
    return
  }

  conn = createPeerConnection()
  // Create offer SDP.
  conn.createOffer().then((offerSdp) => {
    // Save created offer SDP as local description.
    return conn.setLocalDescription(offerSdp)
  })
  .then(() => {
    // Send offer SDP to the counterpart.
    socket.emit('offer', targetId, conn.localDescription)
  }).catch(onError)
  e.preventDefault()
})

//==========
// Callee
//==========
socket.on('offer', (userId, offerSdp) => {
  console.log(userId, offerSdp)
  if(conn != null){
    return
  }
  targetId = userId
  conn = createPeerConnection()

  // Save offer SDP from the counterpart as remote description.
  conn.setRemoteDescription(new RTCSessionDescription(offerSdp)).then(() => {
    // Create answer SDP.
    return conn.createAnswer()
  }).then((answerSdp) => {
    // Save created answer SDP as local description.
    return conn.setLocalDescription(answerSdp)
  }).then(() => {
    // Send answer SDP to the counterpart.
    socket.emit('answer', targetId, conn.localDescription)
  }).catch(onError)
})

// Callback on received answer SDP from the counterpart.
socket.on('answer', (userId, answerSdp) => {
  if(userId == targetId){
    console.log(answerSdp)
    conn.setRemoteDescription(new RTCSessionDescription(answerSdp))
  }
})

// Callback on received ICE candidates from the counterpart.
socket.on('icecandidate', (userId, iceCandidate) => {
  if(userId == targetId){
    console.log(iceCandidate)
    conn.addIceCandidate(new RTCIceCandidate(iceCandidate))
  }
})

socket.on('ringoff', (userId) => {
  if(userId == targetId){
    ringOff()
  }
})
