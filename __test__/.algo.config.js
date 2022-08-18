// since this is js, you can use variables
const server = "http://localhost"
const token = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

module.exports = {
  algod: {
    server,
    token,
    port: 4001
  },
  kmd: {
    server,
    token,
    port: 4002,
    wallet: "unencrypted-default-wallet",
    password: ""
  },
  accounts: {
    alice: {
      initialBalance: 10_000_000
    },
    bob: {
      initialBalance: 10_000_000
    }
  },
  txns: {
    createApp: [
      {
        type: 'ApplicationCreate',
        name: 'createAppTest',
        onComplete: 'OptIn',
        from: 'alice',
        schema: {
          global: {
            ints: 1,
            bytes: 0
          },
          local: {
            ints: 1,
            bytes: 0
          }
        },
        teal: {
          compileCmd: "python3 contract.py", // run this command before creating app
          approval: "./approval.teal",
          clear: "./clear.teal"
        }
      }
    ],
    payment: [
      {
        name: 'paymentTest',
        type: 'Payment',
        from: 'alice',
        to: 'bob',
        amount: 100_000
      }
    ]
  }
}