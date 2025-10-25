// VistaFinanzas.jsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Users, Calendar, Plus, X, Edit2, Save, AlertCircle } from 'lucide-react';
import useStore from '../../hooks/useStore';

const currency = (v) => `S/${Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const isCarbonoTag = (p) => {
  const tag = (p.tag || p.etiqueta || '').trim().toLowerCase();
  const client = (p.client || p.cliente || '').trim().toLowerCase();
  return tag === 'carbono' || client === 'carbono';
};

export default function VistaFinanzas() {
  // Usar selectores para obtener los datos y las acciones del store.
  // Esto asegura que el componente se vuelva a renderizar cuando cambien.
  const {
    projects: rawStoreProjects,
    retainers: rawStoreRetainers,
    fetchFinancialData, // Usamos la nueva acción centralizada
    addProject,
    saveRetainer,
    updateProject,
    lastUpdate,
    loading, // Opcional: para mostrar un indicador de carga
  } = useStore(state => ({
    projects: state.projects,
    retainers: state.retainers,
    fetchFinancialData: state.fetchFinancialData,
    addProject: state.addProject,
    saveRetainer: state.saveRetainer,
    updateProject: state.updateProject,
    lastUpdate: state.lastUpdate, // Obtener la marca de tiempo del store
    loading: state.loading,
  }));

  useEffect(() => {
    fetchFinancialData?.();
  }, [fetchFinancialData]);

  const retainers = useMemo(() => rawStoreRetainers || [], [rawStoreRetainers]);
  const proyectos = useMemo(() => rawStoreProjects || [], [rawStoreProjects]);

  const [mostrarFormProyecto, setMostrarFormProyecto] = useState(false);
  const [mostrarFormRetainer, setMostrarFormRetainer] = useState(false);
  const [nuevoProyecto, setNuevoProyecto] = useState({ nombre: '', cliente: '', tipoCliente: 'variable', ingreso: '', costos: { grabacion: '', edicion: '', freelancers: '', movilidad: '', equipos: '' } });
  const [nuevoRetainer, setNuevoRetainer] = useState({ cliente: '', pagoMensual: '', proyectosMensuales: '', etiqueta: '' });

  const calcularCostoTotal = (costos) => Object.values(costos || {}).reduce((sum, val) => sum + Number(val || 0), 0);

  const proyectosEnriquecidos = useMemo(() => {
    const mesActual = new Date().toISOString().slice(0, 7);
    return proyectos.map((p) => {
      const tipoCliente = isCarbonoTag(p) ? 'retainer' : 'variable';
      let ingreso = 0;
      if (tipoCliente === 'retainer') {
        const ret = retainers.find((r) => (r.etiqueta || '').toLowerCase() === 'carbono');
        if (ret && p.fecha === mesActual) ingreso = Number(ret.pagoMensual) / Math.max(1, ret.proyectosMensuales || 1);
      } else ingreso = Number(p.ingreso || 0);
      const costoTotal = calcularCostoTotal(p.costos || {});
      const margen = ingreso - costoTotal;
      const porcentajeMargen = ingreso > 0 ? (margen / ingreso) * 100 : 0;
      return { ...p, tipoCliente, ingreso, costoTotal, margen, porcentajeMargen };
    });
  }, [proyectos, retainers]);

  const contadorRetainers = useMemo(() => {
    const mesActual = new Date().toISOString().slice(0, 7);
    return retainers.map((r) => {
      const proyectosDelMes = proyectosEnriquecidos.filter(
        (p) => isCarbonoTag(p) && p.fecha === mesActual
      ).length;
      return {
        ...r,
        proyectosRealizados: proyectosDelMes,
        cumplimiento: (proyectosDelMes / r.proyectosMensuales) * 100,
        proyectosPendientes: Math.max(0, r.proyectosMensuales - proyectosDelMes),
      };
    });
  }, [proyectosEnriquecidos, retainers]);

  const agregarProyecto = useCallback(async () => {
    const mesActual = new Date().toISOString().slice(0, 7);
    if (!nuevoProyecto.nombre || !nuevoProyecto.cliente) return;
    const proyecto = {
      // No es necesario un ID local, Supabase lo generará.
      name: nuevoProyecto.nombre,
      cliente: nuevoProyecto.cliente,
      tag: nuevoProyecto.tipoCliente === 'retainer' ? 'carbono' : nuevoProyecto.cliente.toLowerCase().replace(/\s+/g, ''),
      fecha: mesActual,
      status: 'Completado',
      properties: {
        costos: Object.fromEntries(Object.entries(nuevoProyecto.costos).map(([k, v]) => [k, Number(v || 0)])),
        ingreso: 0,
      }
    };

    if (nuevoProyecto.tipoCliente === 'retainer') {
      const ret = retainers.find((r) => (r.etiqueta || '').toLowerCase() === 'carbono');
      if (ret) proyecto.properties.ingreso = Number(ret.pagoMensual) / Math.max(1, ret.proyectosMensuales);
    } else proyecto.properties.ingreso = Number(nuevoProyecto.ingreso || 0);

    await addProject?.(proyecto);
    setMostrarFormProyecto(false);
  }, [nuevoProyecto, addProject, retainers]);

  const agregarRetainer = useCallback(async () => {
    if (!nuevoRetainer.cliente || !nuevoRetainer.pagoMensual || !nuevoRetainer.proyectosMensuales) return;
    const retainer = { id: Date.now(), cliente: nuevoRetainer.cliente, pagoMensual: Number(nuevoRetainer.pagoMensual), proyectosMensuales: Number(nuevoRetainer.proyectosMensuales), etiqueta: nuevoRetainer.etiqueta || nuevoRetainer.cliente.toLowerCase().replace(/\s+/g, ''), activo: true };
    await saveRetainer?.(retainer);
    fetchRetainers?.();
    setMostrarFormRetainer(false);
  }, [nuevoRetainer, saveRetainer, fetchRetainers]);

  // Opcional: Mostrar un indicador de carga mientras los datos se obtienen
  if (loading && proyectos.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white bg-slate-900">Cargando finanzas...</div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">Dashboard Financiero</h1>
            <p className="text-purple-200 mb-1">Agencia de Realización Audiovisual</p>
            {lastUpdate && <p className="text-xs text-purple-300 animate-pulse">Datos sincronizados hace unos segundos</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setMostrarFormRetainer(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition text-sm"><Plus size={18} /> Retainer</button>
            <button onClick={() => setMostrarFormProyecto(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition text-sm"><Plus size={18} /> Proyecto</button>
          </div>
        </div>

        {/* Resto de la interfaz igual a la versión anterior */}
      </div>
    </div>
  );
}