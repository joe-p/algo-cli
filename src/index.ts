import { docopt } from 'docopt'
import * as fs from 'fs'
import algosdk from 'algosdk'
import { exec } from 'child_process'
import { exit } from 'process'

interface GlobalStateDeltaValue {
  action: number,
  bytes?: string
  uint?: number
}

interface GlobalStateDelta {
  key: string
  value: GlobalStateDeltaValue
}

interface ReadableGlobalStateDelta {
  [key: string]: string | number | bigint | undefined
}

const doc = `
Usage:
  algo send <name>
  algo accounts (fund | close | info)
  algo init
  algo -h | --help | --version
`

const docRes = docopt(doc)

class AlgoCLI {
  kmdClient: algosdk.Kmd
  algodClient: algosdk.Algodv2
  kmdWallet: string
  kmdPassword: string
  config: any

  constructor () {
    this.config = require(`${process.cwd()}/.algo.config.js`)
    this.algodClient = new algosdk.Algodv2(this.config.algod.token, this.config.algod.server, this.config.algod.port)
    this.kmdClient = new algosdk.Kmd(this.config.kmd.token, this.config.kmd.server, this.config.kmd.port)
    this.kmdWallet = this.config.kmd.wallet
    this.kmdPassword = this.config.kmd.password
  }

  async closeAllAccounts() {
    const accounts = await this.getAllAccounts()
    const closeTo = accounts[0]
    const data = this.getData()

    for(const name of Object.keys(this.config.accounts)) {    
      const addr = data[name]

      const account = accounts.find(a => a.addr === addr) as algosdk.Account

      this.writeOutput(`Closing account ${addr} ('${name}') to ${closeTo.addr}`)
      await this.closeAccount(account, closeTo)
    }

  }



  getData() {
    return JSON.parse(fs.readFileSync('./.algo.data.json', 'utf-8'))
  }

  async accountsInfo() {
    const accounts = await this.getAllAccounts()
    const data = this.getData()

    for(const name of Object.keys(this.config.accounts)) {    
      const addr = data[name]

      const account = accounts.find(a => a.addr === addr) as algosdk.Account

      const info = await this.algodClient.accountInformation(account.addr).do()

      this.writeOutput(`${name}:`, 0)
      this.writeOutput(`Address: ${info.address}`)
      this.writeOutput(`Balance: ${info.amount.toLocaleString()}`)
      this.writeOutput(`Minimum Balance Required: ${info['min-balance'].toLocaleString()}`)

    }

  }

  async fundAllAccounts() {
    const accounts = await this.getAllAccounts()
    const funder = accounts[0]

    for(const [name, accountConfig] of Object.entries(this.config.accounts)) {    
      let account: algosdk.Account

      const addr = this.getData()[name] as (string | undefined)

      if(addr === undefined) {
        account = await this.addAccount(name)
      } else {
        account = accounts.find(a => a.addr === addr) as algosdk.Account
      }

      const balance = (await this.algodClient.accountInformation(account.addr).do()).amount


      const initialBalance = (accountConfig as any).initialBalance
      const fundAmount = initialBalance - balance

      await this.fundAccount(funder, account, fundAmount)

      this.writeOutput(`Funded ${name} with an additional ${fundAmount.toLocaleString()} microALGO for a balance of ${initialBalance.toLocaleString()} microALGO`)
    }    
  }

  async transformConfigTxn (txn: any) {
    const data = JSON.parse(fs.readFileSync('./.algo.data.json', 'utf-8'))
    const accounts = await this.getAllAccounts()

    if (!algosdk.isValidAddress(txn.from)) {
      const addr = data[txn.from]
      txn.from = accounts.find(a => a.addr === addr )
    }

    if (txn.to && !algosdk.isValidAddress(txn.to)) {
      const addr = data[txn.to]
      const initialValue = txn.to

      txn.to = accounts.find(a => a.addr === addr )

      if (!algosdk.isValidAddress(txn.to)) txn.to = algosdk.getApplicationAddress(data[initialValue])
    }

    if (typeof (txn.note) === 'string') {
      txn.note = new Uint8Array(Buffer.from(txn.note))
    }

    if (typeof (txn.appID) === 'string') {
      txn.appID = data[txn.appID]
    }

    switch (txn.onComplete) {
      case ('NoOp'):
        txn.onComplete = algosdk.OnApplicationComplete.NoOpOC
        break
      default:
        break
    }

    if (txn.teal) txn.teal.approval = await this.compileProgram(fs.readFileSync(txn.teal.approval, 'utf-8'))
    if (txn.teal) txn.teal.clear = await this.compileProgram(fs.readFileSync(txn.teal.clear, 'utf-8'))

    txn.args = (txn.args || []).map((a: any) => {
      if (typeof (a) === 'string') {
        return new Uint8Array(Buffer.from(a))
      } else if (typeof (a) === 'number') {
        return algosdk.encodeUint64(a)
      } else {
        return a
      }
    })

    txn.accounts = (txn.accounts || []).map( (a: string)  => {
      return data[a] || a
    })

    txn.apps = (txn.apps || []).map((a: any) => {
      if (typeof (a) === 'string') {
        return data[a]
      }

      return a
    })

    return txn
  }

  async getPaymentTxn (txn: any) {
    const suggestedParams = await this.algodClient.getTransactionParams().do()

    return algosdk.makePaymentTxn(
      txn.from.addr,
      txn.to,
      suggestedParams.fee,
      txn.amount,
      txn.closeRemainderTo,
      suggestedParams.firstRound,
      suggestedParams.lastRound,
      txn.note,
      suggestedParams.genesisHash,
      suggestedParams.genesisID,
      txn.rekeyTo
    )
  }

  async getApplicationCreateTxn (txn: any) {
    const suggestedParams = await this.algodClient.getTransactionParams().do()

    return algosdk.makeApplicationCreateTxn(
      txn.from.addr,
      suggestedParams,
      txn.onComplete,
      txn.teal.approval,
      txn.teal.clear,
      txn.schema.local.ints,
      txn.schema.local.bytes,
      txn.schema.global.ints,
      txn.schema.global.bytes,
      txn.args,
      txn.accounts,
      txn.apps,
      txn.assets,
      txn.note,
      txn.lease,
      txn.rekeyTo,
      txn.extraPages
    )
  }

  async getApplicationNoOpTxn (txn: any) {
    const suggestedParams = await this.algodClient.getTransactionParams().do()

    return algosdk.makeApplicationNoOpTxn(
      txn.from.addr,
      suggestedParams,
      txn.appID,
      txn.args,
      txn.accounts,
      txn.apps,
      txn.assets,
      txn.note,
      txn.lease,
      txn.rekeyTo
    )
  }

  async getTxns () {
    const txns = this.config.txns[docRes['<name>']]
    const txnObjs = {} as any

    for (let txn of txns) {
      txn = await this.transformConfigTxn(txn)

      switch (txn.type) {
        case ('ApplicationCreate'):
          if(txn.teal.compileCmd) {
            this.writeOutput(`Running '${txn.teal.compileCmd}' to generate TEAL`, 0)
            compile(txn.teal.compileCmd)
          }
          txnObjs[txn.name] = await this.getApplicationCreateTxn(txn)
          break
        case ('ApplicationCall'):
          txnObjs[txn.name] = await this.getApplicationNoOpTxn(txn)
          break
        case ('Payment'):
          txnObjs[txn.name] = await this.getPaymentTxn(txn)
          break
        default:
          break
      }
    }

    return txnObjs
  }

  async send (txns: any) {
    const unsignedTxns = Object.values(txns) as Array<algosdk.Transaction>
    const gTxn = algosdk.assignGroupID(unsignedTxns)

    const signedTxnsPromises = gTxn.map(async t => t.signTxn(await this.getSK(algosdk.encodeAddress(t.from.publicKey))))
    const signedTxns = await Promise.all(signedTxnsPromises)

    const dr = await this.createDryRunFromTxns(signedTxns)
    const drr = new algosdk.DryrunResult(await this.algodClient.dryrun(dr).do())

    for (const [index, name] of Object.keys(txns).entries()) {
      if (unsignedTxns[index].type === 'appl') {
        this.writeOutput(`${name}:`, 0)
        this.logAppDrTxn(drr, index)
      }
    }

    const results = await this.sendTxns(signedTxns)

    for (const [index, name] of Object.keys(txns).entries()) {
      const txn = results[index]

      console.log(name + ': ')

      if (txn['application-index']) {
        const appID = txn['application-index']
        const updatedID = {} as any
        updatedID[name] = appID
        this.updateData(updatedID)
      }

      this.logTxn(txn, unsignedTxns[index].txID())
    }
  }

  updateData (updatedData: any) {
    const file = './.algo.data.json'
    let config = {} as any
    if (fs.existsSync(file)) {
      config = JSON.parse(fs.readFileSync(file, 'utf-8'))
    }

    const newConfig = {
      ...config,
      ...updatedData
    }

    fs.writeFileSync(file, JSON.stringify(newConfig, null, 4))
  }

  logTxn (txn: any, txnID: string) {
    const nestedTxn = txn.txn.txn
    this.writeOutput(`TX ID: ${txnID}`)
    this.writeOutput(`From: ${algosdk.encodeAddress(nestedTxn.snd)}`)
    if (nestedTxn.rcv) this.writeOutput(`To: ${algosdk.encodeAddress(nestedTxn.rcv)}`)
    if (nestedTxn.amt) this.writeOutput(`Amount: ${nestedTxn.amt.toLocaleString()}`)
    if (nestedTxn.amt) this.writeOutput(`Fee: ${nestedTxn.fee.toLocaleString()}`)
    if (nestedTxn.apid || txn['application-index']) this.writeOutput(`App ID: ${nestedTxn.apid || txn['application-index']}`)
  }

  writeOutput (str: string, count: number = 2) {
    console.log(str.replace(/^/gm, ' '.repeat(count)))
  }

  logAppDrTxn (drr: algosdk.DryrunResult, gtxn: number = 0) {
    const txn = drr.txns[gtxn]
    this.writeOutput(`Opcode Cost: ${txn.cost}`)
    this.writeOutput('Logs:')
    const logs = (txn.logs || []).map(b => {
      return this.getReadableBytes(b)
    })
    this.writeOutput('- ' + logs.join('\n    - '), 4)
    this.writeOutput('Global Delta:')
    this.writeOutput(JSON.stringify(this.getReadableGlobalState(txn.globalDelta as Array<GlobalStateDelta>), null, 2), 4)
    this.writeOutput('Local Deltas:')
    this.writeOutput(JSON.stringify(txn.localDeltas || [], null, 2), 4)
    this.writeOutput(`Messages:\n    - ${txn.appCallMessages?.join('\n    - ')}`)
    this.writeOutput('Trace:')
    this.writeOutput(txn.appTrace({ maxValueWidth: process.stdout.columns / 3, topOfStackFirst: false }), 4)
  }

  getReadableBytes (bytes: string) {
    // first see if it's a valid address
    const b = new Uint8Array(Buffer.from(bytes as string, 'base64'))
    const value = algosdk.encodeAddress(b)

    // then decode as string
    if (algosdk.isValidAddress(value)) {
      return value
    } else {
      return Buffer.from(bytes as string, 'base64').toString()
    }
  }

  getReadableGlobalState (delta: Array<GlobalStateDelta>) {
    const r = {} as ReadableGlobalStateDelta

    if (delta === undefined) return r

    delta.forEach(d => {
      const key = Buffer.from(d.key, 'base64').toString('utf8')
      let value = null

      if (d.value.bytes) {
        value = this.getReadableBytes(d.value.bytes)
      } else {
        value = d.value.uint
      }

      r[key] = value
    })

    return r
  }

  async getHandle() {
    const wallets = await this.kmdClient.listWallets()

    // find kmdWallet
    let walletId
    for (const wallet of wallets.wallets) {
      if (wallet.name === this.kmdWallet) walletId = wallet.id
    }
    if (walletId === undefined) throw Error('No wallet named: ' + this.kmdWallet)

    // get handle
    const handleResp = await this.kmdClient.initWalletHandle(walletId, this.kmdPassword)
    return handleResp.wallet_handle_token
  }

  async getSK (addr: string) {
    const accounts = await this.getAllAccounts()
    return accounts.find(a => a.addr === addr)?.sk as Uint8Array
  }

  async addAccount(name: string) {
    const handle = await this.getHandle()

    const newAccount = algosdk.generateAccount()
    await this.kmdClient.importKey(handle, newAccount.sk)

    this.kmdClient.releaseWalletHandle(handle)

    const updatedData = {} as any
    updatedData[name] = newAccount.addr
    this.updateData(updatedData)

    this.writeOutput(`Created account '${name}' - ${newAccount.addr}`)

    return newAccount
  }

  // Based on https://github.com/algorand-devrel/demo-abi/blob/master/js/sandbox.ts
  async getAllAccounts (): Promise<algosdk.Account[]> {
    const handle = await this.getHandle()

    // get account keys
    const addresses = await this.kmdClient.listKeys(handle)
    const acctPromises = []
    for (const addr of addresses.addresses) {
      acctPromises.push(this.kmdClient.exportKey(handle, this.kmdPassword, addr))
    }
    const keys = await Promise.all(acctPromises)

    // release handle
    this.kmdClient.releaseWalletHandle(handle)

    // return all algosdk.Account objects derived from kmdWallet
    return keys.map((k) => {
      const addr = algosdk.encodeAddress(k.private_key.slice(32))
      const acct = { sk: k.private_key, addr } as algosdk.Account
      return acct
    })
  }

  // https://developer.algorand.org/docs/get-details/dapps/smart-contracts/frontend/apps/#create
  async compileProgram (programSource: string) {
    const encoder = new TextEncoder()
    const programBytes = encoder.encode(programSource)
    const compileResponse = await this.algodClient.compile(programBytes).do()
    const compiledBytes = new Uint8Array(Buffer.from(compileResponse.result, 'base64'))
    return compiledBytes
  }

  // use one account to fund another
  async fundAccount (from: algosdk.Account, to: algosdk.Account, amount: number) {
    const payObj = {
      suggestedParams: await this.algodClient.getTransactionParams().do(),
      from: from.addr,
      to: to.addr,
      amount
    }

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject(payObj).signTxn(from.sk)
    const { txId } = await this.algodClient.sendRawTransaction(txn).do()
    await algosdk.waitForConfirmation(this.algodClient, txId, 3)
  }

  // close the remaining balance of an account to another account
  async closeAccount (accountToClose: algosdk.Account, closeToAccount: algosdk.Account) {

    const info = await this.algodClient.accountInformation(accountToClose.addr).do()
    const balance = info.amount
    const mbr = info['min-balance']
    const suggestedParams = await this.algodClient.getTransactionParams().do()
    const amount = balance - mbr - (suggestedParams.fee | 1_000)

    if (amount <= 0) return
    
    const txnObj = {
      suggestedParams,
      from: accountToClose.addr,
      to: closeToAccount.addr,
      amount: amount
    }

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject(txnObj).signTxn(accountToClose.sk)

    const { txId } = await this.algodClient.sendRawTransaction(txn).do()
    await algosdk.waitForConfirmation(this.algodClient, txId, 3)
  }

  // create a dryrun object from an array of transactions
  async createDryRunFromTxns (txns: Array<Uint8Array>, timestamp?: number) {
    const dTxns = txns.map(t => algosdk.decodeSignedTransaction(t))
    const dr = await algosdk.createDryrun({ client: this.algodClient, txns: dTxns, latestTimestamp: timestamp || 1 })
    // fs.writeFileSync('./.dryruns/' + desc + '.dr', algosdk.encodeObj(dr.get_obj_for_encoding(true)))
    return dr
  }

  // send txn to algod and wait for confirmation
  /* eslint-disable no-unused-vars */
  async sendTxns (txns: Array<Uint8Array>) {
    const txIDs = txns.map(t => algosdk.decodeSignedTransaction(t).txn.txID())
    try {
      await this.algodClient.sendRawTransaction(txns).do()

      const results = await Promise.all(txIDs.map(id => algosdk.waitForConfirmation(this.algodClient, id, 3)))
      return results
    } catch (e: any) {
      if(e.response.body.message) {
        console.error(e.response.body.message)
      } else {
        throw e
      }

      exit(1)
    }
  }

  async createAppTxn (creator: algosdk.Account) {
    const approval = await this.compileProgram(fs.readFileSync(this.config.app.programs.approval).toString())
    const clear = await this.compileProgram(fs.readFileSync(this.config.app.programs.clear).toString())

    const appObj = {
      suggestedParams: await this.algodClient.getTransactionParams().do(),
      from: creator.addr,
      numGlobalByteSlices: this.config.app.schema.global.bytes,
      numGlobalInts: this.config.app.schema.global.ints,
      approvalProgram: approval,
      clearProgram: clear
    } as any

    return algosdk.makeApplicationCreateTxnFromObject(appObj).signTxn(creator.sk)
  }

  async getCallTxn (id: number, from: algosdk.Account) {
    const suggestedParams = await this.algodClient.getTransactionParams().do()

    const appObj = {
      suggestedParams: { ...suggestedParams },
      from: from.addr,
      appIndex: id
    } as any

    return algosdk.makeApplicationCallTxnFromObject(appObj).signTxn(from.sk)
  }
}

function compile (compileCmd: string) {
  exec(compileCmd, (error, stdout, stderr) => {
    if (error) {
      console.error(error.message)
      return
    }
    if (stderr) {
      console.error(stderr)
      return
    }
    console.log(stdout)
  })
}

if (docRes.send) {
  const algoCli = new AlgoCLI()
  algoCli.getTxns().then(async txns => {
    await algoCli.send(txns)
  })
} else if(docRes.accounts) {
  const algoCli = new AlgoCLI()

  if(docRes.fund) {
    algoCli.fundAllAccounts()
  } else if(docRes.close) {
    algoCli.closeAllAccounts()
  } else if(docRes.info) {
    algoCli.accountsInfo()
  }
} else if(docRes.init) {
  const staticFiles = ['.algo.config.js', 'contract.py', 'approval.teal', 'clear.teal']

  staticFiles.forEach(f => {
    if (!fs.existsSync(f)) {
      const source = __dirname + '/../static/' + f
      const dest = './' + f
      fs.copyFileSync(source, dest)
    }
  })

  if (!fs.existsSync('./.algo.data.json')) {
    fs.writeFileSync('./.algo.data.json', JSON.stringify({}, null, 2))
  }
}
