import { createMachine, interpret, assign, actions, State } from "xstate"

const { choose } = actions

// Stub implementation for localData
const localData = {
  getLocation: (x, y) => null,
  getSpaceObject: (spaceObjectName) => null,
}

const getRandomPosition = () => ({ x: 100, y: 100 })

const colors = {
  getColor: () => 'blue'
}

const determineNewPositionCoordinates = (
  positionX,
  positionY,
  speed,
  destinationX,
  destinationY,
) => {
  let newPositionX = positionX
  let newPositionY = positionY

  if (positionX < destinationX) {
    if (speed > destinationX - positionX) speed = destinationX - positionX
    newPositionX += speed
  }
  if (positionX > destinationX) {
    if (speed > positionX - destinationX) speed = positionX - destinationX
    newPositionX -= speed
  }

  if (positionY < destinationY) {
    if (speed > destinationY - positionY) speed = destinationY - positionY
    newPositionY += speed
  }
  if (positionY > destinationY) {
    if (speed > positionY - destinationY) speed = positionY - destinationY
    newPositionY -= speed
  }

  return { positionX: newPositionX, positionY: newPositionY }
}

const positioning = {
  determineNewPositionTowardsDirection: (spaceship) => {
    const destination = {
      x: spaceship.positionX,
      y: spaceship.positionY,
    }

    switch (spaceship.direction) {
      case 'up':
        destination.y -= spaceship.speed
        break
      case 'down':
        destination.y += spaceship.speed
        break
      case 'left':
        destination.x -= spaceship.speed
        break
      case 'right':
        destination.x += spaceship.speed
        break
      case 'upleft':
        destination.x -= spaceship.speed
        destination.y -= spaceship.speed
        break
      case 'upright':
        destination.x += spaceship.speed
        destination.y -= spaceship.speed
        break
      case 'downleft':
        destination.x -= spaceship.speed
        destination.y += spaceship.speed
        break
      case 'downright':
        destination.x += spaceship.speed
        destination.y += spaceship.speed
        break
    }

    const newPosition = determineNewPositionCoordinates(
      spaceship.positionX,
      spaceship.positionY,
      spaceship.speed,
      destination.x,
      destination.y,
    )

    return newPosition
  },
  determineNewPositionTowardsDestination: (spaceship) => {
    if (spaceship.speed === 0)
      return { positionX: spaceship.positionX, positionY: spaceship.positionY }

    const newPosition = determineNewPositionCoordinates(
      spaceship.positionX,
      spaceship.positionY,
      spaceship.speed,
      spaceship.destinationX,
      spaceship.destinationY,
    )

    return newPosition
  },
  getDistanceToDestination: (spaceship) => {
    // Determine the difference between the position and destination X coordinate.
    let xDiff = 0
    if (spaceship.destinationX > spaceship.positionX)
      xDiff = spaceship.destinationX - spaceship.positionX
    else xDiff = spaceship.positionX - spaceship.destinationX

    // Determine the difference between the position and destination Y coordinate.
    let yDiff = 0
    if (spaceship.destinationY > spaceship.positionY)
      yDiff = spaceship.destinationY - spaceship.positionY
    else yDiff = spaceship.positionY - spaceship.destinationY

    // The greatest of these two differences is the distance to the destination.
    return xDiff > yDiff ? xDiff : yDiff
  },
  //TODO add localData param as first argument once ported to the real code...
  getDestinationInfo: (x, y) => {
    // Kinds of destinations:
    // - "planet" = Landing on a planet surface coord
    // - "spacestation = landing on a spacestation surface coord
    // - "orbit" = flying in orbit around a planet
    // - "" or "space" = Just somewhere in space...

    const spaceObjectName = localData.getLocation(x, y)
    if (!spaceObjectName) return { destinationKind: 'space' }

    const spaceObject = localData.getSpaceObject(spaceObjectName)
    if (!spaceObject) return { destinationKind: 'space' }

    return {
      destinationName: spaceObject.name,
      destinationKind: spaceObject.kind,
      destinationColor: spaceObject.color,
    }
  },
  clearDestinationInfo: (spaceship) => {
    const updated = { ...spaceship }
    updated.destinationName = null
    updated.destinationKind = null
    updated.destinationColor = null
    return updated
  },
  clearDestination: (spaceship) => {
    const updated = { ...spaceship }
    updated.destinationX = null
    updated.destinationY = null
    updated.distanceToDestination = null
    updated.destinationName = null
    updated.destinationKind = null
    updated.destinationColor = null
    return updated
  },
  clearDirection: (spaceship) => {
    const updated = { ...spaceship }
    updated.direction = null
    return updated
  },
  getLocation: (spaceship) => {
    return localData.getLocation(
      spaceship.positionX,
      spaceship.positionY,
    )
  },
  isOnDestination: (spaceship) =>
    spaceship.positionX === spaceship.destinationX &&
    spaceship.positionY === spaceship.destinationY
}

const isValidSpeed = (speed) => speed >= 0 && speed <= 100

const isValidDirection = (direction) => [
  'up',
  'down',
  'left',
  'right',
  'upleft',
  'upright',
  'downleft',
  'downright',
].includes(direction)

const isValidCoordinate = (coordinate) => !isNaN(coordinate?.x) && !isNaN(coordinate?.y)

const isValidCourse = (course) => {
  if (typeof course.speed === 'undefined' && typeof course.destination === 'undefined') return false

  if (typeof course.speed !== 'undefined') {
    const valid = isValidSpeed(course.speed)
    if (!valid) return false
  }

  if (typeof course.destination !== 'undefined') {
    const valid = isValidCoordinate(course.destination)
    if (!valid) return false
  }

  return true
}

const spaceshipMachine = createMachine({
  predictableActionArguments: true,
  id: "machine",
  initial: 'engine_off',
  context: {},
  // on: {
  //   INIT_CREATED_SPACESHIP: {
  //     target: 'engine_off'
  //   }
  // },
  states: {
    engine_off: {
      on: {
        TURN_ON: {
          target: 'engine_on'
        }
      }
    },
    engine_on: {
      initial: 'idle',
      on: {
        TURN_OFF: {
          actions: 'stop',
          target: 'engine_off'
        },
        SET_COURSE: {
          actions: [
            'clearDirection',
            'clearDestinationInfo',
            'setSpeed',
            'setDestination',
          ],
          target: '#toDestination',
        },
        CHANGE_DIRECTION: {
          actions: ['clearDestination', 'setDirection'],
          target: '#inDirection',
        },
      },
      states: {
        idle: {
          on: {
            CHANGE_SPEED: {
              actions: 'setSpeed',
            },
          }
        },
        travelling: {
          states: {
            inDirection: {
              id: "inDirection",
              initial: 'checkSpeed',
              on: {
                GO_TO_NEXT_POSITION: {
                  actions: [
                    'determineNewPositionTowardsDirection',
                    'calculateTotalDistanceTravelled',
                    'setLocation'
                  ],
                },
                CHANGE_SPEED: {
                  actions: 'setSpeed',
                  target: '#checkSpeed',
                },
                STOP: {
                  actions: 'stop',
                  target: '#checkSpeed',
                },
              },
              states: {
                checkSpeed: {
                  id: "checkSpeed",
                  always: [
                    {
                      target: 'going',
                      cond: 'hasSpeed'
                    }, {
                      target: 'idle'
                    }]
                },
                idle: {},
                going: {}
              },
            },
            toDestination: {
              id: "toDestination",
              initial: 'checkSpeed',
              on: {
                GO_TO_NEXT_POSITION: {
                  actions: [
                    'determineNewPositionTowardsDestination',
                    'calculateTotalDistanceTravelled',
                    'setLocation',
                    'updateDistanceToDestination',
                  ],
                  target: '#checkArrived',
                },
                CHANGE_SPEED: {
                  actions: 'setSpeed',
                  target: '#checkSpeed',
                },
                STOP: {
                  actions: 'stop',
                  target: '#checkSpeed',
                },
              },
              states: {
                checkSpeed: {
                  id: "checkSpeed",
                  always: [
                    {
                      target: 'going',
                      cond: 'hasSpeed'
                    }, {
                      target: 'idle'
                    }]
                },
                idle: {},
                going: {}
              },
            },
            checkArrived: {
              id: 'checkArrived',
              always: [{
                target: '#landed',
                actions: ['stop', 'clearDestination'],
                cond: 'hasLanded',
              }, {
                target: '#arrived',
                actions: ['stop', 'clearDestination'],
                cond: 'hasArrived',
              }, {
                target: '#toDestination'
              }]
            },
          }
        },
        landed: {
          id: 'landed',
        },
        arrived: {
          id: 'arrived',
        },
      }
    }
  }
}, {
  actions: {
    setSpeed: assign({
      speed: (ctx, e) => isValidSpeed(e.data.speed)
        ? e.data.speed
        : ctx.speed
    }),
    setDirection: assign({
      direction: (ctx, e) => isValidDirection(e.data.direction)
        ? e.data.direction
        : ctx.direction
    }),
    setDestination: assign((ctx, e) => {
      if (!isValidCoordinate(e.data.destination)) return ctx
      const dest = {
        destinationX: Number(e.data.destination.x),
        destinationY: Number(e.data.destination.y),
      }
      return {
        ...ctx,
        ...dest,
        ...positioning.getDestinationInfo(dest.destinationX, dest.destinationY),
      }
    }),
    clearDestination: assign((ctx) => ({
      ...ctx, ...positioning.clearDestination(ctx)
    })),
    clearDirection: assign((ctx) => ({
      ...ctx, ...positioning.clearDirection(ctx)
    })),
    clearDestinationInfo: assign((ctx) => ({
      ...ctx, ...positioning.clearDestinationInfo(ctx)
    })),
    stop: assign({ speed: () => 0 }),
    determineNewPositionTowardsDirection: assign((ctx) => ({
      ...ctx, ...positioning.determineNewPositionTowardsDirection(ctx)
    })),
    determineNewPositionTowardsDestination: assign((ctx) => ({
      ...ctx, ...positioning.determineNewPositionTowardsDestination(ctx)
    })),
    calculateTotalDistanceTravelled: assign((ctx) => ({
      ...ctx,
      totalDistanceTravelled: ctx.totalDistanceTravelled + ctx.speed,
    })),
    setLocation: assign({ location: (ctx) => positioning.getLocation(ctx) }),
    updateDistanceToDestination: assign({
      distanceToDestination: (ctx) => positioning.getDistanceToDestination(ctx)
    })
  },
  guards: {
    isEngineOn: (ctx) => ctx.status?.startsWith('engine_on:'),

    hasSpeed: (ctx) => ctx.speed > 0,

    hasDirection: (ctx) => Boolean(ctx.direction),

    //TODO hasLanded should check position is surface coord
    hasLanded: (ctx) => positioning.isOnDestination(ctx),

    //TODO hasArrived should check position === destination, and position is NOT surface coord
    hasArrived: (ctx) => false,

    isValidCourse: (_, e) => isValidCourse(e.data),
  }
})

const logSpaceship = spaceship => {
  console.log({
    speed: spaceship.speed,
    positionX: spaceship.positionX,
    positionY: spaceship.positionY,
    // status: getStatus(nextState.value) 
  })
}

const getStatus = (state) => {
  return JSON.stringify(state)
    .replaceAll('{', '')
    .replaceAll('}', '')
    .replaceAll('"', '')
    .toLowerCase()
}

const updateSpaceship = (spaceship, event, data) => {
  const restoredState = State.create(JSON.parse(spaceship))
  const service = interpret(spaceshipMachine).start(restoredState)

  const nextState = data
    ? service.send({ type: event, data: { ...data } })
    : service.send(event)

  logSpaceship(nextState.context)

  const stuff = JSON.stringify(nextState)

  return stuff
}

const initializeNewSpaceship = (spaceship) => {
  const service = interpret(spaceshipMachine.withContext(spaceship)).start()

  const initialState = service.getSnapshot()

  logSpaceship(initialState.context)

  const stuff = JSON.stringify(initialState)

  return stuff
}


// The initial spaceship is the object that is defined when a spaceship is created, but not yet saved
const location = 'Gulvianus'
const position = getRandomPosition(location)
const initialSpaceship = {
  name: 'Defiant',
  owner: 'Bouwe',
  positionX: position.x,
  positionY: position.y,
  speed: 0,
  destinationX: 0,
  destinationY: 0,
  maxSpeed: 1,
  color: colors.getColor(),
  location,
  distanceToDestination: 0,
  destinationKind: null,
  destinationName: null,
  destinationColor: null,
  totalDistanceTravelled: 0,
  direction: null,
  // status: 'engine_off',
}

let updated = initializeNewSpaceship(initialSpaceship)

updated = updateSpaceship(updated, 'TURN_ON')

updated = updateSpaceship(updated, 'CHANGE_SPEED', { speed: 1 })

// updated = updateSpaceship(updated, 'GO_TO_NEXT_POSITION')

updated = updateSpaceship(updated, 'SET_COURSE', {
  destination: {
    x: 102,
    y: 321
  },
  // speed: 12
})


updated = updateSpaceship(updated, 'GO_TO_NEXT_POSITION')
updated = updateSpaceship(updated, 'GO_TO_NEXT_POSITION')


// updated = updateSpaceship(updated, 'GO_TO_NEXT_POSITION')

// updated = updateSpaceship(updated, 'CHANGE_DIRECTION', { direction: 'left' })
// updated = updateSpaceship(updated, 'CHANGE_SPEED', { speed: 0 })




