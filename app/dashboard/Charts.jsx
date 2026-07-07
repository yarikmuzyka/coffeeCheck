'use client'

import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

export function SpendChart({ data }) {
  if (!data || data.length === 0) return <p className="empty">Немає даних про витрати.</p>
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e6ddd2" />
        <XAxis dataKey="month" fontSize={12} stroke="#8a7d70" />
        <YAxis fontSize={12} stroke="#8a7d70" />
        <Tooltip formatter={(v) => [`${v} ₴`, 'Витрати']} />
        <Bar dataKey="spend" fill="#7b4b2a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ScoreChart({ data }) {
  if (!data || data.length === 0) return <p className="empty">Немає оцінених заварювань.</p>
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e6ddd2" />
        <XAxis dataKey="month" fontSize={12} stroke="#8a7d70" />
        <YAxis domain={[0, 10]} fontSize={12} stroke="#8a7d70" />
        <Tooltip formatter={(v) => [v, 'Середня оцінка']} />
        <Line type="monotone" dataKey="score" stroke="#a8703f" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
