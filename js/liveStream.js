/**
 * CRDITEACH - REALTIME LIVE STREAMING & WEBRTC PEER ENGINE
 * Handles:
 *  - Real-time SSE + Supabase Realtime synchronization across Marketplace & Classroom
 *  - Host multi-viewer WebRTC broadcasting (Camera, Screen Share, Screen + Facecam)
 *  - Viewer WebRTC stream playback with loading, pause, resume, unmute, and reconnect handling
 *  - Automatic pause on host leave and resume without duplicate stream creation
 */

import { auth } from './auth.js';
import { state } from './state.js';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

// Unique per-tab client ID so Host and Viewer tabs on the same browser never collide
function getLiveClientId() {
  let id = sessionStorage.getItem('crditeach_live_client_id');
  if (!id) {
    id = 'peer_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
    sessionStorage.setItem('crditeach_live_client_id', id);
  }
  return id;
}

export const LIVE_CLIENT_ID = getLiveClientId();

let eventSource = null;
let sseReconnectTimer = null;
let supabaseRealtimeClient = null;
let supabaseRealtimeChannel = null;

// Active Host State
const hostSession = {
  courseId: null,
  streamId: null,
  liveStatus: 'ENDED', // 'LIVE' | 'PAUSED' | 'ENDED'
  peers: new Map(), // viewerId -> RTCPeerConnection
  pendingCandidates: new Map() // viewerId -> RTCIceCandidateInit[]
};

// Active Viewer State
const viewerSession = {
  courseId: null,
  streamId: null,
  hostClientId: null,
  pc: null,
  remoteStream: null,
  pendingCandidates: [],
  connectTimeout: null,
  callbacks: null
};

export function getHostLiveSession() {
  return hostSession;
}

export function isHostActivelyLive() {
  return Boolean(hostSession.courseId && hostSession.liveStatus === 'LIVE');
}

async function postSignal(body) {
  const headers = {
    'Content-Type': 'application/json',
    ...auth.getAuthHeaders()
  };
  const res = await fetch('/api/live/signal', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({
      fromClientId: LIVE_CLIENT_ID,
      ...body
    })
  });
  return await res.json();
}

function upsertCourseInState(courseObj) {
  if (!courseObj || !courseObj.id) return;
  const idx = state.courses.findIndex(c => String(c.id) === String(courseObj.id));
  if (idx !== -1) {
    state.courses[idx] = { ...state.courses[idx], ...courseObj };
  } else {
    state.courses.unshift(courseObj);
  }
  state.saveState(false);
}

function handleIncomingLiveUpdate(payload) {
  if (!payload) return;

  if (payload.course) {
    upsertCourseInState(payload.course);
  } else if (payload.courseId) {
    const existing = state.courses.find(c => String(c.id) === String(payload.courseId));
    if (existing) {
      if (typeof payload.isLive === 'boolean') existing.isLive = payload.isLive;
      if (payload.liveStatus) existing.liveStatus = payload.liveStatus;
      if (payload.streamId) existing.streamId = payload.streamId;
      if (payload.videoUrl !== undefined) existing.videoUrl = payload.videoUrl;
      if (payload.liveStatus === 'PAUSED') existing.duration = 'PAUSED';
      if (payload.liveStatus === 'LIVE') existing.duration = 'LIVE';
      if (payload.liveStatus === 'ENDED') {
        existing.format = 'Recorded Live';
        existing.duration = 'Recorded Stream';
      }
      state.saveState(false);
    } else {
      // Unknown course arrived via Realtime -> reload from DB cleanly
      state.loadCoursesFromDB();
    }
  }

  // Keep hostSession synchronized if this tab owns that course
  if (hostSession.courseId && String(hostSession.courseId) === String(payload.courseId)) {
    if (payload.liveStatus) hostSession.liveStatus = payload.liveStatus;
  }

  // Notify viewer session if watching this course
  if (viewerSession.courseId && String(viewerSession.courseId) === String(payload.courseId)) {
    const status = payload.liveStatus || (payload.isLive ? 'LIVE' : 'ENDED');
    if (status === 'PAUSED') {
      viewerSession.callbacks?.onStatusChange?.('paused', 'Host paused the live stream. Waiting for host to resume...');
    } else if (status === 'ENDED') {
      disconnectViewerFromStream();
      viewerSession.callbacks?.onStatusChange?.('ended', 'This live stream has ended.');
    } else if (status === 'LIVE') {
      viewerSession.callbacks?.onStatusChange?.('connecting', 'Host resumed! Connecting to live video...');
      requestViewerOffer();
    }
  }

  // Broadcast DOM event for reactive components
  window.dispatchEvent(new CustomEvent('crditeach:live-update', { detail: payload }));
}

async function handleIncomingWebRtcSignal(msg) {
  if (!msg || !msg.type) return;

  // 1. Host receives viewer join -> create offer
  if (msg.type === 'viewer-join' && hostSession.courseId && String(msg.streamId) === String(hostSession.streamId)) {
    if (window.activeLocalLiveStream) {
      await createHostOfferForViewer(msg.fromClientId);
    }
    return;
  }

  // 2. Host receives viewer leave -> cleanup peer
  if (msg.type === 'viewer-leave' && hostSession.courseId && String(msg.streamId) === String(hostSession.streamId)) {
    const pc = hostSession.peers.get(msg.fromClientId);
    if (pc) {
      try { pc.close(); } catch {}
      hostSession.peers.delete(msg.fromClientId);
    }
    hostSession.pendingCandidates.delete(msg.fromClientId);
    return;
  }

  // 3. Host receives SDP answer from viewer
  if (msg.type === 'answer' && hostSession.courseId && String(msg.streamId) === String(hostSession.streamId)) {
    const pc = hostSession.peers.get(msg.fromClientId);
    if (pc && msg.payload?.sdp) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));
        const queued = hostSession.pendingCandidates.get(msg.fromClientId) || [];
        for (const cand of queued) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
        hostSession.pendingCandidates.delete(msg.fromClientId);
      } catch (err) {
        console.warn('Host setRemoteDescription warning:', err);
      }
    }
    return;
  }

  // 4. ICE candidate (either Host or Viewer)
  if (msg.type === 'ice-candidate' && msg.payload?.candidate) {
    // Check if intended for Host
    if (hostSession.courseId && String(msg.streamId) === String(hostSession.streamId) && hostSession.peers.has(msg.fromClientId)) {
      const pc = hostSession.peers.get(msg.fromClientId);
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(msg.payload.candidate)).catch(() => {});
      } else {
        const list = hostSession.pendingCandidates.get(msg.fromClientId) || [];
        list.push(msg.payload.candidate);
        hostSession.pendingCandidates.set(msg.fromClientId, list);
      }
      return;
    }

    // Check if intended for Viewer
    if (viewerSession.pc && String(msg.streamId) === String(viewerSession.streamId)) {
      if (viewerSession.pc.remoteDescription) {
        await viewerSession.pc.addIceCandidate(new RTCIceCandidate(msg.payload.candidate)).catch(() => {});
      } else {
        viewerSession.pendingCandidates.push(msg.payload.candidate);
      }
    }
    return;
  }

  // 5. Viewer receives host-ready signal -> join immediately
  if (msg.type === 'host-ready' && viewerSession.streamId && String(msg.streamId) === String(viewerSession.streamId)) {
    if (msg.liveStatus === 'PAUSED') {
      viewerSession.callbacks?.onStatusChange?.('paused', 'Host paused the live stream. Waiting to resume...');
    } else {
      viewerSession.callbacks?.onStatusChange?.('connecting', 'Connecting to live broadcast...');
      await requestViewerOffer();
    }
    return;
  }

  // 6. Viewer receives SDP offer from Host
  if (msg.type === 'offer' && viewerSession.streamId && String(msg.streamId) === String(viewerSession.streamId)) {
    await handleViewerReceiveOffer(msg.fromClientId, msg.payload?.sdp);
  }
}

/**
 * Initialize persistent Realtime sync (SSE + optional Supabase Realtime)
 */
export function initLiveRealtimeSync() {
  connectSse();
  initOptionalSupabaseRealtime();
}

function connectSse() {
  if (eventSource && eventSource.readyState !== EventSource.CLOSED) return;

  try {
    const url = `/api/live/events?clientId=${encodeURIComponent(LIVE_CLIENT_ID)}`;
    eventSource = new EventSource(url);

    eventSource.addEventListener('live-update', (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        handleIncomingLiveUpdate(payload);
      } catch {}
    });

    eventSource.addEventListener('webrtc-signal', (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        handleIncomingWebRtcSignal(msg);
      } catch {}
    });

    eventSource.addEventListener('connected', () => {
      if (sseReconnectTimer) {
        clearTimeout(sseReconnectTimer);
        sseReconnectTimer = null;
      }
      // If host is currently live, re-announce on reconnect
      if (hostSession.courseId && hostSession.streamId && hostSession.liveStatus !== 'ENDED') {
        postSignal({
          streamId: hostSession.streamId,
          courseId: hostSession.courseId,
          type: 'host-announce',
          payload: { liveStatus: hostSession.liveStatus }
        }).catch(() => {});
      }
      // If viewer is currently watching, re-join on reconnect
      if (viewerSession.streamId && viewerSession.courseId) {
        requestViewerOffer();
      }
    });

    eventSource.onerror = () => {
      try { eventSource.close(); } catch {}
      eventSource = null;
      if (!sseReconnectTimer) {
        sseReconnectTimer = setTimeout(() => {
          sseReconnectTimer = null;
          connectSse();
        }, 2500);
      }
    };
  } catch (err) {
    console.warn('SSE init warning:', err);
  }
}

async function initOptionalSupabaseRealtime() {
  if (supabaseRealtimeClient) return;
  try {
    const res = await fetch('/api/config/public');
    const cfg = await res.json();
    if (!cfg.supabaseConfigured || !cfg.supabaseUrl || !cfg.supabasePublishableKey) return;

    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabaseRealtimeClient = createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
    supabaseRealtimeChannel = supabaseRealtimeClient
      .channel('crditeach-live-courses')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courses' },
        (payload) => {
          const row = payload.new;
          if (!row) return;
          handleIncomingLiveUpdate({
            type: row.live_status === 'ENDED' ? 'live-ended' : 'live-status',
            courseId: row.id,
            streamId: row.stream_id || row.id,
            liveStatus: row.live_status || (row.is_live ? 'LIVE' : 'ENDED'),
            isLive: Boolean(row.is_live),
            videoUrl: row.video_url || ''
          });
        }
      )
      .subscribe();
  } catch {
    // Offline or Supabase keys not configured; Express SSE handles all real-time sync cleanly
  }
}

// =====================================================================
// HOST WEBRTC BROADCASTING & PAUSE/RESUME CONTROLLER
// =====================================================================

export async function startHostBroadcast({ courseId, streamId, stream }) {
  hostSession.courseId = courseId;
  hostSession.streamId = streamId || courseId;
  hostSession.liveStatus = 'LIVE';

  if (stream) {
    window.activeLocalLiveStream = stream;
    stream.getTracks().forEach(t => { t.enabled = true; });
  }

  connectSse();

  try {
    const res = await postSignal({
      streamId: hostSession.streamId,
      courseId: hostSession.courseId,
      type: 'host-announce',
      payload: { liveStatus: 'LIVE' }
    });

    if (Array.isArray(res.viewers) && window.activeLocalLiveStream) {
      for (const viewerId of res.viewers) {
        await createHostOfferForViewer(viewerId);
      }
    }
  } catch (err) {
    console.warn('Host announce warning:', err);
  }
}

async function createHostOfferForViewer(viewerId) {
  if (!window.activeLocalLiveStream || !hostSession.streamId) return;

  const existingPc = hostSession.peers.get(viewerId);
  if (existingPc) {
    try { existingPc.close(); } catch {}
    hostSession.peers.delete(viewerId);
  }

  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  hostSession.peers.set(viewerId, pc);

  window.activeLocalLiveStream.getTracks().forEach(track => {
    pc.addTrack(track, window.activeLocalLiveStream);
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      postSignal({
        streamId: hostSession.streamId,
        courseId: hostSession.courseId,
        targetClientId: viewerId,
        type: 'ice-candidate',
        payload: { candidate: event.candidate }
      }).catch(() => {});
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      try { pc.close(); } catch {}
      if (hostSession.peers.get(viewerId) === pc) {
        hostSession.peers.delete(viewerId);
      }
    }
  };

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await postSignal({
      streamId: hostSession.streamId,
      courseId: hostSession.courseId,
      targetClientId: viewerId,
      type: 'offer',
      payload: { sdp: pc.localDescription }
    });
  } catch (err) {
    console.warn('createHostOfferForViewer error:', err);
  }
}

export async function replaceHostBroadcastTracks(newStream) {
  if (!newStream) return;
  window.activeLocalLiveStream = newStream;

  const videoTrack = newStream.getVideoTracks()[0] || null;
  const audioTrack = newStream.getAudioTracks()[0] || null;

  for (const [viewerId, pc] of hostSession.peers.entries()) {
    try {
      const senders = pc.getSenders();
      const vSender = senders.find(s => s.track && s.track.kind === 'video');
      const aSender = senders.find(s => s.track && s.track.kind === 'audio');

      if (vSender && videoTrack) {
        await vSender.replaceTrack(videoTrack);
      } else if (!vSender && videoTrack) {
        await createHostOfferForViewer(viewerId);
        continue;
      }

      if (aSender && audioTrack) {
        await aSender.replaceTrack(audioTrack);
      }
    } catch {
      await createHostOfferForViewer(viewerId);
    }
  }

  // If paused, automatically resume when switching to a fresh source
  if (hostSession.courseId && hostSession.liveStatus === 'PAUSED') {
    await resumeHostBroadcast();
  }
}

export async function pauseHostBroadcast(reason = 'navigated-away') {
  if (!hostSession.courseId || hostSession.liveStatus !== 'LIVE') return false;

  hostSession.liveStatus = 'PAUSED';

  // Pause MediaRecorder so paused downtime isn't recorded
  if (window.activeLiveRecorder && window.activeLiveRecorder.state === 'recording') {
    try { window.activeLiveRecorder.pause(); } catch {}
  }

  // Disable tracks so viewers stop receiving live camera/mic frames while preserving session
  if (window.activeLocalLiveStream) {
    window.activeLocalLiveStream.getTracks().forEach(t => { t.enabled = false; });
  }

  const course = state.courses.find(c => String(c.id) === String(hostSession.courseId));
  if (course) {
    course.liveStatus = 'PAUSED';
    course.duration = 'PAUSED';
    state.saveState(false);
  }

  try {
    await fetch(`/api/courses/${encodeURIComponent(hostSession.courseId)}/live-status`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...auth.getAuthHeaders()
      },
      body: JSON.stringify({ status: 'PAUSED' })
    });
  } catch (err) {
    console.warn('Pause live status sync warning:', err);
  }

  if (reason === 'navigated-away') {
    window.showToast?.(
      '⏸ Live Stream Paused',
      'Your live session is paused because you left the live page. Return anytime to resume or click End Live.',
      'info'
    );
  }

  return true;
}

export async function resumeHostBroadcast(courseObj = null) {
  const targetCourseId = courseObj?.id || hostSession.courseId;
  const targetStreamId = courseObj?.streamId || hostSession.streamId || targetCourseId;
  if (!targetCourseId) return false;

  hostSession.courseId = targetCourseId;
  hostSession.streamId = targetStreamId;
  hostSession.liveStatus = 'LIVE';

  // Ensure we have a live MediaStream (re-acquire camera if page refreshed)
  const hasLiveTracks = window.activeLocalLiveStream &&
    window.activeLocalLiveStream.getTracks().some(t => t.readyState === 'live');

  if (hasLiveTracks) {
    window.activeLocalLiveStream.getTracks().forEach(t => { t.enabled = true; });
  } else {
    try {
      const freshStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      window.activeLocalLiveStream = freshStream;
      window.liveRecordedChunks = window.liveRecordedChunks || [];
      try {
        const rec = new MediaRecorder(freshStream, { mimeType: 'video/webm' });
        rec.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) window.liveRecordedChunks.push(ev.data);
        };
        rec.start(1000);
        window.activeLiveRecorder = rec;
      } catch {}
    } catch {
      window.showToast?.('Permission Required', 'Allow camera/mic access to resume your live broadcast.', 'error');
      return false;
    }
  }

  if (window.activeLiveRecorder && window.activeLiveRecorder.state === 'paused') {
    try { window.activeLiveRecorder.resume(); } catch {}
  }

  const course = state.courses.find(c => String(c.id) === String(targetCourseId));
  if (course) {
    course.liveStatus = 'LIVE';
    course.duration = 'LIVE';
    state.saveState(false);
  }

  try {
    await fetch(`/api/courses/${encodeURIComponent(targetCourseId)}/live-status`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...auth.getAuthHeaders()
      },
      body: JSON.stringify({ status: 'LIVE' })
    });
  } catch (err) {
    console.warn('Resume live status sync warning:', err);
  }

  await startHostBroadcast({
    courseId: targetCourseId,
    streamId: targetStreamId,
    stream: window.activeLocalLiveStream
  });

  window.showToast?.('🔴 Live Stream Resumed', 'You are back live! Viewers can watch your stream now.', 'success');
  return true;
}

export function stopHostBroadcast() {
  for (const [, pc] of hostSession.peers.entries()) {
    try { pc.close(); } catch {}
  }
  hostSession.peers.clear();
  hostSession.pendingCandidates.clear();
  hostSession.courseId = null;
  hostSession.streamId = null;
  hostSession.liveStatus = 'ENDED';
}

// =====================================================================
// VIEWER WEBRTC PLAYER CONTROLLER
// =====================================================================

export async function connectViewerToStream({
  courseId,
  streamId,
  liveStatus,
  onStatusChange,
  onStreamReady,
  onError
}) {
  disconnectViewerFromStream();

  viewerSession.courseId = courseId;
  viewerSession.streamId = streamId || courseId;
  viewerSession.callbacks = { onStatusChange, onStreamReady, onError };

  connectSse();

  if (liveStatus === 'ENDED') {
    onStatusChange?.('ended', 'This live session has ended.');
    return;
  }

  if (liveStatus === 'PAUSED') {
    onStatusChange?.('paused', 'Host paused the live stream. Waiting for host to resume...');
    // Still join room so viewer auto-connects the instant the host resumes
    postSignal({
      streamId: viewerSession.streamId,
      courseId: viewerSession.courseId,
      type: 'viewer-join'
    }).catch(() => {});
    return;
  }

  onStatusChange?.('connecting', 'Connecting to live broadcast...');
  await requestViewerOffer();
}

async function requestViewerOffer() {
  if (!viewerSession.streamId) return;

  if (viewerSession.connectTimeout) {
    clearTimeout(viewerSession.connectTimeout);
    viewerSession.connectTimeout = null;
  }

  try {
    const res = await postSignal({
      streamId: viewerSession.streamId,
      courseId: viewerSession.courseId,
      type: 'viewer-join'
    });

    if (res.liveStatus === 'PAUSED') {
      viewerSession.callbacks?.onStatusChange?.('paused', 'Host paused the live stream. Waiting for host to resume...');
      return;
    }

    if (res.liveStatus === 'ENDED') {
      viewerSession.callbacks?.onStatusChange?.('ended', 'This live stream has ended.');
      return;
    }

    if (!res.hostConnected) {
      viewerSession.callbacks?.onStatusChange?.('waiting', 'Waiting for host broadcast signal...');
    } else {
      viewerSession.callbacks?.onStatusChange?.('connecting', 'Establishing live video stream...');
    }

    // Timeout notice if host connection hasn't delivered frames after 12s
    viewerSession.connectTimeout = setTimeout(() => {
      if (viewerSession.streamId && !viewerSession.remoteStream) {
        viewerSession.callbacks?.onError?.('Live broadcast signal is taking longer than usual. Host may be reconnecting.');
      }
    }, 12000);
  } catch (err) {
    viewerSession.callbacks?.onError?.('Could not reach live signaling server.');
  }
}

async function handleViewerReceiveOffer(hostClientId, sdp) {
  if (!sdp || !viewerSession.streamId) return;

  if (viewerSession.pc) {
    try { viewerSession.pc.close(); } catch {}
    viewerSession.pc = null;
  }
  viewerSession.hostClientId = hostClientId;
  viewerSession.remoteStream = new MediaStream();
  viewerSession.pendingCandidates = [];

  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  viewerSession.pc = pc;

  pc.ontrack = (event) => {
    if (viewerSession.connectTimeout) {
      clearTimeout(viewerSession.connectTimeout);
      viewerSession.connectTimeout = null;
    }

    if (event.streams && event.streams[0]) {
      viewerSession.remoteStream = event.streams[0];
    } else if (event.track) {
      viewerSession.remoteStream.addTrack(event.track);
    }

    viewerSession.callbacks?.onStreamReady?.(viewerSession.remoteStream);
    viewerSession.callbacks?.onStatusChange?.('playing', '');
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      postSignal({
        streamId: viewerSession.streamId,
        courseId: viewerSession.courseId,
        targetClientId: hostClientId,
        type: 'ice-candidate',
        payload: { candidate: event.candidate }
      }).catch(() => {});
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      if (viewerSession.streamId) {
        viewerSession.callbacks?.onError?.('Connection interrupted. Retrying...');
      }
    }
  };

  try {
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    for (const cand of viewerSession.pendingCandidates) {
      await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
    }
    viewerSession.pendingCandidates = [];

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await postSignal({
      streamId: viewerSession.streamId,
      courseId: viewerSession.courseId,
      targetClientId: hostClientId,
      type: 'answer',
      payload: { sdp: pc.localDescription }
    });
  } catch (err) {
    console.error('Viewer handleOffer error:', err);
    viewerSession.callbacks?.onError?.('Failed to establish live video playback.');
  }
}

export function disconnectViewerFromStream() {
  if (viewerSession.connectTimeout) {
    clearTimeout(viewerSession.connectTimeout);
    viewerSession.connectTimeout = null;
  }

  if (viewerSession.streamId) {
    postSignal({
      streamId: viewerSession.streamId,
      courseId: viewerSession.courseId,
      type: 'viewer-leave'
    }).catch(() => {});
  }

  if (viewerSession.pc) {
    try { viewerSession.pc.close(); } catch {}
    viewerSession.pc = null;
  }

  viewerSession.courseId = null;
  viewerSession.streamId = null;
  viewerSession.hostClientId = null;
  viewerSession.remoteStream = null;
  viewerSession.pendingCandidates = [];
  viewerSession.callbacks = null;
}
