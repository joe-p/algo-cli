import algosdk from 'algosdk'
import express from 'express'
import cors from 'cors'
import { AlgoCLI } from '../index'
import path from 'path'
import open from 'open'

export async function deployServer (this: AlgoCLI, txns: algosdk.Transaction[]) {
  const app = express()

  app.use(express.urlencoded({ extended: true }))
  app.use(express.json())
  app.use(cors())
  app.use('/public', express.static(path.join(__dirname, '../../public')))
  const b64Array = txns.map(txn => Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64'))

  const html = `
<!doctype html>
<html>
    <head>
        <title>Algo CLI Deploy</title>
    </head>
    <body>
        <h1>Algo CLI Deploy</h1>
        <p>Deploying transaction to ${this.config.deploy.server}</p>
        <p>If you do not get a MyAlgo popup please refer to the console to check for errors</p>
        <div id=b64 hidden>${JSON.stringify(b64Array)}</div>
    </body>
    <script type='module' src='public/client.js'></script>
</html>`

  app.get('/', async function (req, res) {
    res.send(html)
  })

  app.post('/', async (req, res) => {
    const b64SignedTxns = req.body
    const sTxns = b64SignedTxns.map((b64: string) => new Uint8Array(Buffer.from(b64, 'base64')))
    const txnPromise = this.sendTxns(sTxns)
    console.log('Sending transaction(s)... Please wait.')

    await txnPromise
    console.log(`Transaction sent! https://testnet.algoexplorer.io/tx/${txns[0].txID()}`)
    process.exit(0)
  })

  app.listen(3007, () => {
    open('http://localhost:3007')
    console.log(`Go to http://localhost:3007 to sign and submit to ${this.config.deploy.server}`)
  })
}
