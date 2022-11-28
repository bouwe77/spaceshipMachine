const { createMachine, interpret, assign, } = require("xstate");
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
  'stop',
].includes(direction)

const machine = createMachine({
  predictableActionArguments: true,
  id: "machine",
  initial: 'engine_off',
  context: {},
  states: {
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
        }
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
            CHANGE_SPEED: {
              actions: ['setSpeed', 'maybeLeave']
            },
            CHANGE_DIRECTION: {
              actions: ['setDirection', 'maybeLeave']
            },
            LEAVE: 'travelling'
          }
        },
        travelling: {
          initial: 'inDirection',
          states: {
            inDirection: {
              on: {
                CHANGE_SPEED: {
                  actions: ['setSpeed', 'maybeStop']
                },
                CHANGE_DIRECTION: {
                  actions: ['setDirection', 'maybeStop']
                },
                STOP: '#idle'
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
    maybeLeave: (ctx, e) => {
      if (ctx.speed > 0 && ctx.direction != null) send('LEAVE')
    },
    maybeStop: (ctx, e) => {
      if (ctx.speed === 0 || ctx.direction == null) send('STOP')
    },
  },
  guards: {
    isTravelling: (ctx) => (ctx.speed > 0 && ctx.direction != null)
  }
})

const service = interpret(machine.withContext({
  speed: 0,
  direction: 'right'
})).start()

const nextState = service.send('TURN_ON')

// await waitFor(service, (state) => state.done)

const spaceship = {
  ...nextState.context,
  internalState: JSON.stringify(nextState.value)
}

console.log(spaceship)

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



