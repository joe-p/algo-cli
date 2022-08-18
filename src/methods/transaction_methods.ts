import { AlgoCLI } from '../index'
import algosdk from 'algosdk'
import { exit } from 'process'

// create a dryrun object from an array of transactions
export async function createDryRunFromTxns (this: AlgoCLI, txns: Array<Uint8Array>, timestamp?: number) {
  const dTxns = txns.map(t => algosdk.decodeSignedTransaction(t))
  const dr = await algosdk.createDryrun({ client: this.algodClient, txns: dTxns, latestTimestamp: timestamp || 1 })
  // fs.writeFileSync('./.dryruns/' + desc + '.dr', algosdk.encodeObj(dr.get_obj_for_encoding(true)))
  return dr
}

export async function getPaymentTxn (this: AlgoCLI, txn: any) {
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

export async function getApplicationCreateTxn (this: AlgoCLI, txn: any) {
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

export async function getAssetCreationTxn (this: AlgoCLI, txn: any) {
  const suggestedParams = await this.algodClient.getTransactionParams().do()

  return algosdk.makeAssetCreateTxnWithSuggestedParams(
    txn.from.addr,
    txn.note,
    txn.total,
    txn.decimals,
    txn.defaultFrozen,
    txn.manager,
    txn.reserve,
    txn.freeze,
    txn.clawback,
    txn.unitName,
    txn.name,
    txn.url,
    txn.metadataHash,
    suggestedParams,
    txn.rekeyTo
  )
}

export async function getAssetConfigTxn (this: AlgoCLI, txn: any) {
  const suggestedParams = await this.algodClient.getTransactionParams().do()

  return algosdk.makeAssetConfigTxnWithSuggestedParams(
    txn.from.addr,
    txn.note,
    txn.assetID,
    txn.manager,
    txn.reserve,
    txn.freeze,
    txn.clawback,
    suggestedParams,
    false,
    txn.rekeyTo
  )
}

export async function getAssetFreezeTxn (this: AlgoCLI, txn: any) {
  const suggestedParams = await this.algodClient.getTransactionParams().do()

  return algosdk.makeAssetFreezeTxnWithSuggestedParams(
    txn.from.addr,
    txn.note,
    txn.assetID,
    txn.freezeTarget,
    txn.freezeState,
    suggestedParams,
    txn.rekeyTo
  )
}

export async function getAssetDestroyTxn (this: AlgoCLI, txn: any) {
  const suggestedParams = await this.algodClient.getTransactionParams().do()

  return algosdk.makeAssetDestroyTxnWithSuggestedParams(
    txn.from.addr,
    txn.note,
    txn.assetID,
    suggestedParams,
    txn.rekeyTo
  )
}

export async function getAssetTrasnferTxn (this: AlgoCLI, txn: any) {
  const suggestedParams = await this.algodClient.getTransactionParams().do()

  return algosdk.makeAssetTransferTxnWithSuggestedParams(
    txn.from.addr,
    txn.to,
    txn.closeRemainderTo,
    txn.revocationTarget,
    txn.amount,
    txn.note,
    txn.assetID,
    suggestedParams,
    txn.rekeyTo
  )
}

export async function getApplicationCallTxn (this: AlgoCLI, txn: any) {
  const suggestedParams = await this.algodClient.getTransactionParams().do()

  return (algosdk.makeApplicationCallTxnFromObject(
    {
      suggestedParams,
      onComplete: txn.nComplete,
      from: txn.from.addr,
      appIndex: txn.appID,
      appArgs: txn.args,
      accounts: txn.accounts,
      foreignApps: txn.apps,
      note: txn.note,
      lease: txn.lease,
      rekeyTo: txn.rekeyTo
    }
  ))
}

export async function send (this: AlgoCLI, txns: any) {
  const unsignedTxns = Object.values(txns) as Array<algosdk.Transaction>
  const gTxn = algosdk.assignGroupID(unsignedTxns)

  const signedTxnsPromises = gTxn.map(async t => t.signTxn(await this.getSK(algosdk.encodeAddress(t.from.publicKey))))
  const signedTxns = await Promise.all(signedTxnsPromises)

  const txnValues = Object.values(txns) as Array<any>
  if (txnValues.length === 1 && txnValues[0].type === 'appl') {
    const dr = await this.createDryRunFromTxns(signedTxns)
    const drr = new algosdk.DryrunResult(await this.algodClient.dryrun(dr).do())

    for (const [index, name] of Object.keys(txns).entries()) {
      if (unsignedTxns[index].type === 'appl') {
        this.writeOutput(`${name} Dryrun:`)
        this.logAppDrTxn(drr, index)
      }
    }
  } else if (txnValues[0].type === 'appl') this.writeOutput('Skipping dryrun trace due to atomic transactions')

  const results = await this.sendTxns(signedTxns)

  for (const [index, name] of Object.keys(txns).entries()) {
    const txn = results[index]

    this.writeOutput(`${name} Transaction:`)

    if (txn['application-index']) {
      const appID = txn['application-index']
      const updatedID = {} as any
      updatedID[name] = appID
      this.updateData(updatedID)
    }

    this.logTxn(txn, unsignedTxns[index].txID())
  }
}

// send txn to algod and wait for confirmation
/* eslint-disable no-unused-vars */
export async function sendTxns (this: AlgoCLI, txns: Array<Uint8Array>) {
  const txIDs = txns.map(t => algosdk.decodeSignedTransaction(t).txn.txID())
  try {
    await this.algodClient.sendRawTransaction(txns).do()

    const results = await Promise.all(txIDs.map(id => algosdk.waitForConfirmation(this.algodClient, id, 3)))
    return results
  } catch (e: any) {
    if (e.response.body.message) {
      console.error(e.response.body.message)
    } else {
      throw e
    }

    exit(1)
  }
}
