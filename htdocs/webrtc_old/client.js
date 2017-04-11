window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection
var targetId = null
var conn = null
var pcConstraints = {iceServers: []}

function createPeerConnection(){
  conn = new RTCPeerConnection(pcConstraints)
  conn.addStream(localMediaStream)
  console.log(conn)

  // Send found ICE candidates to the counterpart.
  conn.onicecandidate = (event) => {
    console.log(event.candidate)
    if(event.candidate){
      socket.emit('icecandidate', targetId, event.candidate)
    }
  }

  // Callback when the counterpart's MediaStream becomes available.
  // It's not called by `addStream` method calling by my side.
  conn.onaddstream = (event) => {
    console.log(event.stream)
    var elem = document.createElement('video')
    elem.src = URL.createObjectURL(event.stream)
    //elem.srcObject = event.stream // newer API
    elem.autoplay = true
    document.querySelector('#stream').appendChild(elem)
  }

  // Callback on disconnected.
  conn.oniceconnectionstatechange = (e) => {
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
  conn.createOffer((offerSdp) => {
    console.log(offerSdp)
    console.log(offerSdp.sdp)
    // Save created offer SDP as local description.
    conn.setLocalDescription(offerSdp, () => {
      // Send offer SDP to the counterpart.
      socket.emit('offer', targetId, offerSdp)
    }, onError)
  }, onError)

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
  conn.setRemoteDescription(new RTCSessionDescription(offerSdp), () => {
    // Create answer SDP.
    conn.createAnswer((answerSdp) => {
      // Save created answer SDP as local description.
      conn.setLocalDescription(answerSdp, () => {
        // Send answer SDP to the counterpart.
        socket.emit('answer', targetId, answerSdp)
      }, onError)
    }, onError)
  }, onError)
})

// Callback on received answer SDP from the counterpart.
socket.on('answer', (userId, answerSdp) => {
  if(userId == targetId){
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
