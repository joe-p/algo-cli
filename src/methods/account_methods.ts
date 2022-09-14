import { AlgoCLI } from '../index'
import algosdk from 'algosdk'
import { exit } from 'process'

export async function accountsInfo (this: AlgoCLI) {
  const accounts = await this.getAllAccounts()
  const data = this.getData()

  for (const name of Object.keys(this.config.accounts)) {
    const addr = data[name]

    const account = this.findAccount(accounts, addr, name)

    const info = await this.algodClient.accountInformation(account.addr).do()

    this.writeOutput(`${name}:`)
    this.writeOutput(`Address: ${info.address}`, 2)
    this.writeOutput(`Balance: ${info.amount.toLocaleString()}`, 2)
    this.writeOutput(`Minimum Balance Required: ${info['min-balance'].toLocaleString()}`, 2)
    this.writeOutput(`Mnemonic: ${algosdk.secretKeyToMnemonic(account.sk)}`, 2)
  }
}

export async function closeAllAccounts (this: AlgoCLI) {
  const accounts = await this.getAllAccounts()
  const closeTo = accounts[0]
  const data = this.getData()

  for (const name of Object.keys(this.config.accounts)) {
    const addr = data[name]

    this.writeOutput(`Closing account ${addr} ('${name}') to ${closeTo.addr}`)

    const account = this.findAccount(accounts, addr, name)

    await this.closeAccount(account, closeTo)
  }
}

export async function fundAllAccounts (this: AlgoCLI) {
  const accounts = await this.getAllAccounts()
  const data = this.getData()

  let funder = accounts.find(a => a.addr === data.defaultFunder)

  if (funder === undefined) {
    const acctInfos = await Promise.all(accounts.map((a) => this.algodClient.accountInformation(a.addr).do()))
    const highestBalance = acctInfos.sort((a, b) => b.amount - a.amount)[0]
    funder = accounts.find(a => a.addr === highestBalance.address) as algosdk.Account
    this.updateData({ defaultFunder: funder.addr })
  }

  for (const [name, accountConfig] of Object.entries(this.config.accounts)) {
    let account: algosdk.Account

    const addr = this.getData()[name] as (string | undefined)

    if (addr === undefined) {
      account = await this.addAccount(name)
    } else {
      account = this.findAccount(accounts, addr, name)
    }

    const balance = (await this.algodClient.accountInformation(account.addr).do()).amount

    const initialBalance = (accountConfig as any).initialBalance
    const fundAmount = initialBalance - balance

    if (fundAmount > 0) {
      await this.fundAccount(funder, account, fundAmount)
      this.writeOutput(`Funded ${name} with an additional ${fundAmount.toLocaleString()} microALGO for a balance of ${initialBalance.toLocaleString()} microALGO`, 2)
    }
  }
}

export function findAccount (this: AlgoCLI, accounts: Array<algosdk.Account>, addr: string, name: string) {
  const account = accounts.find(a => a.addr === addr)

  if (account === undefined) {
    let accountString = addr

    if (name !== undefined) {
      accountString = `${name} (${addr})`
    }

    console.error(`Account ${accountString} not found. Perhaps you are on the wrong network? Run 'algo reset' to reset the saved data and fund the new accounts`)
    exit(1)
  }

  return account
}

export async function getHandle (this: AlgoCLI) {
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

export async function getSK (this: AlgoCLI, addr: string) {
  const accounts = await this.getAllAccounts()
  return accounts.find(a => a.addr === addr)?.sk as Uint8Array
}

export async function addAccount (this: AlgoCLI, name: string) {
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
export async function getAllAccounts (this: AlgoCLI): Promise<algosdk.Account[]> {
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

// use one account to fund another
export async function fundAccount (this: AlgoCLI, from: algosdk.Account, to: algosdk.Account, amount: number) {
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
export async function closeAccount (this: AlgoCLI, accountToClose: algosdk.Account, closeToAccount: algosdk.Account) {
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
    amount
  }

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject(txnObj).signTxn(accountToClose.sk)

  const { txId } = await this.algodClient.sendRawTransaction(txn).do()
  await algosdk.waitForConfirmation(this.algodClient, txId, 3)
}
