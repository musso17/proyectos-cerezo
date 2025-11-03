import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Briefcase,
  PiggyBank,
  Users,
  FileText,
  CheckCircle,
  Save,
  AlertCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { normalizeStatus } from '../../utils/statusHelpers';
import useStore from '../../hooks/useStore';

const RETAINER_FIJO_MENSUAL = 4000;
const PROYECTOS_INCLUIDOS_RETAINER = 6;
const TASA_FONDO_OPERATIVO = 0.10;
const TIPO_CAMBIO_USD = 3.40;
const INGRESO_PROVISIONAL_PROYECTO = 2500; // Placeholder
const SALARIO_BASE_POR_PERSONA = 2500;
const NUMERO_SOCIOS = 3;

const getMonthFromDate = (value) => {
  if (!value) return null;
  const raw = value.toString().trim();
  if (!raw) return null;
  const normalized =
    raw.length === 7 ? `${raw}-01` : raw.length === 4 ? `${raw}-01-01` : raw;
  try {
    const parsed = parseISO(normalized);
    if (Number.isNaN(parsed?.getTime?.())) {
      throw new Error('Invalid date');
    }
    return format(parsed, 'yyyy-MM');
  } catch {
    const fallback = new Date(normalized);
    if (Number.isNaN(fallback.getTime())) return null;
    return format(fallback, 'yyyy-MM');
  }
};

const resolveProjectMonth = (project) => {
  if (!project) return null;
  const candidates = [
    project.billingMonth,
    project.facturacionMes,
    project.facturacion_mes,
    project.month,
    project.deadline,
    project.endDate,
    project.end_date,
    project.fecha_entrega,
    project.fechaEntrega,
    project.startDate,
    project.start_date,
    project.fecha_inicio,
    project.fechaGrabacion,
    project.recordingDate,
    project.properties?.deadline,
    project.properties?.startDate,
    project.properties?.fechaGrabacion,
    project.properties?.month,
    project.created_at,
    project.updated_at,
  ];

  for (const value of candidates) {
    const month = getMonthFromDate(value);
    if (month) return month;
  }
  return null;
};

const resolveProjectCompletionMonth = (project) => {
  if (!project) return null;
  // Lista priorizada de campos que indican la fecha de finalización.
  // Se ha eliminado startDate para evitar falsos positivos.
  const candidates = [
    project.completedAt,
    project.completed_at,
    project.fechaEntrega,
    project.fecha_entrega,
    project.deadline,
    project.properties?.completedAt,
    project.properties?.deadline,
    project.endDate,
    project.end_date,
    project.updated_at, // Fallback importante para proyectos completados sin fecha explícita.
  ];

  for (const value of candidates) {
    const month = getMonthFromDate(value);
    if (month) return month;
  }
  return null;
};

const getProjectStartDateMonth = (project) => {
  if (!project) return null;
  return getMonthFromDate(project.startDate);
};

const isProjectInMonth = (project, month) => {
  if (!month) return true;
  const projectMonth = resolveProjectMonth(project);
  return projectMonth === month;
};

const VistaFinanzasCEO = () => {
  const projects = useStore((state) => state.projects);
  const updateProject = useStore((state) => state.updateProject);
  const setProjects = useStore((state) => state.setProjects);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const selectedMonthLabel = useMemo(() => {
    if (!selectedMonth) return 'todos los meses';
    try {
      const date = parseISO(`${selectedMonth}-01`);
      const label = date.toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric',
      });
      return label.charAt(0).toUpperCase() + label.slice(1);
    } catch {
      return selectedMonth;
    }
  }, [selectedMonth]);

  const proyectosNoCarbono = useMemo(
    () =>
      projects.filter(
        (project) =>
          project.client?.toLowerCase() !== 'carbono' && project.cliente?.toLowerCase() !== 'carbono'
      ),
    [projects]
  );

  const proyectosVariables = useMemo(
    () =>
      proyectosNoCarbono.filter((project) => isProjectInMonth(project, selectedMonth)),
    [proyectosNoCarbono, selectedMonth]
  );

  const handleMontoChange = (projectId, nuevoMonto) => {
    const updatedProjects = projects.map((project) =>
      project.id === projectId ? { ...project, income: nuevoMonto } : project
    );
    setProjects(updatedProjects);
  };

  const handleSaveMonto = (projectId) => {
    const projectToUpdate = projects.find((project) => project.id === projectId);
    if (!projectToUpdate) return;

    const newIncome = parseFloat(projectToUpdate.income) || 0;
    const updatedProject = {
      ...projectToUpdate,
      income: newIncome,
    };
    updateProject(updatedProject);
  };

  const calculos = useMemo(() => {
    // Lógica específica para el contador de Carbono MKT: proyectos iniciados en el mes.
    const proyectosCarbonoDelMes = projects.filter((project) => {
      const isCarbono =
        project.client?.toLowerCase() === 'carbono' || project.cliente?.toLowerCase() === 'carbono';
      if (!isCarbono) return false;

      // Un proyecto de Carbono cuenta para el mes si:
      // 1. Se inició en el mes seleccionado.
      // 2. O se completó en el mes seleccionado.

      const startDateMonth = getProjectStartDateMonth(project);
      const startedInMonth = startDateMonth === selectedMonth;

      // Para los proyectos completados, verificamos que su fecha de finalización (o similar)
      // corresponda al mes seleccionado, para no contar proyectos completados en otros meses.
      const projectEndDateMonth = resolveProjectCompletionMonth(project);
      const isCompleted = normalizeStatus(project.status) === 'Completado';
      const completedInMonth = isCompleted && projectEndDateMonth === selectedMonth;

      return startedInMonth || completedInMonth;
    });

    // Lógica para la lista de proyectos de Carbono (evita duplicados por nombre)
    const proyectosCarbonoUnicos = [];
    const nombresVistos = new Set();
    proyectosCarbonoDelMes.forEach((project) => {
      if (project.name && !nombresVistos.has(project.name)) {
        proyectosCarbonoUnicos.push(project);
        nombresVistos.add(project.name);
      }
    });
    const proyectosCarbonoRealizados = proyectosCarbonoUnicos.length;

    const ingresosVariables = proyectosVariables.reduce( // proyectosVariables ya está filtrado por el mes seleccionado
      (sum, project) => sum + (parseFloat(project.income) || 0),
      0
    );

    const ingresosTotales = RETAINER_FIJO_MENSUAL + ingresosVariables;
    const costoSalarialTotal = SALARIO_BASE_POR_PERSONA * NUMERO_SOCIOS;

    const fondoOperativo = ingresosTotales * TASA_FONDO_OPERATIVO;
    const utilidadNeta = ingresosTotales - fondoOperativo - costoSalarialTotal;

    const distribucion = {
      marcelo: utilidadNeta * 0.6,
      mauricio: utilidadNeta * 0.3,
      edson: utilidadNeta * 0.1,
    };

    return {
      proyectosCarbonoRealizados,
      proyectosCarbonoUnicos,
      proyectosVariables,
      ingresosVariables,
      ingresosTotales,
      fondoOperativo,
      utilidadNeta,
      distribucion,
    };
  }, [projects, proyectosVariables, selectedMonth]);

  const datosGrafico = [
    { name: 'Retainer Fijo', value: RETAINER_FIJO_MENSUAL, color: '#a78bfa' },
    { name: 'Proyectos Variables', value: calculos.ingresosVariables, color: '#60a5fa' },
  ];

  const currency = (value) =>
    `S/ ${value.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const usd = (value) =>
    `$ ${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getStatusColor = (estado) => {
    const status = estado?.toLowerCase() || '';

    if (status.includes('cobrado') || status.includes('completado')) {
      return 'border-[#C8E6C9] bg-[#F1FAF3] text-[#2F9E44]';
    }
    if (status.includes('entregado')) {
      return 'border-[#C7DAFF] bg-[#E7F1FF] text-[#4C8EF7]';
    }
    if (status.includes('curso') || status.includes('progreso')) {
      return 'border-[#FFE0B0] bg-[#FFF4E6] text-[#C07A00]';
    }
    if (status.includes('cotizado') || status.includes('programado')) {
      return 'border-[#E5E7EB] bg-[#F4F5F7] text-secondary';
    }
    return 'border-[#E5E7EB] bg-[#F9FAFB] text-secondary';
  };

  const formatStatusLabel = (status) => {
    return normalizeStatus(status);
  };

  return (
    <div className="space-y-8 px-3 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Resumen financiero mensual</h1>
            <p className="text-sm text-secondary">
              Mostrando ingresos y proyectos correspondientes a {selectedMonthLabel}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
            <label htmlFor="financial-month" className="text-sm font-medium text-secondary">
              Selecciona el mes
            </label>
            <input
              id="financial-month"
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>

        {calculos.proyectosCarbonoRealizados > PROYECTOS_INCLUIDOS_RETAINER && (
          <div className="flex items-center gap-3 rounded-xl border border-[#F4C7C7] bg-[#FDECEC] p-4 text-[#B91C1C] dark:border-[#3A2424] dark:bg-[#2A1C1C] dark:text-red-300">
            <AlertCircle size={18} />
            <span>
              <strong>Alerta de retainer:</strong> Se han superado los {PROYECTOS_INCLUIDOS_RETAINER} proyectos de
              Carbono este mes.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={<DollarSign />}
            title="Ingresos del mes"
            value={currency(calculos.ingresosTotales)}
            subValue={usd(calculos.ingresosTotales / TIPO_CAMBIO_USD)}
            color="violet"
          />
          <KpiCard
            icon={<TrendingUp />}
            title="Utilidad neta"
            value={currency(calculos.utilidadNeta)}
            subValue={`Marcelo: ${currency(calculos.distribucion.marcelo)} (60%)`}
            color="emerald"
          />
          <KpiCard
            icon={<Briefcase />}
            title="Proyectos variables"
            value={calculos.proyectosVariables.length}
            subValue={`Totalizando ${currency(calculos.ingresosVariables)}`}
            color="sky"
          />
          <KpiCard
            icon={<PiggyBank />}
            title="Fondo operativo (10%)"
            value={currency(calculos.fondoOperativo)}
            subValue="Reservado para gastos futuros"
            color="amber"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="glass-panel lg:col-span-2 space-y-4 p-6">
            <h2 className="text-xl font-semibold text-primary">Desglose de ingresos mensuales</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosGrafico} layout="vertical" margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  type="number"
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickFormatter={(value) => `S/${value / 1000}k`}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  hide
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={{ stroke: '#E5E7EB' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(108, 99, 255, 0.04)' }}
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    borderRadius: '12px',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 18px 36px rgba(5,6,8,0.32)',
                    color: 'var(--color-text-primary)',
                  }}
                  labelStyle={{ color: 'var(--color-text-secondary)' }}
                />
                <Legend />
                <Bar dataKey="value" name="Ingresos" stackId="a" barSize={40}>
                  {datosGrafico.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-panel flex flex-col justify-center space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-primary">Retainer: Carbono MKT</h2>
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent dark:bg-white/5 dark:text-white/70">
                Mensual
              </span>
            </div>
            <div className="text-center space-y-1">
              <p className="text-5xl font-bold text-accent">
                {calculos.proyectosCarbonoRealizados} / {PROYECTOS_INCLUIDOS_RETAINER}
              </p>
              <p className="text-sm text-secondary">Proyectos realizados este mes</p>
            </div>
            <div className="h-3.5 w-full rounded-full bg-[#E8EAF6] dark:bg-[#1B1C20]">
              <div
                className="h-3.5 rounded-full bg-accent transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(
                    100,
                    (calculos.proyectosCarbonoRealizados / PROYECTOS_INCLUIDOS_RETAINER) * 100
                  )}%`,
                }}
              />
            </div>
            <div className="space-y-2 text-sm">
              {calculos.proyectosCarbonoUnicos.length === 0 ? (
                <p className="text-secondary">No hay proyectos registrados en este mes.</p>
              ) : (
                calculos.proyectosCarbonoUnicos.map((project) => (
                  <div key={project.id} className="flex items-center gap-2 text-secondary">
                    <CheckCircle size={14} className="text-accent dark:text-emerald-300" />
                    <span className="truncate">{project.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="glass-panel space-y-4 p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
              <FileText size={20} /> Proyectos variables activos
            </h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-[640px] divide-y divide-[#E5E7EB] text-left">
                <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wider text-secondary">
                  <tr>
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3">Proyecto</th>
                    <th className="px-6 py-3 text-right">Monto (S/)</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {calculos.proyectosVariables.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 text-center text-sm text-secondary">
                        No hay proyectos variables registrados en {selectedMonthLabel}.
                      </td>
                    </tr>
                  ) : (
                    calculos.proyectosVariables.map((project) => (
                      <tr key={project.id} className="transition hover:bg-[#F7F8FA] dark:hover:bg-white/10">
                        <td className="px-6 py-3 text-sm font-medium text-primary">
                          {project.client || project.cliente}
                        </td>
                        <td className="px-6 py-3 text-sm font-medium text-primary">{project.name}</td>
                        <td className="px-6 py-3">
                          <input
                            type="number"
                            value={project.income ?? ''}
                            onChange={(event) => handleMontoChange(project.id, event.target.value)}
                            onBlur={() => handleSaveMonto(project.id)}
                            className="w-32 rounded-lg border border-[#D1D5DB] bg-white p-2 text-right text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(
                              project.status
                            )}`}
                          > 
                            {formatStatusLabel(project.status)}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <button
                            type="button"
                            onClick={() => handleSaveMonto(project.id)}
                            className="rounded-full p-2 text-secondary transition hover:bg-accent/10 hover:text-accent dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white/90"
                          >
                            <Save size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-panel space-y-4 p-6">
            <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
              <Users size={20} /> Distribución de utilidad
            </h2>
            <div className="space-y-3">
              <SocioCard
                socio="Marcelo"
                rol="CEO"
                porcentaje="60%"
                monto={currency(calculos.distribucion.marcelo)}
                color="purple"
              />
              <SocioCard
                socio="Mauricio"
                rol="Operaciones"
                porcentaje="30%"
                monto={currency(calculos.distribucion.mauricio)}
                color="blue"
              />
              <SocioCard
                socio="Edson"
                rol="Operaciones"
                porcentaje="10%"
                monto={currency(calculos.distribucion.edson)}
                color="green"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const KpiCard = ({ icon, title, value, subValue, color }) => {
  const palette = {
    violet: 'from-violet-600 to-indigo-600',
    emerald: 'from-emerald-500 to-green-500',
    sky: 'from-sky-500 to-cyan-500',
    amber: 'from-amber-500 to-orange-500',
  };

  const colorClasses = palette[color] || palette.violet;

  return (
    <div className={`bg-gradient-to-br ${colorClasses} rounded-2xl p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(15,23,42,0.18)]`}>
      <div className="flex items-center gap-4">
        <div className="bg-white/15 p-3 rounded-full backdrop-blur-sm">{icon}</div>
        <div>
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subValue && <p className="mt-1 text-xs text-white/70">{subValue}</p>}
        </div>
      </div>
    </div>
  );
};

const SocioCard = ({ socio, rol, porcentaje, monto, color }) => {
  const palette = {
    purple: 'border-l-accent dark:border-l-purple-300',
    blue: 'border-l-[#4C8EF7] dark:border-l-blue-300',
    green: 'border-l-[#2F9E44] dark:border-l-emerald-300',
  };

  const selected = palette[color] || palette.purple;

  return (
    <div className={`rounded-xl border border-[#E5E7EB] bg-white p-4 transition hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)] border-l-4 ${selected} dark:border-[#2B2D31] dark:bg-[#1E1F23] dark:hover:bg-white/5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-primary">{socio}</p>
          <p className="text-sm text-secondary/80">{rol}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-primary">{monto}</p>
          <p className="text-sm text-secondary">{porcentaje}</p>
        </div>
      </div>
    </div>
  );
};

export default VistaFinanzasCEO;
