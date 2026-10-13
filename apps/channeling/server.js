const http = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const port = parseInt(process.env.PORT || '3000', 10)
const dev = process.env.NODE_ENV !== 'production'
// turbo: true enables Turbopack in dev for faster incremental compilation (Next.js 15+); dev-only
const app = next({ dev, turbo: dev })
const handle = app.getRequestHandler()

/**
 * With more than one web dyno, an emit from one dyno only reaches sockets connected to that dyno.
 * The Redis adapter relays emits to every dyno. Without REDIS_URL (local dev, single dyno) the
 * default in-memory adapter is used. A Redis failure must never stop the web server from starting.
 */
async function attachRedisAdapter(io) {
  const url = process.env.REDIS_URL
  if (!url) {
    console.log('[socket] REDIS_URL not set; using in-memory adapter (single instance only)')
    return
  }
  const { createClient } = require('redis')
  const { createAdapter } = require('@socket.io/redis-adapter')
  // Heroku Redis uses self-signed certs on rediss:// URLs
  const pubClient = createClient({
    url,
    socket: url.startsWith('rediss://') ? { tls: true, rejectUnauthorized: false } : undefined,
  })
  const subClient = pubClient.duplicate()
  for (const [name, client] of [['pub', pubClient], ['sub', subClient]]) {
    client.on('error', (err) => console.error(`[socket] redis ${name} error:`, err.message))
  }
  let timer
  try {
    // Heroku kills a dyno that hasn't bound $PORT within 60s, so don't wait on Redis forever
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('connect timed out after 10s')), 10000)
    })
    await Promise.race([Promise.all([pubClient.connect(), subClient.connect()]), timeout])
    io.adapter(createAdapter(pubClient, subClient))
    console.log('[socket] Redis adapter attached')
  } catch (err) {
    console.error('[socket] Redis adapter failed; falling back to in-memory adapter:', err.message)
    for (const client of [pubClient, subClient]) {
      try {
        client.destroy()
      } catch {
        // already closed
      }
    }
  } finally {
    clearTimeout(timer)
  }
}

app.prepare().then(async () => {
  const server = http.createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(server, {
    path: '/socket.io',
    addTrailingSlash: false,
  })
  await attachRedisAdapter(io)

  const CHANNEL_BOOKING_PREFIX = 'channel-booking:'
  const CHANNEL_ROOM_PREFIX = 'channel-room:'
  const FLOAT_REQUEST_PREFIX = 'float-request:'
  const FLOAT_BALANCE_PREFIX = 'float-balance:'
  const SHIFT_PREFIX = 'shift:'
  const NOTIFICATION_PREFIX = 'notification:'

  io.on('connection', (socket) => {
    // Leave any previous channel-booking room so each socket is in at most one (no accumulation)
    function leaveOtherChannelBookingRooms(exceptRoom) {
      const rooms = Array.from(socket.rooms)
      for (const r of rooms) {
        if (r.startsWith(CHANNEL_BOOKING_PREFIX) && r !== exceptRoom) {
          socket.leave(r)
        }
      }
    }

    function leaveChannelRoomRoomsExcept(socket, exceptRooms) {
      const rooms = Array.from(socket.rooms)
      for (const r of rooms) {
        if (r.startsWith(CHANNEL_ROOM_PREFIX) && !exceptRooms.has(r)) {
          socket.leave(r)
        }
      }
    }

    socket.on('channel-booking:subscribe', (payload) => {
      const { doctorId } = payload || {}
      if (doctorId) {
        const room = `${CHANNEL_BOOKING_PREFIX}${doctorId}`
        leaveOtherChannelBookingRooms(room)
        socket.join(room)
        if (process.env.NODE_ENV !== 'production') {
          console.log('[socket] channel-booking:subscribe', { room, socketId: socket.id })
        }
      }
    })

    socket.on('channel-booking:unsubscribe', (payload) => {
      const { doctorId } = payload || {}
      if (doctorId) {
        const room = `${CHANNEL_BOOKING_PREFIX}${doctorId}`
        socket.leave(room)
      }
    })

    socket.on('channel-room:subscribe', (payload) => {
      const { locationIds = [], institutionIds = [] } = payload || {}
      const joinSet = new Set()
      for (const id of locationIds) {
        if (id && String(id).trim()) {
          joinSet.add(`${CHANNEL_ROOM_PREFIX}location:${String(id).trim()}`)
        }
      }
      for (const raw of institutionIds) {
        const n = Number(raw)
        if (Number.isFinite(n)) {
          joinSet.add(`${CHANNEL_ROOM_PREFIX}institution:${n}`)
        }
      }
      leaveChannelRoomRoomsExcept(socket, joinSet)
      for (const room of joinSet) {
        socket.join(room)
      }
      if (process.env.NODE_ENV !== 'production') {
        console.log('[socket] channel-room:subscribe', { rooms: [...joinSet], socketId: socket.id })
      }
    })

    socket.on('channel-room:unsubscribe', () => {
      const rooms = Array.from(socket.rooms)
      for (const r of rooms) {
        if (r.startsWith(CHANNEL_ROOM_PREFIX)) {
          socket.leave(r)
        }
      }
    })

    socket.on('float-request:subscribe', (payload) => {
      const { userId } = payload || {}
      if (userId) {
        const room = `${FLOAT_REQUEST_PREFIX}${userId}`
        socket.join(room)
        if (process.env.NODE_ENV !== 'production') {
          console.log('[socket] float-request:subscribe', { room, socketId: socket.id })
        }
      }
    })

    socket.on('float-request:unsubscribe', (payload) => {
      const { userId } = payload || {}
      if (userId) {
        const room = `${FLOAT_REQUEST_PREFIX}${userId}`
        socket.leave(room)
      }
    })

    socket.on('float-balance:subscribe', (payload) => {
      const { userId } = payload || {}
      if (userId) {
        const room = `${FLOAT_BALANCE_PREFIX}${userId}`
        socket.join(room)
        if (process.env.NODE_ENV !== 'production') {
          console.log('[socket] float-balance:subscribe', { room, socketId: socket.id })
        }
      }
    })

    socket.on('float-balance:unsubscribe', (payload) => {
      const { userId } = payload || {}
      if (userId) {
        const room = `${FLOAT_BALANCE_PREFIX}${userId}`
        socket.leave(room)
      }
    })

    socket.on('shift:subscribe', (payload) => {
      const { userId } = payload || {}
      if (userId) {
        const room = `${SHIFT_PREFIX}${userId}`
        socket.join(room)
        if (process.env.NODE_ENV !== 'production') {
          console.log('[socket] shift:subscribe', { room, socketId: socket.id })
        }
      }
    })

    socket.on('shift:unsubscribe', (payload) => {
      const { userId } = payload || {}
      if (userId) {
        const room = `${SHIFT_PREFIX}${userId}`
        socket.leave(room)
      }
    })

    socket.on('notification:subscribe', (payload) => {
      const { userId } = payload || {}
      if (userId) {
        const room = `${NOTIFICATION_PREFIX}${userId}`
        socket.join(room)
        if (process.env.NODE_ENV !== 'production') {
          console.log('[socket] notification:subscribe', { room, socketId: socket.id })
        }
      }
    })

    socket.on('notification:unsubscribe', (payload) => {
      const { userId } = payload || {}
      if (userId) {
        const room = `${NOTIFICATION_PREFIX}${userId}`
        socket.leave(room)
      }
    })
  })

  // Expose io so server actions / API routes can emit (e.g. save-booking)
  server.io = io
  global.__SOCKET_IO__ = io

  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://localhost:${port} (Next.js + Socket.io)`)
  })
})
