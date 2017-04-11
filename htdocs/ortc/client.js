let peer = null

class RTCPeer {
  constructor(id, isCaller){
    let self = this
    this.id = id
    this.isCaller = isCaller

    this.iceOptions = {
      gatherPolicy: 'all',
      iceServers: []
    }
    this.iceGatherer = new RTCIceGatherer(this.iceOptions)
    this.iceTransport = new RTCIceTransport(this.iceGatherer)
    this.dtlsTransport = new RTCDtlsTransport(this.iceTransport)
    this.localParams = null
    this.remoteParams = null
    this.localCaps = null
    this.remoteCaps = null

    // Search ICE candidate.
    this.iceGatherer.onlocalcandidate = (e) => {
      socket.emit('icecandidate', self.id, e.candidate)
      if(Object.keys(e.candidate).length == 0){
        self.localParams = {
          ice: self.iceGatherer.getLocalParameters(),
          dtls: self.dtlsTransport.getLocalParameters()
        }
        socket.emit('localparams', self.id, self.localParams)
        self.checkParams()
      }
    }

    this.iceTransport.onicestatechange = (e) => {
      console.log('RTCIceTransport.onicestatechange', e.target.state)
      if(e.target.state == 'disconnected'){
        ringOff()
      }
    }
    this.dtlsTransport.ondtlsstatechange = (e) => {
      console.log('RTCDtlsTransport.ondtlsstatechange', e.target.state)
    }

    // Set video / audio to RTCRtpSender object.
    if(localMediaStream.getVideoTracks().length){
      let vTrack = localMediaStream.getVideoTracks()[0]
      this.videoSender = new RTCRtpSender(vTrack, this.dtlsTransport)
    }
    if(localMediaStream.getAudioTracks().length){
      let aTrack = localMediaStream.getAudioTracks()[0]
      this.audioSender = new RTCRtpSender(aTrack, this.dtlsTransport)
    }

    // Set video / audio to RTCRtpReceiver object.
    this.audioReceiver = new RTCRtpReceiver(this.dtlsTransport, 'audio')
    this.videoReceiver = new RTCRtpReceiver(this.dtlsTransport, 'video')
    // Edgeでは上のコードで動作するが、最新の仕様書では引数の順番が逆
    //this.audioReceiver = new RTCRtpReceiver('audio', this.dtlsTransport)
    //this.videoReceiver = new RTCRtpReceiver('video', this.dtlsTransport)

    // Create MediaStream.
    this.remoteStream = new MediaStream()
    this.remoteStream.addTrack(this.audioReceiver.track)
    this.remoteStream.addTrack(this.videoReceiver.track)

    // Exchange Capabilities.
    this.localCaps = {
      send: {
        audio: RTCRtpSender.getCapabilities('audio'),
        video: RTCRtpSender.getCapabilities('video')
      },
      recv: {
        audio: RTCRtpReceiver.getCapabilities('audio'),
        video: RTCRtpReceiver.getCapabilities('video')
      }
    }
    console.log('get local capabilities')
    console.log(this.localCaps)
    socket.emit('capabilities', this.id, this.localCaps)
    this.checkCaps()
  }
  onRemoteParams(remoteParams){
    this.remoteParams = remoteParams
    this.checkParams()
  }
  checkParams(){
    if(!this.localParams || !this.remoteParams){
      return
    }
    this.iceTransport.start(this.iceGatherer, this.remoteParams.ice,
        this.isCaller?'controlling':'controlled')
    this.dtlsTransport.start(this.remoteParams.dtls)
  }
  onRemoteCaps(remoteCaps) {
    this.remoteCaps = remoteCaps
    this.checkCaps()
  }
  checkCaps(){
    if(!this.localCaps || !this.remoteCaps){
      return
    }
    this.audioSendParams = util.myCapsToSendParams(this.localCaps.send.audio, this.remoteCaps.recv.audio)
    this.videoSendParams = util.myCapsToSendParams(this.localCaps.send.video, this.remoteCaps.recv.video)
    this.audioRecvParams = util.myCapsToRecvParams(this.localCaps.recv.audio, this.remoteCaps.send.audio)
    this.videoRecvParams = util.myCapsToRecvParams(this.localCaps.recv.video, this.remoteCaps.send.video)

    this.audioRecvParams.muxId = null
    this.audioRecvParams.encodings.push(util.RTCRtpEncodingParameters(1001, 0, 0, 0, 1.0))
    this.audioReceiver.receive(this.audioRecvParams)
    this.videoRecvParams.muxId = null
    console.log(this.videoRecvParams.encodings)
    this.videoRecvParams.encodings.push(util.RTCRtpEncodingParameters(3003, 0, 0, 0, 1.0))
    this.videoReceiver.receive(this.videoRecvParams)
    if(this.audioSender){
      this.audioSendParams.encodings.push(util.RTCRtpEncodingParameters(1001, 0, 0, 0, 1.0))
      this.audioSender.send(this.audioSendParams)
    }
    if(this.videoSender){
      console.log(this.videoSendParams.encodings)
      this.videoSendParams.encodings.push(util.RTCRtpEncodingParameters(3003, 0, 0, 0, 1.0))
      this.videoSender.send(this.videoSendParams)
    }

    let mediaElement = document.createElement('video')
    mediaElement.autoplay = true
    mediaElement.srcObject = this.remoteStream
    document.querySelector('#stream').appendChild(mediaElement)
  }
}

function ringOff(){
  let remoteStream = document.querySelector('#stream')
  remoteStream.removeChild(remoteStream.firstElementChild)
  peer = null
  targetId = null
}

document.querySelector('#ringOff').addEventListener('click', ()=>{
  socket.emit('ringoff', peer.id)
  ringOff()
})

//==========
// Caller
//==========
document.querySelector('#callingFrom').addEventListener('submit', (e) => {
  let targetId = document.querySelector('#calleeId').value
  // Do not offer connecting when already connected to another user.
  if(peer != null){
    e.preventDefault()
    return false
  }

  socket.emit('offer', targetId)
  peer = new RTCPeer(targetId, true)

  e.preventDefault()
  return false
})

//==========
// Callee
//==========
socket.on('offer', (userId) => {
  console.log(userId)
  if(peer != null){
    return
  }
  peer = new RTCPeer(userId, false)
})

socket.on('capabilities', (userId, capabilities) => {
  if(peer && userId == peer.id){
    console.log(capabilities)
    peer.onRemoteCaps(capabilities)
  }
})

socket.on('icecandidate', (userId, iceCandidate) => {
  if(peer && userId == peer.id){
    console.log(iceCandidate)
    peer.iceTransport.addRemoteCandidate(iceCandidate)
  }
})

socket.on('localparams', (userId, payload) => {
  if(peer && userId == peer.id){
    peer.onRemoteParams(payload)
  }
})

socket.on('ringoff', (userId) => {
  if(peer && userId == peer.id){
    ringOff()
  }
})
