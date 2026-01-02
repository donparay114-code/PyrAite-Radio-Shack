"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Music,
  Radio,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  Server,
  Activity,
} from "lucide-react";
import { GlassCard, Badge, Progress } from "@/components/ui";
import { cn, formatNumber } from "@/lib/utils";
import { useAdminStats } from "@/hooks";

// Mock admin data
const mockStats = {
  total_users: 2847,
  total_songs: 1523,
  total_requests: 4892,
  active_queue: 12,
  daily_requests: 89,
  api_costs: {
    suno: 45.20,
    openai: 12.50,
    total: 57.70,
  },
};

const mockSystemHealth = {
  api: { status: "healthy", latency: 45 },
  database: { status: "healthy", latency: 12 },
  redis: { status: "healthy", latency: 2 },
  suno: { status: "healthy", latency: 1200 },
  liquidsoap: { status: "healthy", uptime: "99.9%" },
  icecast: { status: "healthy", listeners: 1234 },
};

const mockRecentActivity = [
  { type: "request", user: "DJ Master", action: "Submitted song request", time: "2m ago" },
  { type: "generation", song: "Neon Dreams", status: "completed", time: "5m ago" },
  { type: "broadcast", song: "Summer Vibes", status: "started", time: "8m ago" },
  { type: "moderation", user: "spammer123", action: "Request rejected", time: "12m ago" },
  { type: "vote", user: "Lofi Lover", action: "Upvoted 'Chill Beats'", time: "15m ago" },
];

export default function AdminDashboard() {
  // In production:
  // const { data: stats, isLoading } = useAdminStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <LayoutDashboard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-sm text-text-muted">System overview and management</p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Users className="w-5 h-5" />}
          label="Total Users"
          value={formatNumber(mockStats.total_users)}
          change="+12%"
          positive
        />
        <MetricCard
          icon={<Music className="w-5 h-5" />}
          label="Songs Generated"
          value={formatNumber(mockStats.total_songs)}
          change="+8%"
          positive
        />
        <MetricCard
          icon={<Radio className="w-5 h-5" />}
          label="Active Queue"
          value={mockStats.active_queue.toString()}
          sublabel="requests"
        />
        <MetricCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Today's Costs"
          value={`$${mockStats.api_costs.total.toFixed(2)}`}
          change="-5%"
          positive
        />
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* System health */}
        <GlassCard className="lg:col-span-2 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-violet-400" />
            System Health
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(mockSystemHealth).map(([name, data]) => (
              <HealthCard key={name} name={name} data={data} />
            ))}
          </div>
        </GlassCard>

        {/* Cost breakdown */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            API Costs (MTD)
          </h2>

          <div className="space-y-4">
            <CostItem
              name="Suno API"
              amount={mockStats.api_costs.suno}
              budget={100}
              color="#8b5cf6"
            />
            <CostItem
              name="OpenAI"
              amount={mockStats.api_costs.openai}
              budget={50}
              color="#06b6d4"
            />
            <div className="pt-4 border-t border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Total</span>
                <span className="text-xl font-bold text-white">
                  ${mockStats.api_costs.total.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Budget: $150/month
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Activity and queue */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Recent Activity
          </h2>

          <div className="space-y-3">
            {mockRecentActivity.map((activity, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <ActivityIcon type={activity.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {activity.user && <span className="font-medium">{activity.user}</span>}
                    {activity.song && <span className="font-medium">{activity.song}</span>}
                    {" "}
                    {activity.action || activity.status}
                  </p>
                </div>
                <span className="text-xs text-text-muted">{activity.time}</span>
              </motion.div>
            ))}
          </div>
        </GlassCard>

        {/* Quick stats */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-400" />
            Today's Stats
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-3xl font-bold text-white">{mockStats.daily_requests}</p>
              <p className="text-sm text-text-muted">Requests</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-3xl font-bold text-green-400">94%</p>
              <p className="text-sm text-text-muted">Success Rate</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-3xl font-bold text-violet-400">1,234</p>
              <p className="text-sm text-text-muted">Peak Listeners</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-3xl font-bold text-cyan-400">2.3m</p>
              <p className="text-sm text-text-muted">Avg Wait Time</p>
            </div>
          </div>

          {/* Hourly chart placeholder */}
          <div className="mt-6">
            <p className="text-sm text-text-muted mb-2">Requests (24h)</p>
            <div className="flex items-end gap-1 h-20">
              {Array.from({ length: 24 }, (_, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${20 + Math.random() * 80}%` }}
                  transition={{ delay: i * 0.02 }}
                  className="flex-1 bg-gradient-to-t from-violet-500/50 to-violet-500 rounded-t"
                />
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  sublabel?: string;
}

function MetricCard({ icon, label, value, change, positive, sublabel }: MetricCardProps) {
  return (
    <GlassCard noAnimation className="p-4">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-violet-400">
          {icon}
        </div>
        {change && (
          <Badge variant={positive ? "success" : "danger"} size="sm">
            {change}
          </Badge>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-text-muted">{sublabel || label}</p>
      </div>
    </GlassCard>
  );
}

function HealthCard({ name, data }: { name: string; data: any }) {
  const isHealthy = data.status === "healthy";

  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white capitalize">{name}</span>
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            isHealthy ? "bg-green-500" : "bg-red-500"
          )}
        />
      </div>
      <p className="text-xs text-text-muted">
        {data.latency && `${data.latency}ms`}
        {data.uptime && `Uptime: ${data.uptime}`}
        {data.listeners && `${data.listeners} listeners`}
      </p>
    </div>
  );
}

function CostItem({
  name,
  amount,
  budget,
  color,
}: {
  name: string;
  amount: number;
  budget: number;
  color: string;
}) {
  const percentage = (amount / budget) * 100;

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-white">{name}</span>
        <span className="text-sm font-medium text-white">${amount.toFixed(2)}</span>
      </div>
      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <p className="text-xs text-text-muted mt-1">
        ${budget - amount > 0 ? (budget - amount).toFixed(2) : 0} remaining
      </p>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    request: <Music className="w-4 h-4 text-violet-400" />,
    generation: <Zap className="w-4 h-4 text-yellow-400" />,
    broadcast: <Radio className="w-4 h-4 text-red-400" />,
    moderation: <AlertTriangle className="w-4 h-4 text-orange-400" />,
    vote: <TrendingUp className="w-4 h-4 text-green-400" />,
  };

  return (
    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
      {icons[type] || <Clock className="w-4 h-4 text-text-muted" />}
    </div>
  );
}
