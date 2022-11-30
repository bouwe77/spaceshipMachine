const { createMachine, interpret, assign, send } = require("xstate");
// const { waitFor } = require("xstate/lib/waitFor")

const positioning = {
  determineNewPositionTowardsDirection: (spaceship) => ({
    positionX: spaceship.positionX + spaceship.speed,
    positionY: spaceship.positionY + spaceship.speed,
  }),
  getDistanceToDestination: () => 10
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
      },
      states: {
        init: {
          always: [
            {
              target: 'travelling',
              cond: 'isTravelling'
            },
            {
              target: 'idle'
            }
          ],
        },
        idle: {
          id: "idle",
          type: "final",
          on: {
            CHANGE_SPEED: [{
              actions: 'setSpeed',
              target: 'travelling',
              cond: 'isLeaving'
            }, {
              actions: 'setSpeed',
            }],
            CHANGE_DIRECTION: {
              actions: 'setDirection',
            },
          }
        },
        travelling: {
          initial: 'init',
          on: {
            STOP: {
              actions: 'stop',
              target: '#idle',
            }
          },
          states: {
            init: {
              always: [
                {
                  target: 'inDirection',
                  cond: 'hasDirection'
                },
                'toDestination'
              ]
            },
            inDirection: {},
            toDestination: {
              on: {
                GO_TO_NEXT_POSITION: {
                  actions: [
                    'determineNewPosition',
                    'calculateTotalDistanceTravelled',
                    //'setLocation'
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
    stop: assign({ speed: () => 0 }),
    determineNewPosition: assign((ctx) => ({
      ...ctx, ...positioning.determineNewPositionTowardsDirection(ctx)
    })),
    calculateTotalDistanceTravelled: assign((ctx) => ({
      ...ctx,
      totalDistanceTravelled: ctx.totalDistanceTravelled + ctx.speed,
    })),
    //TODO setDistanceToDestination gebruik ik nog niet
    setDistanceToDestination: assign({
      distanceToDestination: (ctx) => positioning.getDistanceToDestination(ctx)
    }),
  },
  guards: {
    isEngineOn: (ctx) => ctx.status?.startsWith('engine_on:'),
    isTravelling: (ctx) => ctx.speed > 0 && Boolean(ctx.direction),
    isLeaving: (ctx, e) => (e.data.speed > 0 && Boolean(ctx.direction))
      || (ctx.speed > 0 && Boolean(e.data.direction)),
    isStopping: (_, e) => e.data.speed === 0,
    //TODO hasArrived gebruik ik nog niet
    //TODO Als je arriveert dan moet speed naar 0
    hasArrived: (ctx) => positioning.isOnDestination(ctx)
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
  totalDistanceTravelled: 0
}

let updated = updateSpaceship(initial, 'TURN_ON')

// updated = updateSpaceship(updated, 'CHANGE_SPEED', { speed: 10 })

updated = updateSpaceship(updated, 'GO_TO_NEXT_POSITION')
updated = updateSpaceship(updated, 'GO_TO_NEXT_POSITION')
updated = updateSpaceship(updated, 'GO_TO_NEXT_POSITION')

// TO DO Volgorde:
// - SET_COURSE
// - direction string en destination coordinate in zelfde context value, om conflicten te voorkomen?
// Als de state inDirection en toDestination goed werkt: GO_TO_NEXT_POSITION + arriveren implementeren...

// updated = updateSpaceship(updated, 'CHANGE_SPEED', { speed: 1 })

// updated = updateSpaceship(updated, 'GO_TO_NEXT_POSITION')


// updated = updateSpaceship(updated, 'CHANGE_DIRECTION', { direction: 'left' })

// updated = updateSpaceship(updated, 'STOP')

// updated = updateSpaceship(updated, 'TURN_OFF')

// updated = updateSpaceship(updated, 'TURN_ON')


