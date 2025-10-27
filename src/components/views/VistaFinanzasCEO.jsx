
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, TrendingUp, Briefcase, PiggyBank, Users, FileText, LayoutDashboard, CheckCircle, Save, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import useStore from '../../hooks/useStore';

// --- DATOS DE ENTRADA GLOBALES ---
const RETAINER_FIJO_MENSUAL = 4000;
const PROYECTOS_INCLUIDOS_RETAINER = 6;
const TASA_FONDO_OPERATIVO = 0.10;
const TIPO_CAMBIO_USD = 3.40;
const INGRESO_PROVISIONAL_PROYECTO = 2500; // Placeholder
const SALARIO_BASE_POR_PERSONA = 2500;
const NUMERO_SOCIOS = 3;

const VistaFinanzasCEO = () => {
  const projects = useStore((state) => state.projects);
  const updateProject = useStore((state) => state.updateProject);
  const [montosProyectos, setMontosProyectos] = useState({});

  const proyectosVariables = useMemo(() => 
    projects.filter(p => 
      (p.client?.toLowerCase() !== 'carbono' && p.cliente?.toLowerCase() !== 'carbono')
    )
  , [projects]);

  useEffect(() => {
    const newMontos = {};
    proyectosVariables.forEach(p => {
      newMontos[p.id] = p.income ?? INGRESO_PROVISIONAL_PROYECTO;
    });
    setMontosProyectos(newMontos);
  }, [proyectosVariables]);

  const handleMontoChange = (projectId, nuevoMonto) => {
    setMontosProyectos(prevMontos => ({
        ...prevMontos,
        [projectId]: nuevoMonto
    }));
  };

  const handleSaveMonto = (project) => {
    const newIncome = parseFloat(montosProyectos[project.id]) || 0;
    const updatedProject = {
        ...project,
        income: newIncome
    };
    updateProject(updatedProject);
  };

  // --- CÁLCULOS FINANCIEROS DINÁMICOS ---
  const calculos = useMemo(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    
    const proyectosCarbonoContabilizados = projects.filter(p => {
      const isCarbono = p.client?.toLowerCase() === 'carbono' || p.cliente?.toLowerCase() === 'carbono';
      if (!isCarbono) return false;

      const isCompleted = p.status?.toLowerCase() === 'completado';

      let isInCurrentMonth = false;
      if (p.startDate) {
        try {
          const projectMonth = format(parseISO(p.startDate), 'yyyy-MM');
          isInCurrentMonth = projectMonth === currentMonth;
        } catch (error) {
          // Ignorar errores de parseo de fecha
        }
      }
      return isInCurrentMonth || isCompleted;
    });

    // Lógica para contar proyectos de Carbono únicos por nombre
    const proyectosCarbonoUnicos = [];
    const nombresVistos = new Set();
    proyectosCarbonoContabilizados.forEach(p => {
      if (p.name && !nombresVistos.has(p.name)) {
        proyectosCarbonoUnicos.push(p);
        nombresVistos.add(p.name);
      }
    });
    const proyectosCarbonoRealizados = proyectosCarbonoUnicos.length;

    const ingresosVariables = proyectosVariables.reduce((sum, p) => {
        return sum + (parseFloat(montosProyectos[p.id]) || 0);
    }, 0);

    const ingresosTotales = RETAINER_FIJO_MENSUAL + ingresosVariables;
    const costoSalarialTotal = SALARIO_BASE_POR_PERSONA * NUMERO_SOCIOS;
    
    const fondoOperativo = ingresosTotales * TASA_FONDO_OPERATIVO;
    const utilidadNeta = ingresosTotales - fondoOperativo - costoSalarialTotal;

    const distribucion = {
      marcelo: utilidadNeta * 0.60,
      mauricio: utilidadNeta * 0.30,
      edson: utilidadNeta * 0.10,
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
  }, [projects, montosProyectos, proyectosVariables]);

  const datosGrafico = [
    { name: 'Retainer Fijo', value: RETAINER_FIJO_MENSUAL, color: '#a78bfa' },
    { name: 'Proyectos Variables', value: calculos.ingresosVariables, color: '#60a5fa' },
  ];

  const currency = (value) => `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const usd = (value) => `$ ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getStatusColor = (estado) => {
    const status = estado?.toLowerCase() || '';
    if (status.includes('cobrado') || status.includes('completado')) return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    if (status.includes('entregado')) return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
    if (status.includes('curso') || status.includes('progreso')) return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    if (status.includes('cotizado') || status.includes('programado')) return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
    return 'bg-slate-600/20 text-slate-200 border-slate-600/30';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans antialiased animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="text-purple-400" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-slate-50">Dashboard Financiero</h1>
              <p className="text-sm text-slate-400">Resumen de Rentabilidad y Operaciones</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">Cerezo Audiovisual</p>
            <p className="text-xs text-slate-500">Actualizado en tiempo real</p>
          </div>
        </div>

        {calculos.proyectosCarbonoRealizados > PROYECTOS_INCLUIDOS_RETAINER && (
          <div className="bg-red-500/15 border border-red-400/30 text-red-300 p-4 rounded-xl flex items-center gap-3 animate-pulse">
            <AlertCircle />
            <span>
              <strong>Alerta de Retainer:</strong> Se han superado los {PROYECTOS_INCLUIDOS_RETAINER} proyectos de Carbono este mes.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            icon={<DollarSign />}
            title="Ingresos del Mes"
            value={currency(calculos.ingresosTotales)}
            subValue={usd(calculos.ingresosTotales / TIPO_CAMBIO_USD)}
            color="violet"
          />
          <KpiCard
            icon={<TrendingUp />}
            title="Utilidad Neta"
            value={currency(calculos.utilidadNeta)}
            subValue={`Marcelo: ${currency(calculos.distribucion.marcelo)} (60%)`}
            color="emerald"
          />
          <KpiCard
            icon={<Briefcase />}
            title="Proyectos Variables"
            value={calculos.proyectosVariables.length}
            subValue={`Totalizando ${currency(calculos.ingresosVariables)}`}
            color="sky"
          />
          <KpiCard
            icon={<PiggyBank />}
            title="Fondo Operativo (10%)"
            value={currency(calculos.fondoOperativo)}
            subValue="Reservado para gastos futuros"
            color="amber"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/80 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-slate-200">Desglose de Ingresos Mensuales</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosGrafico} layout="vertical" margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                <XAxis type="number" stroke="#64748b" tickFormatter={(value) => `S/${value/1000}k`} />
                <YAxis type="category" dataKey="name" hide/>
                <Tooltip
                  cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', border: '1px solid #334155', borderRadius: '12px', color: '#cbd5e1' }}
                  labelStyle={{ color: '#94a3b8' }}
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
          
          <div className="bg-slate-900/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/80 flex flex-col justify-center shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-slate-200">Retainer: Carbono MKT</h2>
            <div className="text-center mb-4">
              <p className="text-5xl font-bold text-purple-400">{calculos.proyectosCarbonoRealizados} / {PROYECTOS_INCLUIDOS_RETAINER}</p>
              <p className="text-slate-400 mt-1">Proyectos Realizados este Mes</p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3.5 mb-4 overflow-hidden">
              <div
                className="bg-purple-500 h-3.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, (calculos.proyectosCarbonoRealizados / PROYECTOS_INCLUIDOS_RETAINER) * 100)}%` }}
              />
            </div>
            <div className="space-y-2 text-sm">
              {calculos.proyectosCarbonoUnicos.map(p => (
                <div key={p.id} className="flex items-center gap-2 text-slate-400">
                  <CheckCircle size={14} className="text-purple-400" />
                  <span className="truncate">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-slate-800/80 shadow-lg">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-200"><FileText size={20}/> Proyectos Variables Activos</h2>
            <div className="overflow-x-auto -mx-4 sm:-mx-6">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Proyecto</th>
                    <th className="p-4 text-right">Monto (S/)</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {calculos.proyectosVariables.map(p => (
                    <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-medium text-slate-300">{p.client || p.cliente}</td>
                      <td className="p-4 font-medium text-slate-300">{p.name}</td>
                      <td className="p-4">
                        <input 
                          type="number"
                          value={montosProyectos[p.id] || ''}
                          onChange={(e) => handleMontoChange(p.id, e.target.value)}
                          onBlur={() => handleSaveMonto(p)}
                          className="bg-slate-800 rounded-md p-2 w-32 text-right text-slate-100 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
                        />
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <button onClick={() => handleSaveMonto(p)} className="p-2 rounded-full text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors">
                          <Save size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-900/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/80 shadow-lg">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-200"><Users size={20}/> Distribución de Utilidad</h2>
            <div className="space-y-4">
              <SocioCard socio="Marcelo" rol="CEO" porcentaje="60%" monto={currency(calculos.distribucion.marcelo)} color="purple" />
              <SocioCard socio="Mauricio" rol="Operaciones" porcentaje="30%" monto={currency(calculos.distribucion.mauricio)} color="blue" />
              <SocioCard socio="Edson" rol="Operaciones" porcentaje="10%" monto={currency(calculos.distribucion.edson)} color="green" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const KpiCard = ({ icon, title, value, subValue, color }) => {
  const colorClasses = {
    violet: 'from-violet-600 to-indigo-600',
    emerald: 'from-emerald-500 to-green-500',
    sky: 'from-sky-500 to-cyan-500',
    amber: 'from-amber-500 to-orange-500',
  };
  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/50`}>
      <div className="flex items-center gap-4">
        <div className="bg-white/15 p-3 rounded-full backdrop-blur-sm">{icon}</div>
        <div>
          <p className="text-slate-200 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subValue && <p className="text-xs text-slate-200/80 mt-1">{subValue}</p>}
        </div>
      </div>
    </div>
  );
};

const SocioCard = ({ socio, rol, porcentaje, monto, color }) => {
    const colorClasses = {
        purple: 'border-l-purple-400 hover:bg-purple-500/10',
        blue: 'border-l-blue-400 hover:bg-blue-500/10',
        green: 'border-l-green-400 hover:bg-green-500/10',
    };
    return (
        <div className={`bg-slate-800/50 p-4 rounded-lg border-l-4 transition-colors ${colorClasses[color]}`}>
            <div className="flex justify-between items-center">
                <div>
                    <p className="font-bold text-lg text-slate-200">{socio}</p>
                    <p className="text-sm text-slate-400">{rol}</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg text-slate-200">{monto}</p>
                    <p className="text-sm text-slate-400">{porcentaje}</p>
                </div>
            </div>
        </div>
    );
}

export default VistaFinanzasCEO;
