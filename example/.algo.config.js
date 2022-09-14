// since this is js, you can use variables
const server = "http://localhost"
const token = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

module.exports = {
  deploy: {
    server: 'http://node.testnet.algoexplorerapi.io/',
    token: '',
    port: 80
  },
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
      initialBalance: 10_000_000,
      deploy: '5GDINVI7PQTTEO7NQTBZPY6T6FJENXAIE576PTTTN7MXXYTLTWBDBZ3FUM'
    },
    bob: {
      initialBalance: 10_000_000
    }
  },
  txns: {
    create: [
      {
        type: 'ApplicationCreate',
        name: 'exampleApp', // this field is only used by algo-cli for saving appIDs
        onComplete: 'NoOp',
        from: 'alice', // the 1st account in kmd
        schema: {
          global: {
            ints: 1,
            bytes: 2
          },
          local: {
            ints: 0,
            bytes: 0
          }
        },
        teal: {
          compileCmd: "python3 contract.py", // run this command before creating app
          approval: "./approval.teal",
          clear: "./clear.teal"
        },
        // args: [ 'hello world', 1337 ],
        // accounts: [ 1 ], // the 2nd account in kmd
        // apps: [ 'anotherApp' ], // get anotherApp ID from .algo.data.json
        // assets: [ 1337 ],
        note: "this iss a txn note",
        // extraPages: 0,
        // lease: undefined,
        // rekeyTo: undefined,
      }
    ],
    call: [
      {
        type: 'ApplicationCall',
        onCompletion: 'NoOp',
        from: 'bob',
        appID: 'exampleApp', // get exampleApp ID from .algo.data.json
        name: 'exampleAppCall'
        // appArgs: [],
        // accounts: [],
        // apps: [],
        // assets: [],
        // note: "",
        // lease: null,
        // rekeyTo: null
      },
      {
        type: 'Payment',
        from: 'bob',
        amount: 100_000,
        to: 'exampleApp',
        name: 'examplePayment'
        // appArgs: [],
        // accounts: [],
        // apps: [],
        // assets: [],
        // note: "",
        // lease: null,
        // rekeyTo: null
      },
    ]
  }
}