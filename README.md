This tool is a WIP and not officially supported by Algorand. Currently it supports the following transactions:
- Payment
- App create
- Application call

# Installation
To install the algo cli tool clone this repo and run the following command: `npm i && npx tsc && npm link`

This will install the dependencies, compile the typescript, and add the algo binary to your PATH you can use the `algo` command anywhere.

# Usage

## Configuration Options

Configuration for this tool is done per-directory in `.algo.config.js`. To see an example configuration file, the default configuration can be seen [here](static/.algo.config.js). 

### Top-Level
`algod` - The configuration of the connection to algod
`kmd` - The configuration of the connection to kmd
`accounts` - Named accounts to use when using the `accounts` or `send` sub-command
`txns` - Named group of transactions that can be sent with the `send` sub-command

### algod
`server` - The hostname/IP of the algod HTTP server
`token` - The token to use in HTTP requests
`port` - The port of the algod HTTP server 

### kmd
`server` - The hostname/IP of the kmd HTTP server
`token` - The token to use in HTTP requests
`port` - The port of the kmd HTTP server
`wallet` - The name of the wallet to use for accounts
`password` - The password for the given wallet

### accounts
Accounts are defined in the following format

```js
name: {
  ...properties
}
```

With properties having the following keys

`initialBalance` - The initial balance the account should have when runninig the `fund` sub-command (in uALGO)

### txns

Transactions are defined in the following format

```js
name: [
  ...txn1, 
  ...txn2, 
  ...txnN
]
```

With txn1, txn2, and txnN being the 1st, 2nd, and Nth transaction in a transaction group. Transactions have the following properties

#### Common
`type` - The type of transaction. Currently supported is `ApplicationCreate`, `ApplicationCall`, and `Payment`
`name` - The name of the transaction. This is used when referring to created apps by a human-readable name and in `send` output
`from` - Who the transaction is from. Can be a named account.
`note` - Transaction note. Numbers are interpreted as ints and strings are interpreted as byte arrays
`lease` - Lease field of the transaction
`rekeyTo` - Address to rekey the `from` account to

#### ApplicationCall
`onComplete` - The [OnComplete](https://developer.algorand.org/docs/get-details/dapps/avm/teal/specification/#oncomplete) action of the call. Can be name or number
`args` - The application arguments. Numbers will be interpreted as ints and strings will be interpreted as byte arrays
`accounts` - Accounts array. Values can be named accounts or applications
`apps` - App array. Values can be named accounts
`assets` - Asset array. Values can be named assets
`appID` - ID of the application. Can be a named application

#### ApplicationCreate
Has all the same keys as `ApplicationCall` with the exception of `appID` and addition of the following keys

`extraPages` - Amount of extra pages to use for the application
`schema` - Application schema defined in the following format

```js
schema: {
  global: {
    ints: 0, // global ints
    bytes: 0 // global bytes
  },
  local: {
    ints: 0, // local ints
    bytes: 0 // local bytes
  }
},
```

`teal` - Information about TEAL files in the following format

```js
teal: {
  compileCmd: "python3 contract.py", // optional command used to generate TEAL
  approval: "./approval.teal", // path of approval program
  clear: "./clear.teal" // path of clear program
},
```

#### Payment
`to` - Account to send the payment to. Can be named account or application
`amount` - Amount to send (in uALGO)

## Command Overview

### Send
`algo send <name>` - submit the transaction group with the corresponding name defined in `.algo.config.js`

### Accounts
`algo accounts fund` - fund all accounts to the specific `initialBalance` in `.algo.config.js` using the account with the most ALGO as the funder.
`algo accounts info` - displays address, balance, minimum balance requirement, and mnemonic for each account
`algo accounts close` - sends `balance - minimum_balance_required` ALGO to the funder

### Init
`algo init` - generate `.algo.config.js`, `approval.teal`, `clear.teal`, and `contract.py` in the current directory

### Reset
`algo reset` - deletes the data in `.algo.data.json`, creates new accounts, and then funds the new accounts

# Example Output

```
$ algo send create
Running 'python3 contract.py' to generate TEAL

exampleApp Dryrun:
  Opcode Cost: 2
  Messages:
      - ApprovalProgram
      - PASS
  Trace:
    pc# |ln# |source    |scratch |stack
    1   |1   |pushint 1 |        |[]
    3   |2   |return    |        |[1]
    4   |3   |          |        |[1]
    
exampleApp Transaction:
  TX ID: YX47EY3J6JXAZ2XZDUA7KWG3J5NRRIMOGHVI5KQBKJS3HTDQNA5A
  From: EDEOMBZLPQNVW6GXIHUOSPWQNJT4XONQBW65DHAHHGYSECFLYSO4KQKFVM
  App ID: 33
  Logs:
    - 
  Global Delta:
    {}
  Local Deltas:
    []

$ algo send create
Running 'python3 contract.py' to generate TEAL

exampleApp Dryrun:
  Opcode Cost: 2
  Messages:
      - ApprovalProgram
      - PASS
  Trace:
    pc# |ln# |source    |scratch |stack
    1   |1   |pushint 1 |        |[]
    3   |2   |return    |        |[1]
    4   |3   |          |        |[1]
    
exampleApp Transaction:
  TX ID: U3TBSEB6KRQJ6WCHS5VH3W7YKJXB7E5BVTSXGZR5G2JXTLLPB5JA
  From: EDEOMBZLPQNVW6GXIHUOSPWQNJT4XONQBW65DHAHHGYSECFLYSO4KQKFVM
  App ID: 34
  Logs:
    - 
  Global Delta:
    {}
  Local Deltas:
    []

$ algo accounts close
Closing account EDEOMBZLPQNVW6GXIHUOSPWQNJT4XONQBW65DHAHHGYSECFLYSO4KQKFVM ('alice') to A4YGPDPVZHUFNMNFIA6JQ3CJDM2434LSUXH3G2VQVWOJF4FHYMDET66IOY
Closing account IMKLSZXR733IQPKU4C7F7HNWD66TDFNIE3OVTB22KJBGXLPMYHH3A245CU ('bob') to A4YGPDPVZHUFNMNFIA6JQ3CJDM2434LSUXH3G2VQVWOJF4FHYMDET66IOY
```
