/**
 * CRDITEACH - LIVE STREAM REALTIME HUB & WEBRTC SIGNALING SERVER
 * Manages real-time SSE synchronization across Marketplace & Viewers,
 * and relays WebRTC signaling (SDP offers/answers & ICE candidates)
 * between live hosts and multiple simultaneous viewers.
 */

import { db } from './db.js';
import { isSupabaseConfigured } from './supabase.js';

// Connected SSE clients: clientId -> { res, streamId, connectedAt }
const sseClients = new Map();

// Active WebRTC stream rooms: streamId -> { courseId, hostClientId, hostUserId, liveStatus, viewers: Set<clientId> }
const streamRooms = new Map();

function sendSse(res, eventName, data) {
  try {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {
    // Ignore broken pipe; cleanup happens on 'close'
  }
}

/**
 * Broadcast live course/stream state changes (LIVE, PAUSED, ENDED, NEW)
 * to ALL connected clients (Marketplace feeds and active Classroom viewers).
 */
export function broadcastLiveUpdate(payload) {
  for (const [, client] of sseClients.entries()) {
    sendSse(client.res, 'live-update', payload);
  }
}

/**
 * GET /api/live/events?clientId=<id>&streamId=<optional>
 * Opens persistent Server-Sent Events stream for real-time updates & WebRTC signals.
 */
export function handleLiveEvents(req, res) {
  const clientId = String(req.query.clientId || '').trim();
  const streamId = String(req.query.streamId || '').trim() || null;

  if (!clientId) {
    return res.status(400).json({ error: 'clientId query parameter is required.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Replace stale connection if same clientId reconnects
  const existing = sseClients.get(clientId);
  if (existing && existing.res !== res) {
    try { existing.res.end(); } catch {}
  }

  sseClients.set(clientId, {
    res,
    streamId,
    connectedAt: Date.now()
  });

  sendSse(res, 'connected', { clientId, serverTime: new Date().toISOString() });

  // Heartbeat keep-alive every 20 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const current = sseClients.get(clientId);
    if (current && current.res === res) {
      sseClients.delete(clientId);
    }

    // Remove departing viewer from any stream room and inform host
    for (const [sId, room] of streamRooms.entries()) {
      if (room.viewers.has(clientId)) {
        room.viewers.delete(clientId);
        if (room.hostClientId && sseClients.has(room.hostClientId)) {
          sendSse(sseClients.get(room.hostClientId).res, 'webrtc-signal', {
            type: 'viewer-leave',
            streamId: sId,
            fromClientId: clientId,
            viewerCount: room.viewers.size
          });
        }
      }
      if (room.hostClientId === clientId) {
        room.hostClientId = null;
      }
    }
  });
}

function getOrCreateRoom(streamId, courseId = null) {
  if (!streamRooms.has(streamId)) {
    streamRooms.set(streamId, {
      streamId,
      courseId,
      hostClientId: null,
      hostUserId: null,
      liveStatus: 'LIVE',
      viewers: new Set()
    });
  }
  const room = streamRooms.get(streamId);
  if (courseId && !room.courseId) room.courseId = courseId;
  return room;
}

/**
 * POST /api/live/signal
 * Routes WebRTC SDP/ICE messages and host/viewer room announcements.
 */
export function handleLiveSignal(req, res) {
  try {
    const {
      streamId,
      courseId,
      type,
      fromClientId,
      targetClientId,
      payload
    } = req.body || {};

    if (!streamId || !type || !fromClientId) {
      return res.status(400).json({ error: 'streamId, type, and fromClientId are required.' });
    }

    // Look up authoritative course/stream state from DB
    const courseRow = db.prepare(
      'SELECT id, user_id, is_live, live_status, stream_id FROM courses WHERE stream_id = ? OR id = ?'
    ).get(streamId, courseId || streamId);

    if (!courseRow) {
      return res.status(404).json({ error: 'Live stream session not found.' });
    }

    const effectiveStreamId = courseRow.stream_id || courseRow.id;
    const room = getOrCreateRoom(effectiveStreamId, courseRow.id);
    room.liveStatus = courseRow.live_status || (courseRow.is_live ? 'LIVE' : 'ENDED');
    room.hostUserId = courseRow.user_id;

    // 1. Host announces active broadcasting readiness
    if (type === 'host-announce') {
      room.hostClientId = fromClientId;
      room.liveStatus = payload?.liveStatus || room.liveStatus;

      // Notify all connected viewers waiting in this room that host is ready
      for (const viewerId of room.viewers) {
        const viewerClient = sseClients.get(viewerId);
        if (viewerClient) {
          sendSse(viewerClient.res, 'webrtc-signal', {
            type: 'host-ready',
            streamId: effectiveStreamId,
            courseId: courseRow.id,
            fromClientId,
            liveStatus: room.liveStatus
          });
        }
      }

      return res.json({
        success: true,
        streamId: effectiveStreamId,
        viewerCount: room.viewers.size,
        viewers: Array.from(room.viewers)
      });
    }

    // 2. Viewer joins the live stream room
    if (type === 'viewer-join') {
      room.viewers.add(fromClientId);
      const clientEntry = sseClients.get(fromClientId);
      if (clientEntry) clientEntry.streamId = effectiveStreamId;

      const hostClient = room.hostClientId ? sseClients.get(room.hostClientId) : null;
      if (hostClient) {
        sendSse(hostClient.res, 'webrtc-signal', {
          type: 'viewer-join',
          streamId: effectiveStreamId,
          courseId: courseRow.id,
          fromClientId,
          viewerCount: room.viewers.size
        });
      }

      return res.json({
        success: true,
        streamId: effectiveStreamId,
        courseId: courseRow.id,
        liveStatus: room.liveStatus,
        hostConnected: Boolean(hostClient),
        hostClientId: room.hostClientId,
        viewerCount: room.viewers.size
      });
    }

    // 3. Viewer leaves room cleanly
    if (type === 'viewer-leave') {
      room.viewers.delete(fromClientId);
      const hostClient = room.hostClientId ? sseClients.get(room.hostClientId) : null;
      if (hostClient) {
        sendSse(hostClient.res, 'webrtc-signal', {
          type: 'viewer-leave',
          streamId: effectiveStreamId,
          fromClientId,
          viewerCount: room.viewers.size
        });
      }
      return res.json({ success: true });
    }

    // 4. Direct peer-to-peer WebRTC signaling (offer, answer, ice-candidate)
    if (targetClientId) {
      const target = sseClients.get(targetClientId);
      if (target) {
        sendSse(target.res, 'webrtc-signal', {
          type,
          streamId: effectiveStreamId,
          courseId: courseRow.id,
          fromClientId,
          payload
        });
        return res.json({ success: true, delivered: true });
      }
      return res.json({ success: true, delivered: false });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Live signal error:', err);
    return res.status(500).json({ error: 'Failed to route live signal.' });
  }
}

/**
 * Update room status when server updates course live_status
 */
export function updateRoomLiveStatus(streamId, courseId, liveStatus) {
  const key = streamId || courseId;
  if (!key) return;
  const room = streamRooms.get(key) || streamRooms.get(courseId);
  if (room) {
    room.liveStatus = liveStatus;
  }
}

/**
 * GET /api/config/public
 * Safely returns non-secret Supabase public config so frontend can enable Realtime if configured.
 */
export function handleGetPublicConfig(req, res) {
  const configured = isSupabaseConfigured();
  return res.json({
    success: true,
    supabaseConfigured: configured,
    supabaseUrl: configured ? process.env.SUPABASE_URL : '',
    supabasePublishableKey: configured
      ? (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '')
      : ''
  });
}
