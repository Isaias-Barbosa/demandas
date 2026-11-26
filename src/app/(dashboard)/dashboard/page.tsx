'use client';
import { JiraRdms, JiraSnapshot } from '@/components/JiraRdms';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  ChartNoAxesCombined,
  Inbox,
  type LucideIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { Rdm } from '@/lib/jira/model';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

const CHART_COLORS = ['#0b4650', '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
const BRAND_COLOR = '#0b4650';

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <Inbox className="h-5 w-5" />
      </span>
      <p className="max-w-sm text-sm text-slate-500">{message}</p>
    </div>
  );
}

function ChartHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <CardHeader className="flex-row items-start gap-3 space-y-0 border-b border-slate-100">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
    </CardHeader>
  );
}

export default function DashboardPage() {
  const [jiraData, setJiraData] = useState<JiraSnapshot>({
    rdms: [],
    loading: true,
    connected: false,
    error: '',
  });

  // Os gráficos abaixo dos cards usam exclusivamente o mesmo resultado do Jira.
  const rdms = jiraData.loading || jiraData.error || !jiraData.connected ? [] : jiraData.rdms;
  const chartMessage = jiraData.loading
    ? 'Consultando RDMs no Jira…'
    : jiraData.error
      ? 'Não foi possível carregar as RDMs. Tente novamente acima.'
      : !jiraData.connected
        ? 'Conecte sua conta Jira no perfil para exibir os gráficos.'
        : 'Nenhuma RDM encontrada para exibir.';
  const statusCounts = new Map<string, number>();
  rdms.forEach((r) => statusCounts.set(r.status, (statusCounts.get(r.status) || 0) + 1));
  const pieData = Array.from(statusCounts, ([name, value], index) => ({
    name,
    value,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));
  const normalize = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const getResponsavelData = (items: Rdm[]) => {
    const counts = new Map<string, number>();
    items.forEach((r) => {
      const name = r.assignee?.trim() || 'Não atribuído';
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts, ([responsavel, total]) => ({ responsavel, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  };
  const responsavelCharts = [
    {
      title: 'Corretivas',
      data: getResponsavelData(rdms.filter((r) => normalize(r.classification).includes('corretiva'))),
    },
    {
      title: 'Evolutivas',
      data: getResponsavelData(rdms.filter((r) => normalize(r.classification).includes('evolutiva'))),
    },
  ];
  const monthlyMap = new Map<string, number>();
  rdms.forEach((r) => {
    if (!/^\d{4}-\d{2}-\d{2}T/.test(r.created) || Number.isNaN(Date.parse(r.created))) return;
    const month = r.created.slice(0, 7);
    monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
  });
  const areaData = Array.from(monthlyMap.keys())
    .sort()
    .map((month) => ({
      mes: format(parseISO(month + '-01'), 'MMM/yy', { locale: ptBR }),
      total: monthlyMap.get(month)!,
    }));

  return (
    <div className="space-y-7">
      <div>
        <p className="page-eyebrow">Visão geral</p>
        <h1 className="page-title">Seu painel de RDMs</h1>
        <p className="page-subtitle">
          Indicadores das mudanças atribuídas, acompanhadas ou relatadas por você no Jira.
        </p>
      </div>

      <JiraRdms summaryOnly onSnapshot={setJiraData} />

      <Card>
        <ChartHeading
          icon={PieChartIcon}
          title="RDMs por status"
          description="Distribuição dos tickets conforme o status atual do Jira"
        />
        <CardContent>
          {pieData.length === 0 ? (
            <ChartEmpty message={chartMessage} />
          ) : (
            <div className="h-[300px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={45}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value} RDMs`, name]}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      boxShadow: '0 12px 30px -18px rgba(0,54,65,0.5)',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {responsavelCharts.map(({ title, data }) => (
          <Card key={title}>
            <ChartHeading
              icon={BarChart3}
              title={`Responsáveis — ${title}`}
              description="Quem está com a maior carga de trabalho"
            />
            <CardContent>
              {data.length === 0 ? (
                <ChartEmpty
                  message={
                    jiraData.loading || jiraData.error || !jiraData.connected
                      ? chartMessage
                      : `Nenhuma RDM ${title.toLowerCase()} encontrada. Verifique a classificação configurada no perfil.`
                  }
                />
              ) : (
                <div className="h-[300px] w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis
                        dataKey="responsavel"
                        type="category"
                        width={110}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value} RDMs`, 'Total']}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          boxShadow: '0 12px 30px -18px rgba(0,54,65,0.5)',
                        }}
                      />
                      <Bar dataKey="total" name="RDMs" fill={BRAND_COLOR} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <ChartHeading
          icon={ChartNoAxesCombined}
          title="Evolução mensal"
          description="Volume de RDMs criadas mês a mês"
        />
        <CardContent>
          {areaData.length === 0 ? (
            <ChartEmpty message={chartMessage} />
          ) : (
            <div className="h-[280px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BRAND_COLOR} stopOpacity={0.6} />
                      <stop offset="95%" stopColor={BRAND_COLOR} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value} RDMs`, 'Total']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      boxShadow: '0 12px 30px -18px rgba(0,54,65,0.5)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="RDMs Criadas"
                    stroke={BRAND_COLOR}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#brandGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
