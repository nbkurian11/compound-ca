import { useEffect, useRef, useState } from 'react'
import { Chart as ChartJS, CategoryScale, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { fetchProjection } from './api'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const accountTypes = ['TFSA', 'RRSP', 'Taxable']
const currency = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })

const initialForm = { starting: '10000', monthly: '500', rate: '7', years: '20' }

function formatCurrencyInput(value) {
  if (value === '') return ''
  const [whole, decimal] = String(value).split('.')
  const formattedWhole = Number(whole || 0).toLocaleString('en-CA')
  return decimal === undefined ? formattedWhole : `${formattedWhole}.${decimal}`
}

function Input({ label, value, onChange, before, after, note, max, step = 'any', currency: isCurrency = false }) {
  return <label className="block">
    <span className="mb-2 block text-[0.9375rem] font-semibold text-[#1B4332]">{label}</span>
    <div className="flex items-center rounded-xl border border-[#A8A29E]/60 bg-[#fffdf8] px-3.5 py-3 shadow-sm transition focus-within:border-[#52B788] focus-within:ring-4 focus-within:ring-[#52B788]/15">
      {before && <span className="mr-1.5 text-[#527061]">{before}</span>}
      <input type={isCurrency ? 'text' : 'number'} inputMode={isCurrency ? 'decimal' : undefined} required min={isCurrency ? undefined : '0'} max={max} step={step} value={isCurrency ? formatCurrencyInput(value) : value} onChange={(event) => onChange(isCurrency ? event.target.value.replace(/,/g, '') : event.target.value)} className="w-full appearance-none bg-transparent text-base font-semibold text-[#1B4332] outline-none" />
      {after && <span className="ml-2 text-sm text-[#527061]">{after}</span>}
    </div>
    {note && <span className="mt-2 block text-sm leading-5 text-[#527061]">{note}</span>}
  </label>
}

function RangeControl({ label, value, onChange, min, max, step, lowLabel, highLabel }) {
  return <div className="mt-3">
    <input aria-label={label} type="range" min={min} max={max} step={step} value={value || min} onChange={(event) => onChange(event.target.value)} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#A8A29E]/35 accent-[#52B788]" />
    <div className="mt-1 flex justify-between text-xs font-medium text-[#527061]"><span>{lowLabel}</span><span>{highLabel}</span></div>
  </div>
}

function Metric({ label, value, detail, primary = false, resultKey }) {
  return <div key={resultKey} className={primary ? 'sm:col-span-1' : ''}>
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#527061]">{label}</p>
    <p className={`mt-2 tracking-tight text-[#1B4332] motion-safe:animate-[result-in_350ms_ease-out] ${primary ? 'text-3xl font-bold sm:text-4xl' : 'text-2xl font-semibold sm:text-3xl'}`}>{value}</p>
    {detail && <p className="mt-2 text-sm text-[#527061]">{detail}</p>}
  </div>
}

export default function App() {
  const [form, setForm] = useState(initialForm)
  const [account, setAccount] = useState('TFSA')
  const [projection, setProjection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resultKey, setResultKey] = useState(0)
  const [wasUpdated, setWasUpdated] = useState(false)
  const requestRef = useRef(null)
  const update = (key) => (value) => setForm((current) => ({ ...current, [key]: value }))

  async function calculate(formValues, accountType) {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    const timeout = setTimeout(() => controller.abort(), 15000)
    setLoading(true)
    setError('')
    setWasUpdated(false)
    try {
      const result = await fetchProjection(formValues, accountType, controller.signal)
      if (requestRef.current === controller) {
        setProjection(result)
        setResultKey((current) => current + 1)
        setWasUpdated(true)
      }
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
    { label: 'TFSA', data: projection?.tfsa.values ?? [], borderColor: '#52B788', backgroundColor: 'rgba(82, 183, 136, 0.12)', fill: true, tension: 0.35, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 4 },
    { label: 'Taxable', data: projection?.taxable.values ?? [], borderColor: '#A8A29E', backgroundColor: 'transparent', tension: 0.35, borderWidth: 2, borderDash: [5, 5], pointRadius: 0, pointHoverRadius: 4 },
  ] }
  const chartOptions = {
    responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { position: 'top', align: 'end', labels: { color: '#1B4332', boxWidth: 9, boxHeight: 9, usePointStyle: true, pointStyle: 'circle', font: { size: 13, weight: '600' } } },
      tooltip: { backgroundColor: '#1B4332', padding: 12, titleColor: '#E9C46A', bodyColor: '#fffdf8', displayColors: false, callbacks: { title: (items) => items[0]?.label ?? '', label: (item) => `${item.dataset.label}: ${currency.format(item.parsed.y)}` } },
    },
    scales: {
      x: { border: { display: false }, grid: { display: false }, ticks: { color: '#527061', maxTicksLimit: 6, font: { size: 11 } } },
      y: { grace: '5%', beginAtZero: true, border: { display: false }, grid: { color: 'rgba(168, 162, 158, .28)' }, ticks: { color: '#527061', maxTicksLimit: 5, font: { size: 11 }, callback: (value) => value === 0 ? '$0' : `$${Math.round(value / 1000)}k` } },
    },
  }
  const selectedDescription = !projection ? '' : projection.account === 'Taxable'
    ? `${projection.taxableRate.toFixed(1)}% effective annual return after tax drag`
    : `${projection.nominalRate.toFixed(1)}% annual return · ${projection.account === 'TFSA' ? 'tax-free' : 'tax-deferred'}`
  const finalDifference = projection ? Math.max(0, projection.tfsa.value - projection.taxable.value) : 0

  return <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,rgba(82,183,136,0.16),transparent_42%),#FBF7F0] px-5 py-6 text-[#1B4332] sm:px-8 lg:px-12 lg:py-8">
    <div className="mx-auto max-w-7xl">
      <header className="flex items-center justify-between border-b border-[#A8A29E]/55 pb-5">
        <a href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-[#1B4332]"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1B4332] text-sm text-[#FBF7F0]">C</span>CompoundCA</a>
        <span className="hidden text-xs text-[#527061] sm:block">Canadian investing calculator</span>
      </header>
      <div className="py-8 sm:py-10">
        <p className="inline-flex rounded-full border border-[#52B788]/40 bg-[#52B788]/15 px-3 py-1 text-xs font-semibold text-[#1B4332]">Canadian investment planning</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-[#1B4332] sm:text-5xl">Make your money plan feel <span className="text-[#52B788]">possible.</span></h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[#527061]">Explore how consistent investing can add up over time, with a simple view of Canada’s popular account options.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] lg:grid lg:grid-cols-[340px_minmax(0,1fr)]">
        <form onSubmit={(event) => { event.preventDefault(); calculate(form, account) }} className="border-b border-slate-200 bg-slate-50/70 p-6 lg:border-b-0 lg:border-r lg:p-8">
          <div className="flex items-center justify-between"><h2 className="text-base font-semibold text-slate-950">Your plan</h2><span className="text-xs text-slate-500">CAD</span></div><p className="mt-1 text-sm text-slate-500">Start with the numbers you know.</p>
          <div className="mt-8 space-y-6"><Input label="Starting amount" before="$" step="1" max="1000000000" currency value={form.starting} onChange={update('starting')} /><Input label="Monthly contribution" before="$" step="1" max="1000000" currency value={form.monthly} onChange={update('monthly')} /><div><Input label="Annual return" after="%" step="0.1" max="100" value={form.rate} onChange={update('rate')} note="Taxable accounts use a 2% estimated tax drag." /><RangeControl label="Annual return range" min="0" max="100" step="0.1" lowLabel="0%" highLabel="100%" value={Number(form.rate) || 0} onChange={update('rate')} /></div><div><Input label="Time horizon" after="years" step="1" max="100" value={form.years} onChange={update('years')} /><RangeControl label="Time horizon range" min="1" max="100" step="1" lowLabel="1 year" highLabel="100 years" value={Math.max(Number(form.years) || 1, 1)} onChange={update('years')} /></div></div>
          <fieldset className="mt-8"><legend className="text-[0.9375rem] font-semibold text-slate-800">Account type</legend><div className="mt-3 grid grid-cols-3 rounded-xl border border-slate-200 bg-white p-1">{accountTypes.map((type) => <button key={type} type="button" onClick={() => setAccount(type)} className={`min-h-10 rounded-lg px-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#159f86] focus:ring-offset-1 ${account === type ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>{type}</button>)}</div></fieldset>
          <button type="submit" disabled={loading} className="mt-9 w-full rounded-xl bg-[#159f86] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#108b75] focus:outline-none focus:ring-2 focus:ring-[#159f86] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60">{loading ? 'Calculating…' : wasUpdated ? 'Updated' : 'Calculate projection'}</button>
        </form>
        <section aria-busy={loading} className="min-w-0 p-6 lg:p-8">
          {error && <p role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}{projection && ' Your previous projection is shown below.'}</p>}
          {loading && <p role="status" className="mb-6 text-sm text-slate-500">Calculating your projection…</p>}
          {!projection && !loading && <p className="text-sm text-slate-500">Select Calculate to try again.</p>}
          {projection && <>
          <div className="flex flex-wrap items-baseline justify-between gap-2"><div><p className="text-xs font-medium uppercase tracking-[0.12em] text-[#159f86]">Projected outcome</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Your projection</h2><p className="mt-1 text-sm font-medium text-slate-600">{selectedDescription}</p></div><p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{projection.account}</p></div>
          <p className="mt-6 rounded-xl border border-[#159f86]/20 bg-[#159f86]/[0.07] px-4 py-3 text-sm font-medium text-slate-700"><span className="font-semibold text-[#117c69]">Tax advantage:</span> TFSA grows about {currency.format(finalDifference)} more than a taxable account over {projection.years} years.</p>
          <div className="mt-7 grid gap-8 border-y border-slate-200 py-7 sm:grid-cols-3"><Metric primary resultKey={resultKey} label="Final value" value={currency.format(projection.selected.value)} detail={`After ${projection.years} years`} /><Metric resultKey={resultKey} label="Total contributed" value={currency.format(projection.selected.contributed)} /><Metric resultKey={resultKey} label="Interest earned" value={currency.format(Math.max(0, projection.selected.value - projection.selected.contributed))} /></div>
          <div className="pt-8"><h3 className="font-semibold text-slate-950">TFSA vs. taxable</h3><p className="mt-1 text-sm text-slate-500">See how tax drag can affect long-term growth.</p><div className="mt-5 h-[300px] sm:h-[360px]"><Line data={chartData} options={chartOptions} /></div></div>
          </>}
        </section>
      </div>
      <footer className="flex flex-col gap-2 py-7 text-sm text-slate-600 sm:flex-row sm:justify-between"><span>For educational purposes only. Not financial advice.</span><span>Monthly compounding · CAD</span></footer>
    </div>
  </main>
}
