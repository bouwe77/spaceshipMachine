import { createMachine, interpret, assign, actions } from "xstate"

const { choose } = actions

// Stub implementation for localData
const localData = {
  getLocation: (x, y) => null,
  getSpaceObject: (spaceObjectName) => null,
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

const machine = createMachine({
  predictableActionArguments: true,
  id: "machine",
  initial: 'init',
  context: {},
  states: {
    init: {
      always: [
        {
          target: 'engine_on',
          cond: 'isEngineOn'
        },
        {
          target: 'engine_off'
        }
      ],
    },
    engine_off: {
      on: {
        TURN_ON: {
          target: 'engine_on'
        }
      }
    },
    engine_on: {
      initial: 'init',
      on: {
        TURN_OFF: {
          actions: 'stop',
          target: 'engine_off'
        },
        SET_COURSE: [{
          actions: [
            'clearDirection',
            'clearDestinationInfo',
            'setSpeed',
            'setDestination',
          ],
          cond: 'isTravellingToDestination',
          target: '#toDestination',
        }, {
          actions: [
            'clearDirection',
            'setSpeed',
            'setDestination',
          ],
        }],
        CHANGE_DIRECTION: [{
          actions: ['clearDestination', 'setDirection'],
          target: '#inDirection',
          cond: 'isTravellingInDirection',
        }, {
          actions: ['clearDestination', 'setDirection']
        }],
      },
      states: {
        init: {
          always: [
            {
              target: '#inDirection',
              cond: 'isTravellingInDirection'
            },
            {
              target: '#toDestination',
              cond: 'isTravellingToDestination'
            },
            {
              target: '#landed',
              cond: 'hasLanded',
            }
          ],
        },
        travelling: {
          states: {
            inDirection: {
              id: "inDirection",
              initial: 'checkSpeed1',
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
                  target: '#checkSpeed1',
                },
                STOP: {
                  actions: 'stop',
                  target: '#checkSpeed1',
                },
              },
              states: {
                checkSpeed1: {
                  //TODO kan ik 2x een checkSpeed state hebben, in zowel toDestination als inDirection?
                  id: "checkSpeed1",
                  always: [
                    {
                      target: 'going1',
                      cond: 'hasSpeed'
                    }, {
                      target: 'idle1'
                    }]
                },
                idle1: {},
                going1: {}
              },
            },
            toDestination: {
              id: "toDestination",
              initial: 'checkSpeed2',
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
                  target: '#checkSpeed1',
                },
                STOP: {
                  actions: 'stop',
                  target: '#checkSpeed1',
                },
              },
              states: {
                checkSpeed2: {
                  //TODO kan ik 2x een checkSpeed state hebben, in zowel toDestination als inDirection?
                  id: "checkSpeed2",
                  always: [
                    {
                      target: 'going2',
                      cond: 'hasSpeed'
                    }, {
                      target: 'idle2'
                    }]
                },
                idle2: {},
                going2: {}
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

    // The current context and/or event data indicates the spaceship was (or now is) travelling in a direction
    isTravellingInDirection: (ctx, e) => (
      (e.data?.speed > 0 && Boolean(ctx.direction))
      || (ctx.speed > 0 && Boolean(e.data?.direction))
      || (ctx.speed > 0 && Boolean(ctx.direction))
    ),

    // The current context and/or event data indicates the spaceship was (or now is) travelling to a destination
    isTravellingToDestination: (ctx, e) => {
      console.log('🚨',ctx,e.data)
 return (     (e.data?.speed > 0 && !isNaN(ctx.destinationX))
      || (ctx.speed > 0 && !isNaN(e.data?.destinationX))
      || (ctx.speed > 0 && !isNaN(ctx.destinationX))
    )},

    // The spaceship had speed, but the event indicates the speed will become 0 now
    isStopping: (ctx, e) => (ctx.speed > 0 && e.data.speed === 0),

    hasSpeed: (ctx) => ctx.speed > 0,

    hasDirection: (ctx) => Boolean(ctx.direction),

    //TODO hasLanded should check position is surface coord
    hasLanded: (ctx) => positioning.isOnDestination(ctx),

    //TODO hasArrived should check position === destination, and position is NOT surface coord
    hasArrived: (ctx) => false,

    isValidCourse: (_, e) => isValidCourse(e.data),
  }
})

const updateSpaceship = (spaceship, event, data) => {
  const service = interpret(machine.withContext(spaceship)).start()

  const nextState = data
    ? service.send({ type: event, data: { ...data } })
    : service.send(event)

  const updatedSpaceship = {
    ...nextState.context,
    status: JSON.stringify(nextState.value)
      .replaceAll('{', '')
      .replaceAll('}', '')
      .replaceAll('"', '')
      .toLowerCase()
  }

  console.log(updatedSpaceship)
  return updatedSpaceship
}


// Turn on the engine
//TODO Bij spaceship creatie alle properties toevoegen en eventueel op null zetten, zodat altijd alle properties er zijn?
//TODO De API en socket filtert dan alle null properties eruit
const initial = {
  speed: 1,
  direction: 'right',
  positionX: 100,
  positionY: 319,
  totalDistanceTravelled: 0,
  location: null
}

let updated = updateSpaceship(initial, 'TURN_ON')

updated = updateSpaceship(updated, 'SET_COURSE', {
  destination: {
    x: 102,
    y: 321
  },
   speed: 12
})


updated = updateSpaceship(updated, 'GO_TO_NEXT_POSITION')
updated = updateSpaceship(updated, 'GO_TO_NEXT_POSITION')


// updated = updateSpaceship(updated, 'GO_TO_NEXT_POSITION')

updated = updateSpaceship(updated, 'CHANGE_DIRECTION', { direction: 'left' })
updated = updateSpaceship(updated, 'CHANGE_SPEED', { speed: 0 })




