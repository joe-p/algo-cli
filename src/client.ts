import algosdk from "algosdk"
import MyAlgoConnect from '@randlabs/myalgo-connect'

const myAlgoConnect = new MyAlgoConnect({ disableLedgerNano: false })
const b64Array = JSON.parse((document.getElementById('b64') as HTMLInputElement).innerText) as string[]
const txns = b64Array.map(b64 => algosdk.decodeUnsignedTransaction(Buffer.from(b64, 'base64')))

const settings = {
    shouldSelectOneAccount: false
};

(async () => {
    await myAlgoConnect.connect(settings)
    const sTxns = await myAlgoConnect.signTransaction(txns.map(txn =>txn.toByte()))
    const postData = sTxns.map(t => Buffer.from(t.blob).toString('base64'))

    fetch("/", {
        method: "POST",
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(postData)
      })
})()
