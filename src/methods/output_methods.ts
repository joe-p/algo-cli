import { AlgoCLI } from '../index'
import algosdk from 'algosdk'
import * as fs from 'fs'
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

export function updateData (this: AlgoCLI, updatedData: any) {
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

export async function logASA (this: AlgoCLI, assetIndex: number, offset: number = 0) {
  const asa = (await this.algodClient.getAssetByID(assetIndex).do()).params
  this.writeOutput(`Asset ID: ${assetIndex}`, 2 + offset)
  this.writeOutput(`Name: ${asa.name}`, 2 + offset)
  this.writeOutput(`Unit Name: ${asa['unit-name']}`, 2 + offset)
  this.writeOutput(`Total: ${asa.total.toLocaleString()}`, 2 + offset)
  this.writeOutput(`Decimals: ${asa.decimals}`, 2 + offset)
  this.writeOutput(`Clawback: ${asa.clawback}`, 2 + offset)
  this.writeOutput(`Creator: ${asa.creator}`, 2 + offset)
  this.writeOutput(`Manager: ${asa.manager}`, 2 + offset)
  this.writeOutput(`Freeze: ${asa.freeze}`, 2 + offset)
  this.writeOutput(`Reserve: ${asa.reserve}`, 2 + offset)
  this.writeOutput(`Default Frozen: ${asa['default-frozen']}`, 2 + offset)
  this.writeOutput(`URL: ${atob(asa['url-b64'])}`, 2 + offset)
}

export async function logTxn (this: AlgoCLI, txn: any, txnID: string, offset: number = 0) {
  const nestedTxn = txn.txn.txn
  this.writeOutput(`TX ID: ${txnID}`, 2 + offset)
  this.writeOutput(`From: ${algosdk.encodeAddress(nestedTxn.snd)}`, 2 + offset)
  if (nestedTxn.rcv) this.writeOutput(`To: ${algosdk.encodeAddress(nestedTxn.rcv)}`, 2 + offset)
  if (nestedTxn.amt) this.writeOutput(`Amount: ${nestedTxn.amt.toLocaleString()}`, 2 + offset)
  if (nestedTxn.amt) this.writeOutput(`Fee: ${nestedTxn.fee.toLocaleString()}`, 2 + offset)

  if (txn['application-index']) {
    this.writeOutput(`App ID: ${txn['application-index']}`, 2 + offset)
    this.writeOutput('Logs:', 2 + offset)
    const logs = (txn.logs || []).map((b: any) => {
      return this.getReadableBytes(b)
    })
    this.writeOutput('- ' + logs.join('\n    - '), 4 + offset)
    this.writeOutput('Global Delta:', 2 + offset)
    this.writeOutput(JSON.stringify(this.getReadableGlobalState(txn['global-state-delta'] as Array<GlobalStateDelta>), null, 2), 4 + offset)
    this.writeOutput('Local Deltas:', 2 + offset)
    this.writeOutput(JSON.stringify(txn['local-state-delta'] || [], null, 2), 4 + offset)
  }

  if (txn['asset-index']) {
    await this.logASA(txn['asset-index'], offset)
  }

  const innerTxns = txn['inner-txns'] as Array<any>

  if (innerTxns) {
    this.writeOutput('Inner Transactions:', 2 + offset)
    for (const innerTxn of innerTxns) {
      this.writeOutput(`${innerTxns.indexOf(innerTxn)}:`, offset + 4)
      this.logTxn(innerTxn, txnID, offset + 6)
    }
  }
}

export function writeOutput (this: AlgoCLI, str: string, count: number = 0) {
  this.logFunction(str.replace(/^/gm, ' '.repeat(count)))
}

export function logAppDrTxn (this: AlgoCLI, drr: algosdk.DryrunResult, gtxn: number = 0) {
  const txn = drr.txns[gtxn]
  this.writeOutput(`Opcode Cost: ${txn.cost}`, 2)
  this.writeOutput(`Messages:\n    - ${txn.appCallMessages?.join('\n    - ')}`, 2)
  this.writeOutput('Trace:', 2)
  this.writeOutput(txn.appTrace({ maxValueWidth: process.stdout.columns / 3, topOfStackFirst: false }), 4)
}

export function getReadableBytes (this: AlgoCLI, bytes: string) {
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

export function getReadableGlobalState (this: AlgoCLI, delta: Array<GlobalStateDelta>) {
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
