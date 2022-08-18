import { docopt } from 'docopt'
import { AlgoCLI, doc } from '../src/index'
import algosdk from 'algosdk'

jest.setTimeout(10_000)

function logFunction (str: string) {
  const lines = str.split('\n')
  logOutput = logOutput.concat(lines)
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
    await execute('reset')
    clearLog()
    await execute('accounts info')
  })

  it('Displays 10 lines of output', async () => {
    expect(logOutput.length).toBe(10)
  })

  it('Displays name', async () => {
    expect(logOutput[0]).toBe('alice:')
  })

  it('Displays address', async () => {
    const key = logOutput[1].split(':')[0].trim()
    const value = logOutput[1].split(':')[1].trim()
    expect(key).toBe('Address')
    expect(algosdk.isValidAddress(value)).toBeTruthy()
  })

  it('Displays balance', async () => {
    const key = logOutput[2].split(':')[0].trim()
    const value = logOutput[2].split(':')[1].trim()
    expect(key).toBe('Balance')
    expect(value).toBe((10_000_000).toLocaleString())
  })

  it('Displays MBR', async () => {
    const key = logOutput[3].split(':')[0].trim()
    const value = logOutput[3].split(':')[1].trim()
    expect(key).toBe('Minimum Balance Required')
    expect(value).toBe((100_000).toLocaleString())
  })

  it('Displays mnemonic', async () => {
    const key = logOutput[4].split(':')[0].trim()
    const value = logOutput[4].split(':')[1].trim()
    expect(key).toBe('Mnemonic')
    expect(value.split(' ').length).toBe(25)
  })

  afterAll(async () => {
    await execute('accounts close')
  })
})

describe('send createApp', () => {
  beforeAll(async () => {
    await execute('reset')
    clearLog()
    await execute('send createApp')
  })

  it('Displays compilation line', async () => {
    const line = logOutput[0]
    expect(line).toBe("Running 'python3 contract.py' to generate TEAL")
  })

  it('Displays name (dryrun)', async () => {
    const line = logOutput[1]
    expect(line).toBe('createAppTest Dryrun:')
  })

  it('Displays opcode cost', async () => {
    const line = logOutput[2]
    expect(line).toBe('  Opcode Cost: 11')
  })

  it('Displays messages', async () => {
    const lines = logOutput.slice(3, 6)
    expect(lines[0]).toBe('  Messages:')
    expect(lines[1]).toBe('      - ApprovalProgram')
    expect(lines[2]).toBe('      - PASS')
  })

  it('Displays trace', async () => {
    const lines = logOutput.slice(6, 8)
    expect(lines[0]).toBe('  Trace:')
    expect(lines[1]).toMatch(/pc#/)
  })

  it('Displays name (transaction)', async () => {
    const line = logOutput[21]
    expect(line).toBe('createAppTest Transaction:')
  })

  it('Displays TX ID', async () => {
    const key = logOutput[22].split(':')[0].trim()
    const value = logOutput[22].split(':')[1].trim()
    expect(key).toBe('TX ID')
    expect(value).toHaveLength(52)
  })

  it('Displays From', async () => {
    const key = logOutput[23].split(':')[0].trim()
    const value = logOutput[23].split(':')[1].trim()
    expect(key).toBe('From')
    expect(algosdk.isValidAddress(value.split(' - ')[1])).toBeTruthy()
    expect(value.split(' - ')[0]).toBe('alice')
  })

  it('Displays App ID', async () => {
    expect(logOutput[24]).toMatch(/^ {2}App ID: \d+$/)
  })

  it('Displays Logs', async () => {
    expect(logOutput[25]).toBe('  Logs:')
    expect(logOutput[26]).toBe('    - Hello World!')
  })

  it('Displays Global Delta', async () => {
    expect(logOutput[27]).toBe('  Global Delta:')
    expect(logOutput[29]).toMatch(/^ {6}"globalRound": \d+$/)
  })

  it('Displays Local Delta', async () => {
    expect(logOutput[31]).toBe('  Local Deltas:')
    const acct = logOutput[32].split(':')[0].trim()
    expect(algosdk.isValidAddress(acct.split(' - ')[1])).toBeTruthy()
    expect(acct.split(' - ')[0]).toBe('alice')
    expect(logOutput[34]).toMatch(/^ {8}"localRound": \d+$/)
  })

  afterAll(async () => {
    await execute('accounts close')
  })
})

describe('send payment', () => {
  beforeAll(async () => {
    await execute('reset')
    clearLog()
    await execute('send payment')
  })

  it('Displays name', async () => {
    const line = logOutput[0]
    expect(line).toBe('paymentTest Transaction:')
  })

  it('Displays TX ID', async () => {
    const key = logOutput[1].split(':')[0].trim()
    const value = logOutput[1].split(':')[1].trim()
    expect(key).toBe('TX ID')
    expect(value).toHaveLength(52)
  })

  it('Displays From', async () => {
    const key = logOutput[2].split(':')[0].trim()
    const value = logOutput[2].split(':')[1].trim()
    expect(key).toBe('From')
    expect(algosdk.isValidAddress(value.split(' - ')[1])).toBeTruthy()
    expect(value.split(' - ')[0]).toBe('alice')
  })

  it('Displays To', async () => {
    const key = logOutput[3].split(':')[0].trim()
    const value = logOutput[3].split(':')[1].trim()
    expect(key).toBe('To')
    expect(algosdk.isValidAddress(value.split(' - ')[1])).toBeTruthy()
    expect(value.split(' - ')[0]).toBe('bob')
  })

  it('Displays Amount', async () => {
    const key = logOutput[4].split(':')[0].trim()
    const value = logOutput[4].split(':')[1].trim()
    expect(key).toBe('Amount')
    expect(value).toBe((100_000).toLocaleString())
  })

  it('Displays Fee', async () => {
    const key = logOutput[5].split(':')[0].trim()
    const value = logOutput[5].split(':')[1].trim()
    expect(key).toBe('Fee')
    expect(value).toBe((1_000).toLocaleString())
  })

})