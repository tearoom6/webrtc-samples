"use strict";

var util = {};
util.myCapsToSendParams = function (sendCaps, remoteRecvCaps) {

    if (!sendCaps || !remoteRecvCaps) { return; }

    // compute intersection of both.
    return util.RTCRtpParameters("", util.filterCodecParams(sendCaps.codecs, remoteRecvCaps.codecs),
        util.filterHdrExtParams(sendCaps.headerExtensions, remoteRecvCaps.headerExtensions), [],
        util.RTCRtcpParameters(0, "", false, true));
};

// RTCRtpParameters
util.RTCRtpParameters = function (inMuxId, inCodecs, inHeaderExtensions, inEncodings, inRtcp) {
    return {
        muxId: inMuxId || "",
        codecs: inCodecs,
        headerExtensions: inHeaderExtensions,
        encodings: inEncodings,
        rtcp: inRtcp
    };
};

// RTCRtpCodecParameters
util.RTCRtpCodecParameters = function (inName, inPayloadType, inClockRate, inNumChannels, inRtcpFeedback, inParameters) {
    return {
        name: inName,
        payloadType: inPayloadType,
        clockRate: inClockRate,
        numChannels: inNumChannels,
        rtcpFeedback: inRtcpFeedback,
        parameters: inParameters
    };
};

// RTCRtcpParameters
util.RTCRtcpParameters = function (inSsrc, inCname, inReducecdSize, inMux) {
    return {
        ssrc: inSsrc,
        cname: inCname,
        reducedSize: inReducecdSize,
        mux: inMux
    };
};

util.myCapsToRecvParams = function (recvCaps, remoteSendCaps) {
    return util.myCapsToSendParams(remoteSendCaps, recvCaps);
};

util.filterCodecParams = function (left, right) {
    var codecPrms = [];

    if (left && right) {
        left.forEach(function (leftItem) {
            for (var i = 0; i < right.length; i++) {
                var codec = right[i];
                if (leftItem.name == codec.name && leftItem.kind === codec.kind &&
                    leftItem.preferredPayloadType === codec.preferredPayloadType &&
                    leftItem.numChannels === codec.numChannels) {

                    codecPrms.push(util.RTCRtpCodecParameters(codec.name, codec.preferredPayloadType,
                        codec.clockRate, codec.numChannels, codec.rtcpFeedback, codec.parameters));

                    break;
                }
            }
        });
    }

    return codecPrms;
};

util.filterHdrExtParams = function (left, right) {

    var hdrExtPrms = [];

    return hdrExtPrms;
};

util.RTCRtpEncodingParameters = function (inSsrc, inCodecPayloadType, inFec, inRtx, inPriority, inMaxBitRate, inMinQuality, inFramerateBias, inResolutionScale, inFramerateScale, inQualityScale, inActive, inEncodingId, inDependencyEncodingIds) {
    return {
        ssrc: inSsrc,
        codecPayloadType: inCodecPayloadType,
        fec: inFec,
        rtx: inRtx,
        priority: inPriority || 1.0,
        maxBitrate: inMaxBitRate || 2000000.0,
        minQuality: inMinQuality || 0,
        framerateBias: inFramerateBias || 0.5,
        resolutionScale: inResolutionScale || 1.0,
        framerateScale: inFramerateScale || 1.0,
        active: inActive || true,
        encodingId: inEncodingId,
        dependencyEncodingId: inDependencyEncodingIds
    };
};

util.RTCIceServer = function (inUrls, inUsername, inCredentials) {
    return {
        urls: inUrls,
        username: inUsername,
        credentials: inCredentials
    };
};

util.RTCIceGatherOptions = function (inGatherPolicy, inIceServers) {
    return {
        gatherPolicy: inGatherPolicy,
        iceServers: inIceServers
    };
};
