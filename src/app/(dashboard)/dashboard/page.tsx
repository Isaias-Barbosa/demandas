'use client';
import { JiraRdms, JiraSnapshot } from '@/components/JiraRdms';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

const CHART_COLORS = ['#003641', '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

const BRAND_COLOR = '#003641';

export default function DashboardPage() {
  const [jiraData, setJiraData] = useState<JiraSnapshot>({ rdms: [], loading: true, connected: false, error: '' });

  // Os gráficos abaixo dos cards usam exclusivamente o mesmo resultado do Jira.
  const rdms = jiraData.loading || jiraData.error || !jiraData.connected ? [] : jiraData.rdms;
  const chartMessage = jiraData.loading ? 'Consultando RDMs no Jira…'
    : jiraData.error ? 'Não foi possível carregar as RDMs. Tente novamente acima.'
    : !jiraData.connected ? 'Conecte sua conta Jira no perfil para exibir os gráficos.'
    : 'Nenhuma RDM encontrada para exibir.';
  const statusCounts = new Map<string, number>();
  rdms.forEach(r => statusCounts.set(r.status, (statusCounts.get(r.status) || 0) + 1));
  const pieData = Array.from(statusCounts, ([name, value], index) => ({
    name, value, color: CHART_COLORS[index % CHART_COLORS.length],
  }));
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const getResponsavelData = (items: Rdm[]) => {
    const counts = new Map<string, number>();
    items.forEach(r => {
      const name = r.assignee?.trim() || 'Não atribuído';
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts, ([responsavel, total]) => ({ responsavel, total }))
      .sort((a, b) => b.total - a.total).slice(0, 8);
  };
  const responsavelCharts = [
    { title: 'Corretivas', data: getResponsavelData(rdms.filter(r => normalize(r.classification).includes('corretiva'))) },
    { title: 'Evolutivas', data: getResponsavelData(rdms.filter(r => normalize(r.classification).includes('evolutiva'))) },
  ];
  const monthlyMap = new Map<string, number>();
  rdms.forEach(r => {
    if (!/^\d{4}-\d{2}-\d{2}T/.test(r.created) || Number.isNaN(Date.parse(r.created))) return;
    const month = r.created.slice(0, 7);
    monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
  });
  const areaData = Array.from(monthlyMap.keys()).sort().map(month => ({
    mes: format(parseISO(month + '-01'), 'MMM/yy', { locale: ptBR }),
    total: monthlyMap.get(month)!,
  }));

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visão geral e métricas das suas RDMs
          </p>
        </div>
      </div>

      <JiraRdms summaryOnly onSnapshot={setJiraData} />

      {/* Gráfico de RDMs por Status */}
      <div>
        {/* Gráfico 1: PieChart - RDMs por Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-brand-500" />
              RDMs por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
                {chartMessage}
              </div>
            ) : (
              <div className="h-[300px] w-full">
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
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value} RDMs`,
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e5e7eb',
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Gráficos de RDMs por Responsável, separados por categoria */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {responsavelCharts.map(({ title, data }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-brand-500" />
                RDMs por Responsável — {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
                  {jiraData.loading || jiraData.error || !jiraData.connected ? chartMessage : `Nenhuma RDM ${title.toLowerCase()} encontrada. Verifique a classificação configurada no perfil.`}
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
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
                          borderColor: '#e5e7eb',
                          borderRadius: '0.5rem',
                          fontSize: '12px',
                        }}
                      />
                      <Bar
                        dataKey="total"
                        name="RDMs"
                        fill={BRAND_COLOR}
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfico 3: AreaChart - Evolução Mensal (largura total) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-500" />
            Evolução Mensal das RDMs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {areaData.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">
              {chartMessage}
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={areaData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BRAND_COLOR} stopOpacity={0.6} />
                      <stop offset="95%" stopColor={BRAND_COLOR} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value} RDMs`, 'Total']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
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
