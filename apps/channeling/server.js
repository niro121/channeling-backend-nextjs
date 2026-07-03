const http = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const port = parseInt(process.env.PORT || '3000', 10)
const dev = process.env.NODE_ENV !== 'production'
// turbo: true enables Turbopack in dev for faster incremental compilation (Next.js 15+)
const app = next({ dev, turbo: true })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(server, {
    path: '/socket.io',
    addTrailingSlash: false,
  })

  const CHANNEL_BOOKING_PREFIX = 'channel-booking:'
  const CHANNEL_ROOM_PREFIX = 'channel-room:'
  const FLOAT_REQUEST_PREFIX = 'float-request:'
  const FLOAT_BALANCE_PREFIX = 'float-balance:'
  const SHIFT_PREFIX = 'shift:'

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
  })

  // Expose io so server actions / API routes can emit (e.g. save-booking)
  server.io = io
  global.__SOCKET_IO__ = io

  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://localhost:${port} (Next.js + Socket.io)`)
  })
})
