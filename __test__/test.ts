import { docopt } from 'docopt'
import { AlgoCLI, doc } from '../src/index'
import algosdk from 'algosdk'

jest.setTimeout(10_000)

function logFunction (str: string) {
  logOutput.push(str)
}

function clearLog () {
  logOutput = []
}

async function execute (cmd: string) {
  const argv = cmd.split(' ')
  await cli.execute(docopt(doc, { argv }))
}

let logOutput = [] as Array<string>
const cli = new AlgoCLI({ logFunction })

describe('accounts info', () => {
  beforeAll(async () => {
    await execute('accounts fund')
    await execute('accounts close')
    await execute('reset')
  })

  it('Displays 10 lines of output', async () => {
    clearLog()
    await execute('accounts info')
    expect(logOutput.length).toBe(10)
  })

  it('Displays name', async () => {
    clearLog()
    await execute('accounts info')
    expect(logOutput[0]).toBe('alice:')
  })

  it('Displays address', async () => {
    clearLog()
    await execute('accounts info')
    const key = logOutput[1].split(':')[0].trim()
    const value = logOutput[1].split(':')[1].trim()
    expect(key).toBe('Address')
    expect(algosdk.isValidAddress(value)).toBeTruthy()
  })

  it('Displays balance', async () => {
    clearLog()
    await execute('accounts info')
    const key = logOutput[2].split(':')[0].trim()
    const value = logOutput[2].split(':')[1].trim()
    expect(key).toBe('Balance')
    expect(value).toBe((10_000_000).toLocaleString())
  })

  it('Displays MBR', async () => {
    clearLog()
    await execute('accounts info')
    const key = logOutput[3].split(':')[0].trim()
    const value = logOutput[3].split(':')[1].trim()
    expect(key).toBe('Minimum Balance Required')
    expect(value).toBe((100_000).toLocaleString())
  })

  it('Displays mnemonic', async () => {
    clearLog()
    await execute('accounts info')
    const key = logOutput[4].split(':')[0].trim()
    const value = logOutput[4].split(':')[1].trim()
    expect(key).toBe('Mnemonic')
    expect(value.split(' ').length).toBe(25)
  })
})
