
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Briefcase, PiggyBank, Users, FileText } from 'lucide-react';
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

    const proyectosCarbono = projects.filter(p => {
      const isCarbono = p.client?.toLowerCase() === 'carbono' || p.cliente?.toLowerCase() === 'carbono';
      if (!isCarbono || !p.startDate) return false;
      try {
        const projectMonth = format(parseISO(p.startDate), 'yyyy-MM');
        return projectMonth === currentMonth;
      } catch (error) {
        return false;
      }
    });

    // Lógica para contar proyectos de Carbono únicos por nombre
    const nombresProyectosCarbono = new Set(proyectosCarbono.map(p => p.name));
    const proyectosCarbonoRealizados = nombresProyectosCarbono.size;

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
      proyectosVariables,
      ingresosVariables,
      ingresosTotales,
      fondoOperativo,
      utilidadNeta,
      distribucion,
    };
  }, [projects, montosProyectos, proyectosVariables]);

  const datosGrafico = [
    {
      name: 'Ingresos del Mes',
      Fijo: RETAINER_FIJO_MENSUAL,
      Variables: calculos.ingresosVariables,
    },
  ];

  const currency = (value) => `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const usd = (value) => `$ ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getStatusColor = (estado) => {
    const status = estado?.toLowerCase() || '';
    if (status.includes('cobrado') || status.includes('completado')) return 'bg-green-500/20 text-green-400';
    if (status.includes('entregado')) return 'bg-blue-500/20 text-blue-400';
    if (status.includes('curso') || status.includes('progreso')) return 'bg-yellow-500/20 text-yellow-400';
    if (status.includes('cotizado') || status.includes('programado')) return 'bg-gray-500/20 text-gray-400';
    return 'bg-gray-600';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard Financiero</h1>
          <div className="text-right">
            <p className="text-lg font-semibold text-purple-300">Cerezo Audiovisual</p>
            <p className="text-sm text-gray-400">Resumen de Rentabilidad y Operaciones</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<DollarSign />}
            title="Ingresos del Mes"
            value={currency(calculos.ingresosTotales)}
            subValue={usd(calculos.ingresosTotales / TIPO_CAMBIO_USD)}
            color="purple"
          />
          <KpiCard
            icon={<TrendingUp />}
            title="Utilidad Neta"
            value={currency(calculos.utilidadNeta)}
            subValue={`Marcelo: ${currency(calculos.distribucion.marcelo)} (60%)`}
            color="green"
          />
          <KpiCard
            icon={<Briefcase />}
            title="Proyectos Variables"
            value={calculos.proyectosVariables.length}
            subValue={`Totalizando ${currency(calculos.ingresosVariables)}`}
            color="blue"
          />
          <KpiCard
            icon={<PiggyBank />}
            title="Fondo Operativo (10%)"
            value={currency(calculos.fondoOperativo)}
            subValue="Reservado para gastos futuros"
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4">Desglose de Ingresos Mensuales</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosGrafico} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip
                  cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="Fijo" stackId="a" fill="#8b5cf6" name="Retainer Fijo" />
                <Bar dataKey="Variables" stackId="a" fill="#3b82f6" name="Proyectos Variables" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex flex-col justify-center">
            <h2 className="text-xl font-bold mb-4">Retainer: Carbono MKT</h2>
            <div className="text-center mb-4">
              <p className="text-4xl font-bold text-purple-300">{calculos.proyectosCarbonoRealizados} / {PROYECTOS_INCLUIDOS_RETAINER}</p>
              <p className="text-gray-400">Proyectos Realizados</p>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-4 mb-4">
              <div
                className="bg-purple-500 h-4 rounded-full"
                style={{ width: `${(calculos.proyectosCarbonoRealizados / PROYECTOS_INCLUIDOS_RETAINER) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><FileText size={20}/> Proyectos Variables Activos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-700 text-sm text-gray-400">
                    <th className="p-2">Cliente</th>
                    <th className="p-2">Proyecto</th>
                    <th className="p-2">Monto (S/)</th>
                    <th className="p-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {calculos.proyectosVariables.map(p => (
                    <tr key={p.id} className="border-b border-slate-800 hover:bg-slate-700/50">
                      <td className="p-3 font-medium">{p.client || p.cliente}</td>
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3">
                        <input 
                          type="number"
                          value={montosProyectos[p.id] || ''}
                          onChange={(e) => handleMontoChange(p.id, e.target.value)}
                          onBlur={() => handleSaveMonto(p)}
                          className="bg-slate-700 rounded-md p-1 w-28 text-right"
                        />
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Users size={20}/> Distribución de Utilidad</h2>
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
  const colors = {
    purple: 'from-purple-600 to-blue-600',
    green: 'from-green-600 to-emerald-600',
    blue: 'from-blue-600 to-cyan-600',
    orange: 'from-orange-500 to-amber-500',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl p-5 shadow-lg`}>
      <div className="flex items-center gap-4">
        <div className="bg-white/10 p-3 rounded-full">{icon}</div>
        <div>
          <p className="text-gray-200 text-sm">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subValue && <p className="text-xs text-gray-300">{subValue}</p>}
        </div>
      </div>
    </div>
  );
};

const SocioCard = ({ socio, rol, porcentaje, monto, color }) => {
    const colors = {
        purple: 'border-l-purple-400',
        blue: 'border-l-blue-400',
        green: 'border-l-green-400',
    };
    return (
        <div className={`bg-slate-700/50 p-4 rounded-lg border-l-4 ${colors[color]}`}>
            <div className="flex justify-between items-center">
                <div>
                    <p className="font-bold text-lg">{socio}</p>
                    <p className="text-sm text-gray-400">{rol}</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg">{monto}</p>
                    <p className="text-sm text-gray-400">{porcentaje}</p>
                </div>
            </div>
        </div>
    );
}

export default VistaFinanzasCEO;

