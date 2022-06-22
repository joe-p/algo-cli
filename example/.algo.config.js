// since this is js, you can use variables
const server = "http://localhost"
const token = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

module.exports = {
  compileCmd: "python3 contract.py",
  compileOnCreate: true,
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
  app: {
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
    programs: {
      approval: "./approval.teal",
      clear: "./clear.teal"
    }
  }
}