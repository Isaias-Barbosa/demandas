'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ClipboardList,
  Clock,
  Loader,
  CheckCircle2,
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
import { createClient } from '@/lib/supabase/client';
import { Demanda, DemandaStatus } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

const STATUS_COLORS_MAP: Record<DemandaStatus, string> = {
  'Pendente': '#f59e0b',
  'Em Andamento': '#3b82f6',
  'Concluída': '#10b981',
  'Cancelada': '#ef4444',
};

const BRAND_COLOR = '#003641';

export default function DashboardPage() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchDemandas();
  }, []);

  async function fetchDemandas() {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('demandas')
        .select('*')
        .eq('user_id', user.id)
        .order('data_criacao', { ascending: true });

      if (error) {
        console.error('Erro ao buscar demandas:', error);
        return;
      }

      setDemandas((data as Demanda[]) || []);
    } catch (err) {
      console.error('Falha ao carregar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const demandasCorretivas = demandas.filter((d) => !d.tipo || d.tipo === 'corretivas');
  const demandasCorretivasEvolutivas = demandas.filter(
    (d) => !d.tipo || d.tipo === 'corretivas' || d.tipo === 'evolutivas'
  );
  const demandasParaGraficoStatus = demandas.filter((d) =>
    ['corretivas', 'evolutivas', 'gdm-stis'].includes(d.tipo)
  );

  // Estatísticas dos cards
  const totalDemandas = demandasCorretivasEvolutivas.length;
  const pendentesCount = demandasCorretivas.filter((d) => d.status === 'Pendente').length;
  const emAndamentoCount = demandasCorretivas.filter((d) => d.status === 'Em Andamento').length;
  const concluidasCount = demandasCorretivas.filter((d) => d.status === 'Concluída').length;

  // 1. Dados para PieChart (Demandas por Status)
  const statusCounts: Record<DemandaStatus, number> = {
    'Pendente': 0,
    'Em Andamento': 0,
    'Concluída': 0,
    'Cancelada': 0,
  };
  demandasParaGraficoStatus.forEach((d) => {
    if (statusCounts[d.status] !== undefined) {
      statusCounts[d.status]++;
    }
  });

  const pieData = (Object.keys(statusCounts) as DemandaStatus[])
    .map((status) => ({
      name: status,
      value: statusCounts[status],
      color: STATUS_COLORS_MAP[status],
    }))
    .filter((item) => item.value > 0);

  // 2. Dados para BarCharts (Demandas por Responsável), separados por categoria
  const getResponsavelData = (items: Demanda[]) => {
    const responsavelMap: Record<string, number> = {};
    items.forEach((d) => {
      const nome = d.responsavel?.trim() || 'Não Atribuído';
      responsavelMap[nome] = (responsavelMap[nome] || 0) + 1;
    });

    return Object.entries(responsavelMap)
      .map(([nome, total]) => ({ responsavel: nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  };

  const getEvolutivasResponsavelData = (items: Demanda[]) => {
    const responsavelMap = new Map<string, { responsavel: string; total: number }>();

    items.forEach((demanda) => {
      Object.entries(demanda.dados || {}).forEach(([column, value]) => {
        const normalizedColumn = column
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        if (!normalizedColumn.includes('analista') && !normalizedColumn.includes('desenvolvedor')) {
          return;
        }

        const nome = String(value ?? '').trim();
        if (!nome) return;

        const key = nome.toLocaleLowerCase('pt-BR');
        const current = responsavelMap.get(key);
        responsavelMap.set(key, {
          responsavel: current?.responsavel || nome,
          total: (current?.total || 0) + 1,
        });
      });
    });

    return Array.from(responsavelMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  };

  const responsavelCharts = [
    { title: 'Corretivas', data: getResponsavelData(demandasCorretivas) },
    {
      title: 'Evolutivas',
      data: getEvolutivasResponsavelData(demandas.filter((d) => d.tipo === 'evolutivas')),
    },
  ];

  // 3. Dados para AreaChart (Evolução Mensal)
  const monthlyMap: Record<string, number> = {};
  demandas.forEach((d) => {
    if (!d.data_criacao) return;
    try {
      const monthKey = d.data_criacao.substring(0, 7); // 'YYYY-MM'
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + 1;
    } catch {
      // Ignorar data inválida
    }
  });

  const areaData = Object.keys(monthlyMap)
    .sort()
    .map((monthKey) => {
      let formattedMonth = monthKey;
      try {
        const dateObj = parseISO(`${monthKey}-01`);
        formattedMonth = format(dateObj, 'MMM/yy', { locale: ptBR });
        formattedMonth =
          formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1);
      } catch {
        formattedMonth = monthKey;
      }
      return {
        mes: formattedMonth,
        rawMonth: monthKey,
        total: monthlyMap[monthKey],
      };
    });

  if (loading || !isMounted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visão geral e métricas das suas demandas
          </p>
        </div>

        {/* Skeleton Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-8 w-16 bg-gray-200 rounded" />
                  </div>
                  <div className="h-12 w-12 rounded-full bg-gray-200" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Skeleton Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-5 w-40 bg-gray-200 rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-[280px] bg-gray-100 rounded-lg" />
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-5 w-48 bg-gray-200 rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-[280px] bg-gray-100 rounded-lg" />
            </CardContent>
          </Card>
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-5 w-44 bg-gray-200 rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-[280px] bg-gray-100 rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visão geral e métricas das suas demandas
          </p>
        </div>
      </div>

      {/* Grid de 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total de Demandas */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total de Demandas</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totalDemandas}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                <ClipboardList className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pendentes */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pendentes</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{pendentesCount}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Em Andamento */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Em Andamento</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{emAndamentoCount}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Loader className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Concluídas */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Concluídas</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{concluidasCount}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Demandas por Status */}
      <div>
        {/* Gráfico 1: PieChart - Demandas por Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-brand-500" />
              Demandas por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
                Nenhuma demanda cadastrada para exibir.
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
                        `${value} demandas`,
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

      {/* Gráficos de Demandas por Responsável, separados por categoria */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {responsavelCharts.map(({ title, data }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-brand-500" />
                Demandas por Responsável — {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
                  Nenhuma demanda de {title.toLowerCase()} cadastrada para exibir.
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
                        formatter={(value: number) => [`${value} demandas`, 'Total']}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e5e7eb',
                          borderRadius: '0.5rem',
                          fontSize: '12px',
                        }}
                      />
                      <Bar
                        dataKey="total"
                        name="Demandas"
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
            Evolução Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {areaData.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">
              Nenhum dado mensal disponível para exibir.
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
                    formatter={(value: number) => [`${value} demandas`, 'Total']}
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
                    name="Demandas Criadas"
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
