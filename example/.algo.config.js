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
  txns: {
    create: [
      {
        type: 'ApplicationCreate',
        name: 'exampleApp', // this field is only used by algo-cli for saving appIDs
        onComplete: 'NoOp',
        from: 0, // the 1st account in kmd
        schema: {
          global: {
            ints: 0,
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
        // note: "this is a txn note",
        // extraPages: 0,
        // lease: undefined,
        // rekeyTo: undefined,
      }
    ],
    call: [
      {
        type: 'ApplicationCall',
        onCompletion: 'NoOp',
        from: 0,
        appID: 'exampleApp', // get exampleApp ID from .algo.data.json
        // appArgs: [],
        // accounts: [],
        // apps: [],
        // assets: [],
        // note: "",
        // lease: null,
        // rekeyTo: null
      }
    ]
  }
}