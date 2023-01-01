const { createMachine, interpret, assign, actions } = require("xstate");
// const { waitFor } = require("xstate/lib/waitFor")

const { choose } = actions

const localData = {
  getLocation: () => null,
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
  //TODO getDestinationInfo overnemen
  getDestinationInfo: (x, y) => ({
    destinationName: 'Planet ' + x + ',' + y,
    destinationKind: 'kind',
    destinationColor: 'color'
  }),
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
    const updated = {...spaceship }
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
        SET_COURSE: {
          actions: [
            'clearDirection',
            'clearLocation',
            'setSpeed',
            'setDestination',
          ],
          cond: 'isValidCourse',
          target: '#toDestination', //TODO alleen naar toDestination indien isTravellingToDestination
        },
        CHANGE_DIRECTION: [{
          actions: ['clearDestination', 'setDirection'],
          cond: 'isTravellingInDirection',
          target: '#inDirection',
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
              target: '#idle'
            }
          ],
        },
        idle: {
          id: "idle",
          //type: "final",
          on: {
            CHANGE_SPEED: [{
              actions: 'setSpeed',
              target: '#inDirection',
              cond: 'isTravellingInDirection'
            }, {
              actions: 'setSpeed',
              target: '#toDestination',
              cond: 'isTravellingToDestination'
            }, {
              actions: 'setSpeed',
            }],
          }
        },
        travelling: {
          on: {
            STOP: {
              actions: 'stop',
              target: '#idle',
            },
            CHANGE_SPEED: {
              actions: 'setSpeed',
            },
          },
          states: {
            inDirection: {
              id: "inDirection",
              on: {
                GO_TO_NEXT_POSITION: {
                  actions: [
                    'determineNewPositionTowardsDirection',
                    'calculateTotalDistanceTravelled',
                    'setLocation'
                  ],
                },
              }
            },
            toDestination: {
              id: "toDestination",
              on: {
                GO_TO_NEXT_POSITION: {
                  actions: [
                    'determineNewPositionTowardsDestination',
                    'calculateTotalDistanceTravelled',
                    'setLocation',
                    choose([{
                      cond: 'hasArrived',
                      actions: 'stop'
                    }, {
                      actions: 'updateDistanceToDestination'
                    }])
                  ],
                },
              }
            }
          }
        }
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
    stop: assign({
      speed: () => 0,
      distanceToDestination: () => 0,
    }),
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
    clearLocation: assign({ location: null }),
    setLocation: assign({ location: (ctx) => positioning.getLocation(ctx) }),
    updateDistanceToDestination: assign({
      distanceToDestination: (ctx) => positioning.getDistanceToDestination(ctx)
    })
  },
  guards: {
    isEngineOn: (ctx) => ctx.status?.startsWith('engine_on:'),

    // The current context and/or event data indicates the speceship was (or now is) travelling in a direction
    isTravellingInDirection: (ctx, e) => (
      (e.data?.speed > 0 && Boolean(ctx.direction))
      || (ctx.speed > 0 && Boolean(e.data?.direction))
      || (ctx.speed > 0 && Boolean(ctx.direction))),

    // The current context and/or event data indicates the speceship was (or now is) travelling to a destination
    isTravellingToDestination: (ctx, e) => (
      (e.data?.speed > 0 && !isNaN(ctx.destinationX))
      || (ctx.speed > 0 && !isNaN(e.data?.destinationX))
      || (ctx.speed > 0 && !isNaN(ctx.destinationX))),

    // The spaceship had speed, but the event indicates the speed will become 0 now
    isStopping: (_, e) => (ctx.speed > 0 && e.data.speed === 0),

    hasDirection: (ctx) => Boolean(ctx.direction),

    hasArrived: (ctx) => positioning.isOnDestination(ctx),

    isValidCourse: (_, e) => isValidCourse(e.data),
  }
})

const updateSpaceship = (spaceship, event, data) => {
  const service = interpret(machine.withContext(spaceship)).start()

  const nextState = data
    ? service.send({ type: event, data: { ...data } })
    : service.send(event)

  // await waitFor(service, (state) => state.done)

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
const initial = {
  speed: 1,
  direction: 'right',
  positionX: 0,
  positionY: 0,
  totalDistanceTravelled: 0,
  location: null
}

let updated = updateSpaceship(initial, 'TURN_ON')

updated = updateSpaceship(updated, 'CHANGE_SPEED', { speed: 10 })

updated = updateSpaceship(updated, 'SET_COURSE', {
  destination: {
    x: 102,
    y: 321
  },
  speed: 12
})

// updated = updateSpaceship(updated, 'CHANGE_SPEED', { speed: 77 })

updated = updateSpaceship(updated, 'GO_TO_NEXT_POSITION')
updated = updateSpaceship(updated, 'GO_TO_NEXT_POSITION')
updated = updateSpaceship(updated, 'GO_TO_NEXT_POSITION')

updated = updateSpaceship(updated, 'CHANGE_DIRECTION', { direction: 'left' })


updated = updateSpaceship(updated, 'GO_TO_NEXT_POSITION')
updated = updateSpaceship(updated, 'GO_TO_NEXT_POSITION')
updated = updateSpaceship(updated, 'GO_TO_NEXT_POSITION')

// TO DO Volgorde:
// Als de state inDirection en toDestination goed werkt: GO_TO_NEXT_POSITION + arriveren implementeren...


