import { useEffect, useRef, useState } from 'react'
import { Chart as ChartJS, CategoryScale, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { fetchProjection } from './api'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const accountTypes = ['TFSA', 'RRSP', 'Taxable']
const currency = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })

const initialForm = { starting: '10000', monthly: '500', rate: '7', years: '20' }

function Input({ label, value, onChange, before, after, note, max, step = 'any' }) {
  return <label className="block">
    <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
    <div className="flex items-center border-b border-slate-300 pb-2 transition focus-within:border-slate-900">
      {before && <span className="mr-1.5 text-slate-500">{before}</span>}
      <input type="number" required min="0" max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none bg-transparent text-lg font-medium text-slate-950 outline-none" />
      {after && <span className="ml-2 text-sm text-slate-500">{after}</span>}
    </div>
    {note && <span className="mt-2 block text-xs leading-5 text-slate-500">{note}</span>}
  </label>
}

function Metric({ label, value, detail }) {
  return <div>
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{value}</p>
    {detail && <p className="mt-2 text-xs text-slate-500">{detail}</p>}
  </div>
}

export default function App() {
  const [form, setForm] = useState(initialForm)
  const [account, setAccount] = useState('TFSA')
  const [projection, setProjection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestRef = useRef(null)
  const update = (key) => (value) => setForm((current) => ({ ...current, [key]: value }))

  async function calculate(formValues, accountType) {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    const timeout = setTimeout(() => controller.abort(), 15000)
    setLoading(true)
    setError('')
    try {
      const result = await fetchProjection(formValues, accountType, controller.signal)
      if (requestRef.current === controller) setProjection(result)
    } catch (cause) {
      if (requestRef.current !== controller) return
      setError(cause.name === 'AbortError'
        ? 'The calculation timed out. Please try again.'
        : cause instanceof TypeError
          ? 'Unable to reach the calculator. Please try again shortly.'
          : cause.message)
    } finally {
      clearTimeout(timeout)
      if (requestRef.current === controller) setLoading(false)
    }
  }

  useEffect(() => {
    calculate(initialForm, 'TFSA')
    return () => {
      requestRef.current?.abort()
      requestRef.current = null
    }
  }, [])

  const chartData = { labels: projection?.labels ?? [], datasets: [
    { label: 'TFSA', data: projection?.tfsa.values ?? [], borderColor: '#159f86', backgroundColor: 'rgba(21, 159, 134, 0.07)', fill: true, tension: 0.35, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 4 },
    { label: 'Taxable', data: projection?.taxable.values ?? [], borderColor: '#94a3b8', backgroundColor: 'transparent', tension: 0.35, borderWidth: 1.5, borderDash: [5, 5], pointRadius: 0, pointHoverRadius: 4 },
  ] }
  const chartOptions = {
    responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { position: 'top', align: 'end', labels: { color: '#64748b', boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', font: { size: 12, weight: '500' } } },
      tooltip: { backgroundColor: '#0f172a', padding: 11, titleColor: '#cbd5e1', bodyColor: '#fff', displayColors: false, callbacks: { label: (item) => `${item.dataset.label}: ${currency.format(item.parsed.y)}` } },
    },
    scales: {
      x: { border: { display: false }, grid: { display: false }, ticks: { color: '#94a3b8', maxTicksLimit: 6, font: { size: 11 } } },
      y: { border: { display: false }, grid: { color: 'rgba(15, 23, 42, .07)' }, ticks: { color: '#94a3b8', maxTicksLimit: 5, font: { size: 11 }, callback: (value) => `$${Math.round(value / 1000)}k` } },
    },
  }
  const selectedDescription = !projection ? '' : projection.account === 'Taxable'
    ? `${projection.taxableRate.toFixed(1)}% effective annual return after tax drag`
    : `${projection.nominalRate.toFixed(1)}% annual return · ${projection.account === 'TFSA' ? 'tax-free' : 'tax-deferred'}`

  return <main className="min-h-screen bg-[#fcfcfb] px-5 py-7 text-slate-900 sm:px-8 lg:px-12 lg:py-10">
    <div className="mx-auto max-w-7xl">
      <header className="flex items-center justify-between border-b border-slate-200 pb-5">
        <a href="/" className="text-lg font-semibold tracking-tight text-slate-950">CompoundCA</a>
        <span className="text-xs text-slate-500">Canadian investing calculator</span>
      </header>
      <div className="py-10 sm:py-14">
        <p className="text-sm font-medium text-slate-500">Compound interest, made simple</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl">Build a clearer picture of your future.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">Estimate how your savings can grow with monthly investing and Canadian account options.</p>
      </div>
      <div className="grid border-y border-slate-200 lg:grid-cols-[330px_minmax(0,1fr)]">
        <form onSubmit={(event) => { event.preventDefault(); calculate(form, account) }} className="border-b border-slate-200 py-8 pr-0 lg:border-b-0 lg:border-r lg:py-10 lg:pr-12">
          <h2 className="text-base font-semibold text-slate-950">Your plan</h2><p className="mt-1 text-sm text-slate-500">Amounts are in Canadian dollars.</p>
          <div className="mt-8 space-y-6"><Input label="Starting amount" before="$" step="1" max="1000000000" value={form.starting} onChange={update('starting')} /><Input label="Monthly contribution" before="$" step="1" max="1000000" value={form.monthly} onChange={update('monthly')} /><Input label="Annual return" after="%" step="0.1" max="100" value={form.rate} onChange={update('rate')} note="Taxable accounts use a 2% estimated tax drag." /><Input label="Time horizon" after="years" step="1" max="100" value={form.years} onChange={update('years')} /></div>
          <fieldset className="mt-8"><legend className="text-sm font-medium text-slate-700">Account type</legend><div className="mt-3 flex gap-4">{accountTypes.map((type) => <label key={type} className="flex cursor-pointer items-center gap-2 text-sm text-slate-600"><input type="radio" name="account" value={type} checked={account === type} onChange={() => setAccount(type)} className="h-4 w-4 accent-slate-900" />{type}</label>)}</div></fieldset>
          <button type="submit" disabled={loading} className="mt-9 w-full rounded-lg bg-[#159f86] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#108b75] focus:outline-none focus:ring-2 focus:ring-[#159f86] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60">{loading ? 'Calculating…' : 'Calculate'}</button>
        </form>
        <section aria-busy={loading} className="min-w-0 py-8 lg:py-10 lg:pl-12">
          {error && <p role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}{projection && ' Your previous projection is shown below.'}</p>}
          {loading && <p role="status" className="mb-6 text-sm text-slate-500">Calculating your projection…</p>}
          {!projection && !loading && <p className="text-sm text-slate-500">Select Calculate to try again.</p>}
          {projection && <>
          <div className="flex flex-wrap items-baseline justify-between gap-2"><div><h2 className="text-base font-semibold text-slate-950">Your projection</h2><p className="mt-1 text-sm text-slate-500">{selectedDescription}</p></div><p className="text-sm text-slate-500">{projection.account}</p></div>
          <div className="mt-9 grid gap-8 border-b border-slate-200 pb-8 sm:grid-cols-3"><Metric label="Final value" value={currency.format(projection.selected.value)} detail={`After ${projection.years} years`} /><Metric label="Total contributed" value={currency.format(projection.selected.contributed)} /><Metric label="Interest earned" value={currency.format(Math.max(0, projection.selected.value - projection.selected.contributed))} /></div>
          <div className="pt-8"><h3 className="font-semibold text-slate-950">TFSA vs. taxable</h3><p className="mt-1 text-sm text-slate-500">Tax drag has a larger effect over time.</p><div className="mt-5 h-[300px] sm:h-[360px]"><Line data={chartData} options={chartOptions} /></div></div>
          </>}
        </section>
      </div>
      <footer className="flex flex-col gap-2 py-6 text-xs text-slate-500 sm:flex-row sm:justify-between"><span>For educational purposes only. Not financial advice.</span><span>Monthly compounding · CAD</span></footer>
    </div>
  </main>
}
