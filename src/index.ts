import { docopt } from 'docopt'
import * as fs from 'fs'
import algosdk from 'algosdk'
import { exec } from 'child_process'

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
  algo app create 
  algo app call
  algo compile 
  algo -h | --help | --version
`

const config = JSON.parse(fs.readFileSync('./.algo.json', 'utf-8'))
const docRes = docopt(doc)

class AlgoCLI {
  kmdClient: algosdk.Kmd
  algodClient: algosdk.Algodv2
  kmdWallet: string
  kmdPassword: string

  constructor () {
    this.algodClient = new algosdk.Algodv2(config.algod.token, config.algod.server, config.algod.port)
    this.kmdClient = new algosdk.Kmd(config.kmd.token, config.kmd.server, config.kmd.port)
    this.kmdWallet = config.kmd.wallet
    this.kmdPassword = config.kmd.password
  }

  async call () {
    const caller = (await this.getAccounts())[0]

    const txn = await this.getCallTxn(config.app.id, caller)
    const dr = await this.createDryRunFromTxns([txn], 'app_call')
    const drr = new algosdk.DryrunResult(await this.algodClient.dryrun(dr).do())

    this.logDrTxn(drr)
    await this.sendTxn(txn)
    console.log(`AppID: ${config.app.id}`)
    console.log(`App Balance: ${(await this.algodClient.accountInformation(algosdk.getApplicationAddress(config.app.id)).do()).amount}`)
    console.log(`Caller: ${caller.addr}`)
  }

  async create () {
    const creator = (await this.getAccounts())[0]

    const txn = await this.createAppTxn(creator)
    const dr = await this.createDryRunFromTxns([txn], 'app_create')
    const drr = new algosdk.DryrunResult(await this.algodClient.dryrun(dr).do())

    this.logDrTxn(drr)
    const txnResult = await this.sendTxn(txn)
    const appID = txnResult['application-index']
    console.log(`AppID: ${appID}`)
    console.log(`App Balance: ${(await this.algodClient.accountInformation(algosdk.getApplicationAddress(appID)).do()).amount}`)
    console.log(`Creator: ${creator.addr}`)

    config.app.id = appID
    fs.writeFileSync('./.algo.json', JSON.stringify(config, null, 4))
  }

  logDrTxn (drr: algosdk.DryrunResult, gtxn: number = 0) {
    const txn = drr.txns[gtxn]
    console.log(`Opcode Cost: ${txn.cost}`)
    console.log('Logs:')
    const logs = (txn.logs || []).map(b => {
      return this.getReadableBytes(b)
    })
    console.log('- ' + logs.join('\n- '))
    console.log('Global Delta:')
    // @ts-ignore
    console.log(this.getReadableGlobalState(txn.globalDelta))
    console.log('Local Deltas:')
    console.log(txn.localDeltas || [])
    console.log(`Messages:\n- ${txn.appCallMessages?.join('\n- ')}`)
    console.log('Trace:')
    console.log(txn.appTrace({ maxValueWidth: process.stdout.columns / 3, topOfStackFirst: false }))
  }

  getReadableBytes (bytes: string) {
    // first see if it's a valid address
    const b = new Uint8Array(Buffer.from(bytes as string, 'base64'))
    let value = algosdk.encodeAddress(b)

    // then decode as string
    if (algosdk.isValidAddress(value)) {
      return value
    }
    else {
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

  // Based on https://github.com/algorand-devrel/demo-abi/blob/master/js/sandbox.ts
  async getAccounts (): Promise<algosdk.Account[]> {
    const wallets = await this.kmdClient.listWallets()

    // find kmdWallet
    let walletId
    for (const wallet of wallets.wallets) {
      if (wallet.name === this.kmdWallet) walletId = wallet.id
    }
    if (walletId === undefined) throw Error('No wallet named: ' + this.kmdWallet)

    // get handle
    const handleResp = await this.kmdClient.initWalletHandle(walletId, this.kmdPassword)
    const handle = handleResp.wallet_handle_token

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
  async closeAccount (accountToClose: algosdk.Account, closeTo: algosdk.Account) {
    const txnObj = {
      suggestedParams: await this.algodClient.getTransactionParams().do(),
      from: accountToClose.addr,
      to: accountToClose.addr,
      amount: 0,
      closeTo
    }

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject(txnObj).signTxn(accountToClose.sk)
    const { txId } = await this.algodClient.sendRawTransaction(txn).do()
    await algosdk.waitForConfirmation(this.algodClient, txId, 3)
  }

  // create a dryrun object from an array of transactions
  async createDryRunFromTxns (txns: Array<Uint8Array>, desc: string, timestamp?: number) {
    const dTxns = txns.map(t => algosdk.decodeSignedTransaction(t))
    const dr = await algosdk.createDryrun({ client: this.algodClient, txns: dTxns, latestTimestamp: timestamp || 1 })
    fs.writeFileSync('./.dryruns/' + desc + '.dr', algosdk.encodeObj(dr.get_obj_for_encoding(true)))
    return dr
  }

  // send txn to algod and wait for confirmation
  /* eslint-disable no-unused-vars */
  async sendTxn (txn: Uint8Array | Array<Uint8Array>) {
    const { txId } = await this.algodClient.sendRawTransaction(txn).do()
    return await algosdk.waitForConfirmation(this.algodClient, txId, 3)
  }

  async createAppTxn (creator: algosdk.Account) {
    const approval = await this.compileProgram(fs.readFileSync(config.app.programs.approval).toString())
    const clear = await this.compileProgram(fs.readFileSync(config.app.programs.clear).toString())

    const appObj = {
      suggestedParams: await this.algodClient.getTransactionParams().do(),
      from: creator.addr,
      numGlobalByteSlices: config.app.schema.global.bytes,
      numGlobalInts: config.app.schema.global.ints,
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

function compile () {
  exec(config.compileCmd, (error, stdout, stderr) => {
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

if (docRes.app) {
  if (docRes.create) {
    const algoCli = new AlgoCLI()
    if (config.compileCmd && config.alwaysCompile) {
      compile()
    }
  
    algoCli.create()
  } else if (docRes.call) {
    const algoCli = new AlgoCLI()
    algoCli.call()
  }
} else if (docRes.compile) {
  compile()
}
