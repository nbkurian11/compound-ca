import assert from 'node:assert/strict'
import test from 'node:test'

const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:5080'
const plan = { starting: 10000, monthly: 500, rate: 7, years: 20, account: 'TFSA' }
const post = (body) => fetch(`${baseUrl}/api/projections`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

test('health endpoint responds with JSON', async () => {
  const response = await fetch(`${baseUrl}/api/health`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'healthy' })
})

test('default projection matches the compound annuity formula', async () => {
  const response = await post(plan)
  assert.equal(response.status, 200)
  const result = await response.json()
  const monthlyRate = plan.rate / 1200
  const growth = (1 + monthlyRate) ** (plan.years * 12)
  const expected = plan.starting * growth + plan.monthly * (growth - 1) / monthlyRate
  assert.ok(Math.abs(result.selected.value - expected) < 0.01)
  assert.equal(result.selected.contributed, 130000)
  assert.equal(result.tfsa.values.length, 21)
  assert.equal(result.labels.length, 21)
  assert.equal(result.labels[0], 'Today')
  assert.equal(result.tfsa.values[20], result.tfsa.value)
  assert.equal(result.taxableRate, 5)
  assert.ok(result.tfsa.value > result.taxable.value)
})

test('account selection and zero-year/zero-rate boundaries', async () => {
  for (const account of ['TFSA', 'RRSP', 'Taxable']) {
    const result = await (await post({ ...plan, account })).json()
    assert.equal(result.account, account)
    assert.deepEqual(result.selected, account === 'Taxable' ? result.taxable : result.tfsa)
  }
  const zeroYears = await (await post({ ...plan, years: 0 })).json()
  assert.equal(zeroYears.selected.value, plan.starting)
  assert.equal(zeroYears.selected.contributed, plan.starting)
  assert.equal(zeroYears.labels.length, 1)
  const zeroRate = await (await post({ ...plan, rate: 0 })).json()
  assert.equal(zeroRate.selected.value, 130000)
  assert.equal(zeroRate.taxableRate, 0)
  const cappedDrag = await (await post({ ...plan, rate: 1 })).json()
  assert.equal(cappedDrag.taxableRate, 0)
  const maximum = await post({ starting: 1e9, monthly: 1e6, rate: 100, years: 100, account: 'TFSA' })
  assert.equal(maximum.status, 200)
  assert.ok(Number.isFinite((await maximum.json()).selected.value))
})

test('invalid and incomplete requests produce validation problems', async () => {
  const invalidPlans = [
    {}, { ...plan, starting: -1 }, { ...plan, starting: 1e9 + 1 },
    { ...plan, starting: 1e100 }, { ...plan, starting: -0.1 },
    { ...plan, monthly: -1 }, { ...plan, monthly: 1e6 + 1 },
    { ...plan, rate: -1 }, { ...plan, rate: 101 },
    { ...plan, rate: -0.1 }, { ...plan, rate: 100.1 },
    { ...plan, years: -1 }, { ...plan, years: 101 }, { ...plan, years: 1.5 },
    { ...plan, account: 'unknown' }, { ...plan, account: null }, { ...plan, rate: null },
    { ...plan, rate: 'NaN' }, { ...plan, rate: 'Infinity' }, { ...plan, rate: '7' },
  ]
  for (const body of invalidPlans) {
    const response = await post(body)
    assert.equal(response.status, 400, JSON.stringify(body))
    assert.ok(response.headers.get('content-type').includes('application/problem+json'))
    assert.ok((await response.json()).errors)
  }
  const malformed = await fetch(`${baseUrl}/api/projections`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  })
  assert.equal(malformed.status, 400)
})

test('development CORS allows the frontend and rejects unconfigured origins', async () => {
  for (const origin of ['http://localhost:5173', 'https://unconfigured.example']) {
    const response = await fetch(`${baseUrl}/api/projections`, {
      method: 'OPTIONS',
      headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
    })
    assert.equal(response.headers.get('access-control-allow-origin'),
      origin === 'http://localhost:5173' ? origin : null)
  }
})

test('calculator rate limit returns 429 and keeps health checks available', async () => {
  let rejected
  for (let index = 0; index < 121; index++) {
    const response = await post(plan)
    const body = await response.json()
    if (response.status === 429) {
      rejected = response
      assert.equal(body.status, 429)
      break
    }
    assert.equal(response.status, 200)
  }
  assert.ok(rejected, 'Expected the shared 120 requests/minute quota to be enforced')
  assert.ok(Number(rejected.headers.get('retry-after')) > 0)
  assert.equal((await fetch(`${baseUrl}/api/health`)).status, 200)
})
