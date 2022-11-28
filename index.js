const { createMachine, interpret } = require("xstate");

const machine = createMachine({
  predictableActionArguments: true,
  id: "machine",
  initial: 'turned_off',
  context: {},
  states: {
    turned_off: {
      on: {
        TURN_ON: {
          target: 'turned_on'
        }
      }
    },
    turned_on: {
      initial: 'init',
      on: {
        TURN_OFF: {
          target: 'turned_off'
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
        idle: {},
        travelling: {}
      }
    }
  }
}, {
  guards: {
    isTravelling: (ctx) => (ctx.speed > 0 && ctx.direction != null)
  }
})


const service = interpret(machine.withContext({
  speed: 10,
  direction: 'left'
})
).start()

console.log(JSON.stringify(service.initialState.value))

const nextState = service.send({ type: 'TURN_ON' })

console.log(JSON.stringify(nextState.value))
