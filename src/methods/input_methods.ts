import { AlgoCLI } from '../index'
import algosdk from 'algosdk'
import * as fs from 'fs'
import { execSync } from 'child_process'
import { exit } from 'process'

export function getData (this: AlgoCLI) {
  return JSON.parse(fs.readFileSync('./.algo.data.json', 'utf-8'))
}

export function transformAccountField (this: AlgoCLI, accountString: string, data: any, accounts: Array<algosdk.Account>) {
  let account = accountString as String | algosdk.Account | undefined

  if (accountString && !algosdk.isValidAddress(accountString)) {
    const addr = data[accountString]

    account = accounts.find(a => a.addr === addr)

    if (account === undefined) account = algosdk.getApplicationAddress(data[accountString])
  }

  return account
}

export async function transformConfigTxn (this: AlgoCLI, txn: any) {
  const data = JSON.parse(fs.readFileSync('./.algo.data.json', 'utf-8'))
  const accounts = await this.getAllAccounts();

  ['from', 'to', 'manager', 'clawback', 'freeze', 'reserve', 'revocationTarget'].forEach(f => {
    txn[f] = this.transformAccountField(txn[f], data, accounts)
    if (f !== 'from') {
      txn[f] = txn[f]?.addr
    }
  })

  if (typeof (txn.note) === 'string') {
    txn.note = new Uint8Array(Buffer.from(txn.note))
  }

  if (typeof (txn.appID) === 'string') {
    if (!data[txn.appID]) {
      console.error(`Invalid app ID (${txn.appID}) in ${txn.name}`)
      exit(1)
    }
    txn.appID = data[txn.appID]
  }

  if (typeof txn.onComplete === 'string') {
    // @ts-ignore
    txn.onComplete = algosdk.OnApplicationComplete[`${txn.onComplete}OC`]
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

  txn.accounts = (txn.accounts || []).map((a: string) => {
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

export async function getTxns (this: AlgoCLI, docRes: any) {
  const txns = this.config.txns[docRes['<name>']]
  const txnObjs = {} as any

  for (let txn of txns) {
    if (txn.teal?.compileCmd) {
      this.writeOutput(`Running '${txn.teal.compileCmd}' to generate TEAL`)
      execSync(txn.teal.compileCmd)
    }

    txn = await this.transformConfigTxn(txn)

    // @ts-ignore
    txnObjs[txn.name] = await this[`get${txn.type}Txn`](txn)
  }

  return txnObjs
}

// https://developer.algorand.org/docs/get-details/dapps/smart-contracts/frontend/apps/#create
export async function compileProgram (this: AlgoCLI, programSource: string) {
  const encoder = new TextEncoder()
  const programBytes = encoder.encode(programSource)
  const compileResponse = await this.algodClient.compile(programBytes).do()
  const compiledBytes = new Uint8Array(Buffer.from(compileResponse.result, 'base64'))
  return compiledBytes
}
