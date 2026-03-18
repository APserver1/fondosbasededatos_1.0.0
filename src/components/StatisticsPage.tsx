import React, { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { Filter, PieChart as PieIcon, BarChart3 as BarIcon, LineChart as LineIcon, CheckSquare, Square } from 'lucide-react';
import { CombinedTransaction } from '../types';
import { incomeCodes } from '../data/constants';

interface StatisticsPageProps {
  data: CombinedTransaction[];
}

const COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];

type CustomChartType = 'pie' | 'bar' | 'line';
type CustomDataType = 'income' | 'expense' | 'comparison';

type CustomChartCategoryDatum = { name: string; value: number; fill?: string };
type CustomChartLineDatum = { name: string; date: string; value: number };
type CustomChartComparisonLineDatum = { name: string; date: string; income: number; expense: number };
type CustomChartDatum = CustomChartCategoryDatum | CustomChartLineDatum | CustomChartComparisonLineDatum;

type ExpandedChartKey = 'incomePie' | 'incomeBars' | 'expenseBars' | 'monthlyLine' | 'custom';

type MonthlyLineTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{ name?: string; value?: number; color?: string; stroke?: string }>;
};

function MonthlyLineTooltip({ active, label, payload }: MonthlyLineTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const sorted = [...payload]
    .filter((p) => typeof p.value === 'number' && Number.isFinite(p.value))
    .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));

  return (
    <div
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.3)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        padding: '10px 12px'
      }}
    >
      {label && <div style={{ color: '#111827', fontWeight: 600, marginBottom: 6 }}>{label}</div>}
      <div style={{ display: 'grid', gap: 6 }}>
        {sorted.map((entry, idx) => {
          const c = entry.color || entry.stroke || '#111827';
          const v = Number(entry.value) || 0;
          return (
            <div key={`${entry.name ?? 'item'}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 9999, backgroundColor: c, display: 'inline-block' }} />
              <span style={{ color: c, fontWeight: 600, flex: '1 1 auto' }}>{entry.name}</span>
              <span style={{ color: '#111827', fontWeight: 600, whiteSpace: 'nowrap' }}>{`L ${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StatisticsPage({ data }: StatisticsPageProps) {
  // Estado para el gráfico personalizable
  const [customChartType, setCustomChartType] = useState<CustomChartType>('bar');
  const [customDataType, setCustomDataType] = useState<CustomDataType>('income');
  const [selectedEstablishments, setSelectedEstablishments] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedChart, setExpandedChart] = useState<ExpandedChartKey | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  // Obtener establecimientos únicos
  const uniqueEstablishments = useMemo(() => {
    return Array.from(new Set(data.map(d => d.establishment?.name).filter(Boolean))) as string[];
  }, [data]);

  const availableYears = useMemo(() => {
    const years = data
      .map(d => Number(d.year))
      .filter((y) => Number.isFinite(y) && y > 0);
    return Array.from(new Set(years)).sort((a, b) => b - a);
  }, [data]);

  // Inicializar establecimientos seleccionados
  useEffect(() => {
    if (uniqueEstablishments.length > 0 && selectedEstablishments.length === 0) {
      setSelectedEstablishments(uniqueEstablishments);
    }
  }, [uniqueEstablishments, selectedEstablishments.length]);

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // Datos procesados para el gráfico personalizable
  const customChartData = useMemo<CustomChartDatum[]>(() => {
    const filtered = data.filter(d => 
      d.establishment?.name && selectedEstablishments.includes(d.establishment.name)
    );

    if (customDataType === 'comparison') {
      if (customChartType === 'line') {
        // Comparativa en el tiempo (mes a mes)
        const grouped = filtered.reduce((acc, curr) => {
          if (!curr.date) return acc;
          const [yearStr, monthStr] = curr.date.split('-');
          if (!yearStr || !monthStr) return acc;
          const key = `${yearStr}-${monthStr}`;
          
          if (!acc[key]) {
            const dateObj = new Date(Number(yearStr), Number(monthStr) - 1, 1);
            const name = dateObj.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
            acc[key] = { name: name.charAt(0).toUpperCase() + name.slice(1), date: key, income: 0, expense: 0 };
          }
          
          if (curr.is_income) acc[key].income += Number(curr.amount);
          else acc[key].expense += Number(curr.amount);
          
          return acc;
        }, {} as Record<string, CustomChartComparisonLineDatum>);
        
        return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
      } else {
        // Comparativa total
        const income = filtered.filter(d => d.is_income).reduce((acc, curr) => acc + curr.amount, 0);
        const expense = filtered.filter(d => !d.is_income).reduce((acc, curr) => acc + curr.amount, 0);
        return [
          { name: 'Ingresos', value: income, fill: '#22c55e' },
          { name: 'Egresos', value: expense, fill: '#f43f5e' }
        ];
      }
    } else {
      const isIncome = customDataType === 'income';
      const items = filtered.filter(d => d.is_income === isIncome);
      
      if (customChartType === 'line') {
         // Evolución temporal de ese tipo
         const grouped = items.reduce((acc, curr) => {
          if (!curr.date) return acc;
          const [yearStr, monthStr] = curr.date.split('-');
          const key = `${yearStr}-${monthStr}`;
          
          if (!acc[key]) {
            const dateObj = new Date(Number(yearStr), Number(monthStr) - 1, 1);
            const name = dateObj.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
            acc[key] = { name: name.charAt(0).toUpperCase() + name.slice(1), date: key, value: 0 };
          }
          acc[key].value += Number(curr.amount);
          return acc;
        }, {} as Record<string, CustomChartLineDatum>);
        return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
      } else {
        // Desglose por categoría (Establecimiento para Ingresos, Código para Egresos)
        const grouped = items.reduce((acc, curr) => {
          const key = isIncome ? (curr.establishment?.name || 'Otros') : (curr.code || 'Otros');
          acc[key] = (acc[key] || 0) + Number(curr.amount);
          return acc;
        }, {} as Record<string, number>);

        return Object.entries(grouped)
          .map(([name, value]) => {
             // Si es egreso, buscar descripción del código
             let displayName = name;
             if (!isIncome) {
                const desc = incomeCodes.find(ic => ic.code === name)?.description;
                if (desc) displayName = desc;
             }
             return { name: displayName, value };
          })
          .sort((a, b) => b.value - a.value);
      }
    }
  }, [data, customDataType, customChartType, selectedEstablishments]);

  const pieChartData = useMemo(() => {
    const establishmentIncome = data
      .filter(item => item.is_income)
      .reduce((acc, curr) => {
        const name = curr.establishment?.name || 'Desconocido';
        acc[name] = (acc[name] || 0) + Number(curr.amount);
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(establishmentIncome)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const monthlyData = useMemo(() => {
    const base = Array.from({ length: 12 }, (_, i) => {
      const dateObj = new Date(selectedYear, i, 1);
      const name = dateObj.toLocaleDateString('es-ES', { month: 'short' });
      return {
        month: i + 1,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        income: 0,
        expense: 0
      };
    });

    data.forEach((curr) => {
      const year = Number(curr.year);
      const month = Number(curr.month);
      if (!Number.isFinite(year) || year !== selectedYear) return;
      if (!Number.isFinite(month) || month < 1 || month > 12) return;

      const amount = Number(curr.amount);
      if (!Number.isFinite(amount)) return;

      if (curr.is_income) base[month - 1].income += amount;
      else base[month - 1].expense += amount;
    });

    return base;
  }, [data, selectedYear]);

  const expensesData = useMemo(() => {
    const grouped = data
      .filter(item => !item.is_income)
      .reduce((acc, curr) => {
        const code = curr.code || 'Sin Código';
        acc[code] = (acc[code] || 0) + Number(curr.amount);
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([code, value]) => {
        const description = incomeCodes.find(ic => ic.code === code)?.description || code;
        return {
          name: description,
          code,
          value
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const totalIncome = useMemo(() => {
    return pieChartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [pieChartData]);

  const isExpandedView = expandedChart !== null;
  const expandedChartTitle = useMemo(() => {
    if (!expandedChart) return '';
    switch (expandedChart) {
      case 'incomePie':
        return 'Ingresos Totales por Establecimiento';
      case 'incomeBars':
        return 'Detalle por Establecimiento';
      case 'expenseBars':
        return 'Egresos por Objeto de Gasto';
      case 'monthlyLine':
        return 'Evolución de Ingresos vs Egresos';
      case 'custom':
        return 'Análisis Personalizado';
    }
  }, [expandedChart]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-blue-700">
            Estadísticas
          </h2>
          <p className="text-gray-500 mt-2">
            {isExpandedView ? `Vista expandida: ${expandedChartTitle}` : 'Análisis visual de los ingresos y datos financieros'}
          </p>
        </div>
        {isExpandedView && (
          <button
            type="button"
            onClick={() => setExpandedChart(null)}
            className="glass-button-secondary px-4 py-2 rounded-xl font-medium print:hidden"
          >
            Volver
          </button>
        )}
      </div>

      <div className={isExpandedView ? 'grid grid-cols-1 gap-6' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}>
        {/* Gráfico de Pastel - Ingresos por Establecimiento */}
        {(!isExpandedView || expandedChart === 'incomePie') && (
          <div
            className={`glass-panel p-6 rounded-2xl flex flex-col relative ${expandedChart === 'incomePie'
              ? 'h-[85vh] min-h-[600px] print:h-[900px]'
              : 'h-[500px]'}`}
          >
            <button
              type="button"
              onClick={() => setExpandedChart(expandedChart === 'incomePie' ? null : 'incomePie')}
              className="glass-button-secondary px-3 py-1.5 rounded-lg text-sm font-medium absolute top-4 right-4 print:hidden"
            >
              {expandedChart === 'incomePie' ? 'Volver' : 'Expandir'}
            </button>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pr-20">
              Ingresos Totales por Establecimiento
            </h3>
            <div className="flex flex-1 min-h-0 gap-6">
            {/* Mitad Izquierda: Gráfico y Total */}
            <div className="w-1/2 flex flex-col">
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        if (percent < 0.05) return null;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                        return (
                          <text 
                            x={x} 
                            y={y} 
                            fill="white" 
                            textAnchor="middle" 
                            dominantBaseline="central" 
                            fontSize={12}
                            fontWeight="bold"
                          >
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                      outerRadius={expandedChart === 'incomePie' ? 200 : 150}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [`L ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name]}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                        backdropFilter: 'blur(8px)',
                        borderRadius: '12px', 
                        border: '1px solid rgba(255,255,255,0.3)', 
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                      }}
                      itemStyle={{ color: '#1e293b' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-center p-3 bg-sky-50 dark:bg-sky-900/20 rounded-xl">
                <span className="text-sm text-gray-500 block">Total Generado</span>
                <span className="text-xl font-bold text-sky-600">L {totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Mitad Derecha: Leyenda Scrollable */}
            <div className={`w-1/2 pr-2 ${expandedChart === 'incomePie' ? 'overflow-visible' : 'overflow-y-auto custom-scrollbar'}`}>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {pieChartData.map((entry, index) => (
                  <div key={`legend-${index}`} className="flex items-center gap-2 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium text-gray-700" title={entry.name}>
                        {entry.name}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        L {entry.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Gráfico de Barras - Ingresos por Establecimiento (Horizontal) */}
        {(!isExpandedView || expandedChart === 'incomeBars') && (
          <div
            className={`glass-panel p-6 rounded-2xl flex flex-col relative ${expandedChart === 'incomeBars'
              ? 'h-auto'
              : 'h-[500px]'}`}
          >
            <button
              type="button"
              onClick={() => setExpandedChart(expandedChart === 'incomeBars' ? null : 'incomeBars')}
              className="glass-button-secondary px-3 py-1.5 rounded-lg text-sm font-medium absolute top-4 right-4 print:hidden"
            >
              {expandedChart === 'incomeBars' ? 'Volver' : 'Expandir'}
            </button>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pr-20">
              Detalle por Establecimiento
            </h3>
            <div className={`flex-1 min-h-0 pr-2 ${expandedChart === 'incomeBars' ? 'overflow-visible' : 'overflow-y-auto custom-scrollbar'}`}>
              <div style={{ height: Math.max(expandedChart === 'incomeBars' ? 700 : 400, pieChartData.length * 50) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={pieChartData}
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.3} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={150} 
                    tick={{ fontSize: 11, fill: '#374151' }} 
                    interval={0}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    formatter={(value: number) => [`L ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Ingresos']}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                      backdropFilter: 'blur(8px)',
                      borderRadius: '12px', 
                      border: '1px solid rgba(255,255,255,0.3)', 
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                    }}
                    itemStyle={{ color: '#1e293b' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                    {pieChartData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        )}

        {/* Gráfico de Barras - Egresos por Objeto de Gasto (Horizontal) */}
        {(!isExpandedView || expandedChart === 'expenseBars') && (
          <div
            className={`glass-panel p-6 rounded-2xl flex flex-col md:col-span-2 relative ${expandedChart === 'expenseBars'
              ? 'h-auto'
              : 'h-[500px]'}`}
          >
            <button
              type="button"
              onClick={() => setExpandedChart(expandedChart === 'expenseBars' ? null : 'expenseBars')}
              className="glass-button-secondary px-3 py-1.5 rounded-lg text-sm font-medium absolute top-4 right-4 print:hidden"
            >
              {expandedChart === 'expenseBars' ? 'Volver' : 'Expandir'}
            </button>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pr-20">
              Egresos por Objeto de Gasto
            </h3>
            <div className={`flex-1 min-h-0 pr-2 ${expandedChart === 'expenseBars' ? 'overflow-visible' : 'overflow-y-auto custom-scrollbar'}`}>
              <div style={{ height: Math.max(expandedChart === 'expenseBars' ? 700 : 400, expensesData.length * 50) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={expensesData}
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.3} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={250} 
                    tick={{ fontSize: 11, fill: '#374151' }} 
                    interval={0}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    formatter={(value: number) => [`L ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Gasto']}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                      backdropFilter: 'blur(8px)',
                      borderRadius: '12px', 
                      border: '1px solid rgba(255,255,255,0.3)', 
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                    }}
                    itemStyle={{ color: '#1e293b' }}
                  />
                  <Bar dataKey="value" fill="#f43f5e" radius={[0, 6, 6, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        )}

        {/* Gráfico de Líneas - Evolución Mensual */}
        {(!isExpandedView || expandedChart === 'monthlyLine') && (
          <div
            className={`glass-panel p-6 rounded-2xl flex flex-col md:col-span-2 relative ${expandedChart === 'monthlyLine'
              ? 'h-[85vh] min-h-[600px] print:h-[900px]'
              : 'h-[500px]'}`}
          >
            <button
              type="button"
              onClick={() => setExpandedChart(expandedChart === 'monthlyLine' ? null : 'monthlyLine')}
              className="glass-button-secondary px-3 py-1.5 rounded-lg text-sm font-medium absolute top-4 right-4 print:hidden"
            >
              {expandedChart === 'monthlyLine' ? 'Volver' : 'Expandir'}
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pr-20">
              <h3 className="text-lg font-semibold text-gray-800">
                Evolución de Ingresos vs Egresos
              </h3>
              {availableYears.length > 0 && (
                <div className="flex items-center gap-2 print:hidden">
                  <span className="text-sm text-gray-600">Año</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-gray-100 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-sky-500 text-gray-800"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlyData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: '#374151' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#374151' }}
                  tickFormatter={(value) => `L ${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                />
                <Tooltip
                  content={<MonthlyLineTooltip />}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  name="Ingresos" 
                  stroke="#22c55e" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="expense" 
                  name="Egresos" 
                  stroke="#f43f5e" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}
      </div>

      {/* Gráfico Personalizable */}
      {(!isExpandedView || expandedChart === 'custom') && (
        <div className="glass-panel p-6 rounded-2xl relative">
          <button
            type="button"
            onClick={() => setExpandedChart(expandedChart === 'custom' ? null : 'custom')}
            className="glass-button-secondary px-3 py-1.5 rounded-lg text-sm font-medium absolute top-4 right-4 print:hidden"
          >
            {expandedChart === 'custom' ? 'Volver' : 'Expandir'}
          </button>
          <div className={`flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 pr-20 ${expandedChart === 'custom' ? 'print:hidden' : ''}`}>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Análisis Personalizado
              </h3>
              <p className="text-sm text-gray-500">
                Personalice la visualización de los datos según sus necesidades
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
            {/* Selector de Tipo de Gráfico */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setCustomChartType('pie')}
                className={`p-2 rounded-md transition-all ${customChartType === 'pie' ? 'bg-white dark:bg-gray-700 shadow-sm text-sky-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Gráfico de Pastel"
              >
                <PieIcon size={20} />
              </button>
              <button
                onClick={() => setCustomChartType('bar')}
                className={`p-2 rounded-md transition-all ${customChartType === 'bar' ? 'bg-white dark:bg-gray-700 shadow-sm text-sky-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Gráfico de Barras"
              >
                <BarIcon size={20} />
              </button>
              <button
                onClick={() => setCustomChartType('line')}
                className={`p-2 rounded-md transition-all ${customChartType === 'line' ? 'bg-white dark:bg-gray-700 shadow-sm text-sky-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Gráfico de Líneas"
              >
                <LineIcon size={20} />
              </button>
            </div>

            {/* Selector de Datos */}
            <select
              value={customDataType}
              onChange={(e) => setCustomDataType(e.target.value as CustomDataType)}
              className="bg-gray-100 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-sky-500 text-gray-800"
            >
              <option value="income">Solo Ingresos</option>
              <option value="expense">Solo Egresos</option>
              <option value="comparison">Comparativa Total</option>
            </select>

            {/* Botón de Filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Filter size={16} />
              Filtros
            </button>
          </div>
        </div>

        {/* Panel de Filtros */}
        {showFilters && (
          <div className={`mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-fadeIn ${expandedChart === 'custom' ? 'print:hidden' : ''}`}>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Filtrar por Establecimientos</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-40 overflow-y-auto custom-scrollbar">
              <button
                onClick={() => {
                  if (selectedEstablishments.length === uniqueEstablishments.length) {
                    setSelectedEstablishments([]);
                  } else {
                    setSelectedEstablishments(uniqueEstablishments);
                  }
                }}
                className="flex items-center gap-2 text-sm text-sky-600 font-medium hover:underline col-span-full mb-1"
              >
                {selectedEstablishments.length === uniqueEstablishments.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
              {uniqueEstablishments.map(est => (
                <button
                  key={est}
                  onClick={() => {
                    if (selectedEstablishments.includes(est)) {
                      setSelectedEstablishments(prev => prev.filter(e => e !== est));
                    } else {
                      setSelectedEstablishments(prev => [...prev, est]);
                    }
                  }}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  {selectedEstablishments.includes(est) ? (
                    <CheckSquare size={16} className="text-sky-500" />
                  ) : (
                    <Square size={16} className="text-gray-400" />
                  )}
                  <span className="truncate text-left">{est}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Área del Gráfico */}
        <div className={expandedChart === 'custom' ? 'h-[85vh] min-h-[600px] w-full print:h-[900px]' : 'h-[400px] w-full'}>
          <ResponsiveContainer width="100%" height="100%">
            {customChartType === 'pie' ? (
              <PieChart>
                <Pie
                  data={customChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={customDataType === 'comparison' ? 60 : 0}
                  outerRadius={140}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {customChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={('fill' in entry && entry.fill) ? entry.fill : COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`L ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '']}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#1e293b' }}
                />
                <Legend />
              </PieChart>
            ) : customChartType === 'bar' ? (
              <BarChart data={customChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" hide={customChartData.length > 10} tick={{ fill: '#374151', fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `L ${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`} tick={{ fill: '#374151', fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`L ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '']}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#1e293b' }}
                />
                <Legend />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {customChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={('fill' in entry && entry.fill) ? entry.fill : COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <LineChart data={customChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tickFormatter={(date) => {
                   if (!date) return '';
                   const [y, m] = date.split('-');
                   if (!y || !m) return date;
                   const d = new Date(Number(y), Number(m)-1);
                   return d.toLocaleDateString('es-ES', { month: 'short' });
                }} tick={{ fill: '#374151', fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `L ${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`} tick={{ fill: '#374151', fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`L ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '']}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#1e293b' }}
                />
                <Legend />
                {customDataType === 'comparison' ? (
                  <>
                    <Line type="monotone" dataKey="income" name="Ingresos" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="expense" name="Egresos" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
                  </>
                ) : (
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    name={customDataType === 'income' ? 'Ingresos' : 'Egresos'} 
                    stroke="#0ea5e9" 
                    strokeWidth={3} 
                    dot={{ r: 4 }} 
                  />
                )}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
      )}
    </div>
  );
}
