import { docopt } from 'docopt'
import * as fs from 'fs'
import algosdk from 'algosdk'
import path from 'path'

import * as transactionMethods from './methods/transaction_methods'
import * as accountMethods from './methods/account_methods'
import * as inputMethods from './methods/input_methods'
import * as outputMethods from './methods/output_methods'

const doc = `
Usage:
  algo send <name>
  algo accounts (fund | close | info)
  algo init
  algo reset
  algo -h | --help | --version
`

export class AlgoCLI {
  kmdClient!: algosdk.Kmd
  algodClient!: algosdk.Algodv2
  kmdWallet!: string
  kmdPassword!: string
  config: any

  public getPaymentTxn = transactionMethods.getPaymentTxn
  public getApplicationCreateTxn = transactionMethods.getApplicationCreateTxn
  public getAssetCreationTxn = transactionMethods.getAssetCreationTxn
  public getAssetConfigTxn = transactionMethods.getAssetConfigTxn
  public getAssetFreezeTxn = transactionMethods.getAssetFreezeTxn
  public getAssetDestroyTxn = transactionMethods.getAssetDestroyTxn
  public getAssetTrasnferTxn = transactionMethods.getAssetTrasnferTxn
  public getApplicationCallTxn = transactionMethods.getApplicationCallTxn
  public send = transactionMethods.send
  public sendTxns = transactionMethods.sendTxns
  public createDryRunFromTxns = transactionMethods.createDryRunFromTxns

  public accountsInfo = accountMethods.accountsInfo
  public closeAllAccounts = accountMethods.closeAllAccounts
  public fundAllAccounts = accountMethods.fundAllAccounts
  public findAccount = accountMethods.findAccount
  public getHandle = accountMethods.getHandle
  public getSK = accountMethods.getSK
  public addAccount = accountMethods.addAccount
  public getAllAccounts = accountMethods.getAllAccounts
  public fundAccount = accountMethods.fundAccount
  public closeAccount = accountMethods.closeAccount

  public getData = inputMethods.getData
  public transformAccountField = inputMethods.transformAccountField
  public transformConfigTxn = inputMethods.transformConfigTxn
  public getTxns = inputMethods.getTxns
  public compileProgram = inputMethods.compileProgram

  public updateData = outputMethods.updateData
  public logASA = outputMethods.logASA
  public logTxn = outputMethods.logTxn
  public writeOutput = outputMethods.writeOutput
  public logAppDrTxn = outputMethods.logAppDrTxn
  public getReadableBytes = outputMethods.getReadableBytes
  public getReadableGlobalState = outputMethods.getReadableGlobalState

  constructor (docRes: any = docopt(doc), config: any = require(`${process.cwd()}/.algo.config.js`)) {
    this.config = config

    if (docRes.send) {
      this.initializeConnections()
      this.getTxns(docRes).then(async txns => {
        await this.send(txns)
      })
    } else if (docRes.accounts) {
      this.initializeConnections()
    
      if (docRes.fund) {
        this.fundAllAccounts()
      } else if (docRes.close) {
        this.closeAllAccounts()
      } else if (docRes.info) {
        this.accountsInfo()
      }
    } else if (docRes.init) {
      const staticFiles = ['.algo.config.js', 'contract.py', 'approval.teal', 'clear.teal']
    
      staticFiles.forEach(f => {
        if (!fs.existsSync(f)) {
          const source = path.join(__dirname, '/../static/', f)
          const dest = './' + f
          fs.copyFileSync(source, dest)
        }
      })
    
      if (!fs.existsSync('./.algo.data.json')) {
        fs.writeFileSync('./.algo.data.json', JSON.stringify({}, null, 2))
      }
    } else if (docRes.reset) {
      if (fs.existsSync('./.algo.data.json')) fs.unlinkSync('./.algo.data.json')
    
      fs.writeFileSync('./.algo.data.json', JSON.stringify({}, null, 2))
    
      this.initializeConnections()
      this.fundAllAccounts()
    }
  }

  private initializeConnections () {
    this.algodClient = new algosdk.Algodv2(this.config.algod.token, this.config.algod.server, this.config.algod.port)
    this.kmdClient = new algosdk.Kmd(this.config.kmd.token, this.config.kmd.server, this.config.kmd.port)
    this.kmdWallet = this.config.kmd.wallet
    this.kmdPassword = this.config.kmd.password
  }
}

new AlgoCLI()