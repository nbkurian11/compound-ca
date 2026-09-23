const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

export async function fetchProjection(form, account, signal) {
  const response = await fetch(`${baseUrl}/api/projections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      starting: Number(form.starting),
      monthly: Number(form.monthly),
      rate: Number(form.rate),
      years: Number(form.years),
      account,
    }),
  })

  if (!response.ok) {
    const problem = await response.json().catch(() => null)
    const validationMessages = Object.values(problem?.errors ?? {}).flat().join(' ')
    throw new Error(validationMessages || problem?.detail || 'Unable to calculate your projection. Please try again.')
  }

  return response.json()
}
