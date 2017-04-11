"use strict"

var socket = io.connect('/', {reconnection: false})
var localMediaStream

navigator.mediaDevices.enumerateDevices().then((mediaDevices) => {
  console.log('media devices:')
  console.log(mediaDevices)
  // Check web camera and microphone is connected to local machine.
  // If web camera is not connected, we will capture only audio data.
  var cameraFound = !!mediaDevices.filter((mediaDevice) => {
    return mediaDevice.kind == 'videoinput'
  }).length
  var micFound = !!mediaDevices.filter((mediaDevice) => {
    return mediaDevice.kind == 'audioinput'
  }).length
  if(!cameraFound && !micFound){
    onFailure()
    return
  }

  var cameraFound = !!mediaDevices.filter((mediaDevice) => {
    return mediaDevice.kind == 'videoinput'
  }).length

  var constraints = {audio: micFound, video: cameraFound}

  // Capture visual & audio data from web camera and microphone.
  if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
    // For browsers which adapts to new API (Firefox / Chrome 53 -)
    navigator.mediaDevices.getUserMedia(constraints).then(onSuccess).catch(onFailure)
  }else{
    // For browsers which adapts to legacy API (- Chrome 52)
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia
    navigator.getUserMedia(constraints, onSuccess, onFailure)
  }
})
.catch(onFailure)

function onSuccess(stream){
  localMediaStream = stream
  // Display local media stream which is captured by web camera and microphone.
  // This only works if video (not audio) data is captured.
  if(localMediaStream.getVideoTracks().length){
    var mediaElement = document.createElement('video')
    mediaElement.src = URL.createObjectURL(localMediaStream)
    // mediaElement.srcObject = localMediaStream
    mediaElement.autoplay = true
    mediaElement.muted = true
    mediaElement.style.transform = 'rotateY(180deg)'
    document.querySelector('#myStream').appendChild(mediaElement)
  }
}

function onFailure(){
  document.querySelector('#container').style.display = 'none'
  alert('Failed to connect to web camera and microphone.')
}

// Callback on connect to the signaling server.
socket.on('connect', () => {
  console.log('Connect to signaling server')
  document.querySelector('#myId').appendChild(
    document.createTextNode(socket.id)
  )
})
// Callback on disconnect from the signaling server.
socket.on('disconnect', () => {
  console.log('Disconnected from signaling server')
  document.querySelector('#container').style.display = 'none'
  alert('Disconnected from the signaling server.')
})

function onError(err){
  console.log(err)
}
