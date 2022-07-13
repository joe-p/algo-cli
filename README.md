This tool is a WIP and not officially supported by Algorand. Currently it supports the following transactions:
- Payment
- App create
- NoOp call

# Installation
To install the algo cli tool clone this repo and run the following command: `npm i && npm link`

# Usage 

## Initialization

To initialize a repository with an example smart contract and configuration run `algo init`

## Funding Accounts

To fund the accounts defined in `.algo.config.js` run `algo accounts fund`

```
$ algo accounts fund
  Created account 'alice' - 4XSLCO3JAIUHD277J522M44SBDRX3C5O6EZGVEWJTLK6PCJ35YVP24WNZE
  Funded alice with an additional 10,000,000 microALGO for a balance of 10,000,000 microALGO
  Created account 'bob' - PUG3ZIL37XLRPQWGYID7KXRSI57SX7K6F4D5K3J46SSFSTT3EASCQFVBKA
  Funded bob with an additional 10,000,000 microALGO for a balance of 10,000,000 microALGO
```

## Create App

To send the app creation transaction defined in `.algo.config.js` run `algo send create`

```
$ algo send create
exampleApp:
  Opcode Cost: 2
  Logs:
    - 
  Global Delta:
    {}
  Local Deltas:
    []
  Messages:
      - ApprovalProgram
      - PASS
  Trace:
    pc# |ln# |source    |scratch |stack
    1   |1   |pushint 1 |        |[]
    3   |2   |return    |        |[1]
    4   |3   |          |        |[1]
    
exampleApp: 
  TX ID: 6KCBA6JWXBQ5Y4ULTQLCLMEDDXJATKU5RO5IVNNWHOMSHPJUSIFA
  From: QRBICVVHP4UOECIJDSFX5DVYSG5LTXRCDWH5HTFRVQBDJWWQ2PPDPMZTIQ
  App ID: 1643
```

## Calling App

To call the app alongside a payment to the contract address (as defined in `.algo.config.js`) run `algo send create`


```
$ algo send call
exampleAppCall:
  Opcode Cost: 2
  Logs:
    - 
  Global Delta:
    {}
  Local Deltas:
    []
  Messages:
      - ApprovalProgram
      - PASS
  Trace:
    pc# |ln# |source    |scratch |stack
    1   |1   |pushint 1 |        |[]
    3   |2   |return    |        |[1]
    4   |3   |          |        |[1]
    
exampleAppCall: 
  TX ID: V36BRFFQ7US3WRMV2B6JF25QAUAWQZOZNQXGFZGFNTSVHLQW2YLA
  From: GDZ4EWOZHVA4JW3NSUEEZH4R2DSVSRAPBWJEBAIBYDM5NTNAXFFRMOTCEU
  App ID: 1643
examplePayment: 
  TX ID: DSFYR234MARFGDBUEZGQEKT3QK4E7D6PH56MMLCVQ4CUKVSAPM2Q
  From: GDZ4EWOZHVA4JW3NSUEEZH4R2DSVSRAPBWJEBAIBYDM5NTNAXFFRMOTCEU
  To: L6UNP5RGDRU33G5X46VDNMERX5LMIOEMX4BCNNXV2R64MTI6AEH5DGREZU
  Amount: 100,000
  Fee: 1,000
```

## Account Info
To get account information run `algo account info`

```
$ algo accounts info
alice:
  Address: QRBICVVHP4UOECIJDSFX5DVYSG5LTXRCDWH5HTFRVQBDJWWQ2PPDPMZTIQ
  Balance: 10,000,000
  Minimum Balance Required: 200,000
bob:
  Address: GDZ4EWOZHVA4JW3NSUEEZH4R2DSVSRAPBWJEBAIBYDM5NTNAXFFRMOTCEU
  Balance: 10,000,000
  Minimum Balance Required: 100,000
```

## Account Close

To remove as many ALGO as possible from an account run `algo accounts close`

```
$ algo accounts close
  Closing account QRBICVVHP4UOECIJDSFX5DVYSG5LTXRCDWH5HTFRVQBDJWWQ2PPDPMZTIQ ('alice') to BWOFIIVTMYMTMBXLFCKOH4UMSCFM22MS7LX3JJ64GYHIC76ZVHIDUMLS5Y
  Closing account GDZ4EWOZHVA4JW3NSUEEZH4R2DSVSRAPBWJEBAIBYDM5NTNAXFFRMOTCEU ('bob') to BWOFIIVTMYMTMBXLFCKOH4UMSCFM22MS7LX3JJ64GYHIC76ZVHIDUMLS5Y
```

# Configuration

algo-cli is configured per directory. To define configuration, the `.algo.config.js` file must be edited.
