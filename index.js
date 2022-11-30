const { createMachine, interpret, assign, send } = require("xstate");
const { waitFor } = require("xstate/lib/waitFor")

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
            CHANGE_DIRECTION: [{
              actions: 'setDirection',
              target: 'travelling',
              cond: 'isLeaving'
            }, {
              actions: 'setDirection',
            }],
          }
        },
        travelling: {
          initial: 'inDirection',
          on: {
            STOP: {
              actions: 'stop',
              target: '#idle',
            }
          },
          states: {
            inDirection: {
              on: {
                CHANGE_SPEED: [{
                  actions: 'setSpeed',
                  target: '#idle',
                  cond: 'isStopping'
                }, {
                  actions: 'setSpeed',
                }],
                CHANGE_DIRECTION: [{
                  actions: 'setDirection',
                  target: '#idle',
                  cond: 'isStopping'
                }, {
                  actions: 'setDirection',
                }],
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
  },
  guards: {
    isEngineOn: (ctx) => ctx.status?.startsWith('engine_on:'),
    isTravelling: (ctx) => ctx.speed > 0 && Boolean(ctx.direction),
    isLeaving: (ctx, e) => (e.data.speed > 0 && Boolean(ctx.direction))
      || (ctx.speed > 0 && Boolean(e.data.direction)),
    isStopping: (ctx, e) => e.data.speed === 0,
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
  speed: 0,
  direction: 'right'
}

let updated = updateSpaceship(initial, 'TURN_ON')

updated = updateSpaceship(updated, 'CHANGE_SPEED', { speed: 77 })

updated = updateSpaceship(updated, 'CHANGE_DIRECTION', { direction: 'left' })

updated = updateSpaceship(updated, 'STOP')


// updated = updateSpaceship(updated, 'TURN_OFF')
// updated = updateSpaceship(updated, 'TURN_ON')


//.onTransition((state) => console.log({transition:state.value}))

// console.log(JSON.stringify(service.initialState.value))
// console.log(JSON.stringify(service.initialState.context))
// console.log('---')

// const send = (type, data) => {
//   const nextState = service.send({ type, data: { ...data } })
//   console.log(JSON.stringify(nextState.value))
//   console.log(JSON.stringify(nextState.context))
//   console.log('---')
// }

// send('TURN_ON')

// send('CHANGE_SPEED', { speed: 77 })

// send('CHANGE_DIRECTION', { direction: 'left' })

// send('TURN_OFF')

// send('TURN_ON')

// send('CHANGE_SPEED', { speed: 1 })

// send('CHANGE_SPEED', { speed: 0 })



