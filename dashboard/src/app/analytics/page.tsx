"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { DollarSign, Clock, ShieldAlert, TrendingUp } from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"
import { StatCard } from "@/components/dashboard/stat-card"
import { Badge } from "@/components/ui/badge"

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
}

// Mock Data for the Business Judges (gotta get that ROI right)
const utilizationData = [
  { name: "Ender 3 Pro", Uptime: 85, Downtime: 15 },
  { name: "CNC Router", Uptime: 62, Downtime: 38 },
  { name: "Laser Cutter", Uptime: 45, Downtime: 55 },
]

const failureData = [
  { name: "Bed Adhesion Loss", value: 45 },
  { name: "Spaghetti Monster", value: 25 },
  { name: "Exhaust Fan Off", value: 15 },
  { name: "Filament Jam", value: 10 },
  { name: "Other", value: 5 },
]

const COLORS = ["#f04438", "#f5a623", "#06b6d4", "#6366f1", "#7a8294"]

export default function AnalyticsPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
           <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
             Analytics & ROI
           </h1>
           <Badge variant="premium" className="px-3 py-1 text-xs">
             Business View 📈
           </Badge>
        </div>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Datadog for fabrication. Show this to the judges to prove value.
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Material Saved"
          value="$432.50"
          icon={DollarSign}
          trend="up"
          change="+$125 this week"
          color="var(--color-success)"
          index={0}
        />
        <StatCard
          title="Avg Machine Uptime"
          value="64%"
          icon={TrendingUp}
          trend="up"
          change="+5% vs last month"
          color="var(--color-primary)"
          index={1}
        />
        <StatCard
          title="Failures Caught"
          value="127"
          icon={ShieldAlert}
          trend="up"
          change="12 prevented fires lol"
          color="var(--color-warning)"
          index={2}
        />
        <StatCard
          title="Avg Response Time"
          value="1.2s"
          icon={Clock}
          trend="down"
          change="-0.5s faster"
          color="var(--color-accent)"
          index={3}
        />
      </motion.div>

      {/* Charts Grid */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        
        {/* Machine Utilization Grid */}
        <motion.div variants={itemVariants} className="glass-card flex flex-col rounded-2xl p-6 min-h-[400px]">
          <h3 className="mb-6 text-sm font-semibold uppercase tracking-wider text-[var(--color-foreground)] flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            Machine Utilization Grid
          </h3>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={utilizationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => \`\${val}%\`} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-card-border)', borderRadius: '12px' }}
                  itemStyle={{ color: 'var(--color-foreground)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: 'var(--color-muted-foreground)' }} />
                <Bar dataKey="Uptime" stackId="a" fill="var(--color-primary)" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Downtime" stackId="a" fill="var(--color-destructive-muted)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Common Failure Breakdown */}
        <motion.div variants={itemVariants} className="glass-card flex flex-col rounded-2xl p-6 min-h-[400px]">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-foreground)] flex items-center gap-2">
            <ShieldAlert className="size-4 text-destructive" />
            Common Failure Breakdown
          </h3>
          <p className="text-xs text-[var(--color-muted-foreground)] mb-6">What usually breaks (so we can fix it)</p>
          <div className="flex-1 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={failureData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {failureData.map((entry, index) => (
                    <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-card-border)', borderRadius: '12px' }}
                  itemStyle={{ color: 'var(--color-foreground)' }}
                />
                <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </motion.div>
    </motion.div>
  )
}
