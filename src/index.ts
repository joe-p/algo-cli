import { docopt } from 'docopt'
import * as fs from 'fs'
import algosdk from 'algosdk'
import path from 'path'

import * as transactionMethods from './methods/transaction_methods'
import * as accountMethods from './methods/account_methods'
import * as inputMethods from './methods/input_methods'
import * as outputMethods from './methods/output_methods'
import * as deployMethods from './methods/deploy_methods'


export const doc = `
Usage:
  algo send <name>
  algo accounts (fund | close | info)
  algo init
  algo reset
  algo deploy <name>
  algo -h | --help | --version
`
interface Options {
  config?: any
  logFunction?: (str: string) => void
}

export class AlgoCLI {
  kmdClient!: algosdk.Kmd
  algodClient!: algosdk.Algodv2
  kmdWallet!: string
  kmdPassword!: string
  logFunction!: CallableFunction
  config: any
  options: any

  public getPaymentTxn = transactionMethods.getPaymentTxn
  public getApplicationCreateTxn = transactionMethods.getApplicationCreateTxn
  public getAssetCreateTxn = transactionMethods.getAssetCreateTxn
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
  public readData = inputMethods.readData

  public updateData = outputMethods.updateData
  public logASA = outputMethods.logASA
  public logTxn = outputMethods.logTxn
  public writeOutput = outputMethods.writeOutput
  public logAppDrTxn = outputMethods.logAppDrTxn
  public getReadableBytes = outputMethods.getReadableBytes
  public getReadableGlobalState = outputMethods.getReadableGlobalState
  public getAddress = outputMethods.getAddress

  public deployServer = deployMethods.deployServer

  constructor (options: Options = {}) {
    this.options = options
    this.logFunction = options.logFunction || console.log
  }

  public initConfig() {
    this.config = this.config || this.options.config || require(`${process.cwd()}/.algo.config.js`)
  }

  public async execute (docRes: any = docopt(doc), ){
    if (docRes.send) {
      this.initConfig()
      this.initializeConnections()
      const txns = await this.getTxns(docRes)
      await this.send(txns)
    } else if (docRes.deploy) {
      this.initConfig()
      this.initializeDeployConnections()
      const txns = Object.values(await this.getTxns(docRes, true)) as algosdk.Transaction[]
      await this.deployServer(txns)
    } else if (docRes.accounts) {
      this.initConfig()
      this.initializeConnections()
    
      if (docRes.fund) {
        await this.fundAllAccounts()
      } else if (docRes.close) {
        await this.closeAllAccounts()
      } else if (docRes.info) {
        await this.accountsInfo()
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
      this.initConfig()
      if (fs.existsSync('./.algo.data.json')) fs.unlinkSync('./.algo.data.json')
    
      fs.writeFileSync('./.algo.data.json', JSON.stringify({}, null, 2))
    
      this.initializeConnections()
      await this.fundAllAccounts()
    }
  }

  private initializeConnections () {
    this.algodClient = new algosdk.Algodv2(this.config.algod.token, this.config.algod.server, this.config.algod.port)
    this.kmdClient = new algosdk.Kmd(this.config.kmd.token, this.config.kmd.server, this.config.kmd.port)
    this.kmdWallet = this.config.kmd.wallet
    this.kmdPassword = this.config.kmd.password
  }

  private initializeDeployConnections () {
    this.algodClient = new algosdk.Algodv2(this.config.deploy.token, this.config.deploy.server, this.config.deploy.port)
  }
}
