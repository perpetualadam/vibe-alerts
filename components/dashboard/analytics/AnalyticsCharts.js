'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#38bdf8', '#a78bfa', '#fb7185', '#94a3b8'];

const tooltipStyle = {
  backgroundColor: '#12121a',
  border: '1px solid #1e1e2e',
  borderRadius: 8,
  fontSize: 12,
};

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <section className={`glass rounded-xl p-4 sm:p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-vibe-muted mt-1">{subtitle}</p>}
      </div>
      <div className="h-64 sm:h-72 w-full">{children}</div>
    </section>
  );
}

export function DailyUsageChart({ data = [] }) {
  return (
    <ChartCard title="Daily Usage" subtitle="Webhooks and notification outcomes per day">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="webhooksFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1e1e2e" strokeDasharray="3 3" />
          <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 11 }} minTickGap={24} />
          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} allowDecimals={false} width={36} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
          <Area
            type="monotone"
            dataKey="webhooks"
            name="Webhooks"
            stroke="#6366f1"
            fill="url(#webhooksFill)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="sent"
            name="Sent"
            stroke="#22c55e"
            fill="transparent"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="failed"
            name="Failed"
            stroke="#ef4444"
            fill="transparent"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function MonthlyUsageChart({ data = [] }) {
  return (
    <ChartCard title="Monthly Usage" subtitle="Aggregated volume by month">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="#1e1e2e" strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} />
          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} allowDecimals={false} width={36} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="webhooks" name="Webhooks" fill="#6366f1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="sent" name="Sent" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TopSourcesChart({ data = [] }) {
  const chartData = data.map((d) => ({
    name: d.source,
    value: d.count,
  }));

  return (
    <ChartCard title="Most Active Sources" subtitle="Inbound platforms by volume">
      {chartData.length === 0 ? (
        <EmptyChart />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="45%"
              outerRadius="75%"
              paddingAngle={2}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function ChannelBreakdownChart({ data = [] }) {
  return (
    <ChartCard title="Top Notification Channel" subtitle="Deliveries by provider">
      {data.length === 0 ? (
        <EmptyChart />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
            <CartesianGrid stroke="#1e1e2e" strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="provider"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              width={88}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="sent" name="Sent" fill="#22c55e" radius={[0, 4, 4, 0]} />
            <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function SpamDailyChart({ data = [] }) {
  return (
    <ChartCard title="AI Spam Detection" subtitle="Scanned vs flagged submissions per day">
      {data.length === 0 ? (
        <EmptyChart />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid stroke="#1e1e2e" strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 11 }} minTickGap={24} />
            <YAxis tick={{ fill: '#71717a', fontSize: 11 }} allowDecimals={false} width={36} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="scanned"
              name="Scanned"
              stroke="#38bdf8"
              fill="#38bdf833"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="flagged"
              name="Flagged"
              stroke="#f59e0b"
              fill="#f59e0b33"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function EmptyChart() {
  return (
    <div className="h-full flex items-center justify-center text-sm text-vibe-muted">
      No data for this range
    </div>
  );
}
