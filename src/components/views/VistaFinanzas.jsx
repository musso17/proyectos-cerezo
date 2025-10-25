"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Users, Calendar, Plus, X, Edit2, Save, AlertCircle, CheckCircle } from 'lucide-react';
import useStore from '../../hooks/useStore';

const currency = (v) => {
  const formatted = Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `S/${formatted}`;
};

const isCarbonoTag = (p) => {
  if (!p) return false;
  const tag = (p.tag || p.etiqueta || p.properties?.tag || '').toString().trim().toLowerCase();
  const client = (p.client || p.cliente || p.properties?.client || '').toString().trim().toLowerCase();
  return tag === 'carbono' || client === 'carbono';
};

export default function VistaFinanzas() {
  // Prefer data from store; fall back to small local examples if empty
  const storeProjects = useStore((s) => s.projects) || [];
  const storeRetainers = useStore((s) => s.retainers) || [];
  const addProject = useStore((s) => s.addProject);
  const saveRetainer = useStore((s) => s.saveRetainer);
  const importRetainersFromProjects = useStore((s) => s.importRetainersFromProjects);
  const fetchRetainers = useStore((s) => s.fetchRetainers);
  const updateProject = useStore((s) => s.updateProject);

  useEffect(() => {
    fetchRetainers && fetchRetainers();
    importRetainersFromProjects && importRetainersFromProjects();
  }, [fetchRetainers, importRetainersFromProjects]);

  const defaultRetainers = useMemo(() => (storeRetainers.length ? storeRetainers : [
    { id: 1, cliente: 'Carbono', pagoMensual: 4000, proyectosMensuales: 6, etiqueta: 'carbono', activo: true }
  ]), [storeRetainers]);

  const defaultProjects = useMemo(() => (storeProjects.length ? storeProjects : [
    { id: 1, nombre: 'Video Corporativo', cliente: 'Carbono', etiqueta: 'carbono', tipoCliente: 'retainer', fecha: '2025-02', costos: { grabacion: 100, edicion: 150, freelancers: 80, movilidad: 30, equipos: 50 }, estado: 'completado' },
    { id: 2, nombre: 'Reel Instagram', cliente: 'Carbono', etiqueta: 'carbono', tipoCliente: 'retainer', fecha: '2025-02', costos: { grabacion: 80, edicion: 120, freelancers: 50, movilidad: 20, equipos: 30 }, estado: 'completado' },
    { id: 4, nombre: 'Spot Publicitario', cliente: 'Empresa XYZ', etiqueta: 'xyz', tipoCliente: 'variable', ingreso: 3500, fecha: '2025-01', costos: { grabacion: 400, edicion: 600, freelancers: 500, movilidad: 80, equipos: 200 }, estado: 'completado' },
    { id: 5, nombre: 'Documental Corto', cliente: 'ONG ABC', etiqueta: 'abc', tipoCliente: 'variable', ingreso: 5000, fecha: '2025-02', costos: { grabacion: 800, edicion: 1200, freelancers: 600, movilidad: 150, equipos: 300 }, estado: 'completado' }
  ]), [storeProjects]);

  // local UI state for forms
  const [retainers, setRetainers] = useState(defaultRetainers);
  const [proyectos, setProyectos] = useState(defaultProjects);

  useEffect(() => setRetainers(defaultRetainers), [defaultRetainers]);
  useEffect(() => setProyectos(defaultProjects), [defaultProjects]);

  const [mostrarFormProyecto, setMostrarFormProyecto] = useState(false);
  const [mostrarFormRetainer, setMostrarFormRetainer] = useState(false);
  const [editandoRetainer, setEditandoRetainer] = useState(null);

  const [nuevoProyecto, setNuevoProyecto] = useState({ nombre: '', cliente: '', tipoCliente: 'variable', ingreso: '', fecha: '2025-02', costos: { grabacion: '', edicion: '', freelancers: '', movilidad: '', equipos: '' } });
  const [nuevoRetainer, setNuevoRetainer] = useState({ cliente: '', pagoMensual: '', proyectosMensuales: '', etiqueta: '' });

  const calcularCostoTotal = (costos) => Object.values(costos || {}).reduce((sum, val) => sum + Number(val || 0), 0);

  const proyectosEnriquecidos = useMemo(() => proyectos.map(p => {
    // determine tipoCliente by checking carbon tag/client
    const tipoCliente = isCarbonoTag(p) ? 'retainer' : (p.tipoCliente || p.type || (p.etiqueta === 'carbono' ? 'retainer' : 'variable'));
    let ingreso = 0;
    if (tipoCliente === 'retainer') {
      const ret = retainers.find(r => (r.etiqueta || r.cliente || '').toString().toLowerCase() === (p.etiqueta || p.cliente || p.client || '').toString().toLowerCase() && r.activo);
      if (ret) ingreso = Number((ret.pagoMensual || ret.monthly || 0) / Math.max(1, ret.proyectosMensuales || 1));
    } else {
      ingreso = Number(p.ingreso || p.income || 0);
    }
    const costosObj = p.costos || p.costos || p.properties?.costos || {};
    const costoTotal = calcularCostoTotal(costosObj || {});
    const margen = ingreso - costoTotal;
    const porcentajeMargen = ingreso > 0 ? (margen / ingreso) * 100 : 0;
    return { ...p, ingreso, costoTotal, margen, porcentajeMargen, tipoCliente, costosObj };
  }), [proyectos, retainers]);

  const contadorRetainers = useMemo(() => {
    const mesActual = new Date().toISOString().slice(0,7); // 'YYYY-MM'
    const normalize = (v) => (v || '').toString().trim().toLowerCase();
    return retainers.filter(r => r.activo).map(r => {
      const keyR = normalize(r.etiqueta || r.cliente);
      const proyectosDelMes = proyectosEnriquecidos.filter(p => {
        // count only projects classified as retainer (ej. etiqueta 'carbono')
        if (p.tipoCliente !== 'retainer') return false;
        const keyP = normalize(p.etiqueta || p.cliente || p.client);
        return keyP === keyR && p.fecha === mesActual;
      }).length;
      return { ...r, proyectosRealizados: proyectosDelMes, cumplimiento: (proyectosDelMes / Math.max(1, r.proyectosMensuales || 1)) * 100, proyectosPendientes: Math.max(0, (r.proyectosMensuales || 0) - proyectosDelMes) };
    });
  }, [proyectosEnriquecidos, retainers]);

  const facturacionMensual = useMemo(() => {
    const porMes = {};
    proyectosEnriquecidos.filter(p => p.tipoCliente === 'variable').forEach(p => {
      if (!porMes[p.fecha]) porMes[p.fecha] = { variable: 0, retainer: 0 };
      porMes[p.fecha].variable += p.ingreso;
    });
    const meses = [...new Set(proyectosEnriquecidos.map(p => p.fecha))];
    meses.forEach(mes => {
      if (!porMes[mes]) porMes[mes] = { variable: 0, retainer: 0 };
      retainers.filter(r => r.activo).forEach(r => { porMes[mes].retainer += Number(r.pagoMensual || r.monthly || 0); });
    });
    return Object.keys(porMes).sort().map(m => ({ mes: m, variable: porMes[m].variable, retainer: porMes[m].retainer, total: porMes[m].variable + porMes[m].retainer }));
  }, [proyectosEnriquecidos, retainers]);

  const clientesRentables = useMemo(() => {
    const porCliente = {};
    proyectosEnriquecidos.filter(p => p.tipoCliente === 'variable').forEach(p => {
      if (!porCliente[p.cliente]) porCliente[p.cliente] = { cliente: p.cliente, totalFacturado: 0, totalCostos: 0, proyectos: 0, tipo: 'variable' };
      porCliente[p.cliente].totalFacturado += p.ingreso; porCliente[p.cliente].totalCostos += p.costoTotal; porCliente[p.cliente].proyectos += 1;
    });
    retainers.filter(r => r.activo).forEach(r => {
      if (!porCliente[r.cliente]) porCliente[r.cliente] = { cliente: r.cliente, totalFacturado: 0, totalCostos: 0, proyectos: 0, tipo: 'retainer' };
      porCliente[r.cliente].totalFacturado += Number(r.pagoMensual || r.monthly || 0);
      const costosRetainer = proyectosEnriquecidos.filter(p => (p.etiqueta || p.cliente || '').toString().toLowerCase() === (r.etiqueta || r.cliente || '').toString().toLowerCase()).reduce((s, p) => s + p.costoTotal, 0);
      porCliente[r.cliente].totalCostos += costosRetainer;
    });
    return Object.values(porCliente).map(c => ({ ...c, margen: c.totalFacturado - c.totalCostos, margenPorcentaje: c.totalFacturado > 0 ? ((c.totalFacturado - c.totalCostos) / c.totalFacturado) * 100 : 0 })).sort((a, b) => b.totalFacturado - a.totalFacturado);
  }, [proyectosEnriquecidos, retainers]);

  const kpis = useMemo(() => {
    const ingresoRetainer = retainers.filter(r => r.activo).reduce((s, r) => s + Number(r.pagoMensual || r.monthly || 0), 0);
    const ingresoVariable = proyectosEnriquecidos.filter(p => p.tipoCliente === 'variable').reduce((s, p) => s + p.ingreso, 0);
    const totalIngreso = ingresoRetainer + ingresoVariable;
    const totalCostos = proyectosEnriquecidos.reduce((s, p) => s + p.costoTotal, 0);
    const margen = totalIngreso - totalCostos;
    return { totalIngreso, ingresoRetainer, ingresoVariable, totalCostos, margen, margenPorcentaje: totalIngreso > 0 ? (margen / totalIngreso) * 100 : 0, clientesActivos: clientesRentables.length, proyectosTotales: proyectos.length };
  }, [proyectosEnriquecidos, retainers, clientesRentables, proyectos]);

  // UI actions — call store methods when available
  const agregarProyecto = () => {
    if (!nuevoProyecto.nombre || !nuevoProyecto.cliente) return;
    const proyecto = { id: Date.now(), nombre: nuevoProyecto.nombre, cliente: nuevoProyecto.cliente, tipoCliente: nuevoProyecto.tipoCliente, etiqueta: (nuevoProyecto.cliente || '').toLowerCase().replace(/\s+/g, ''), fecha: nuevoProyecto.fecha, estado: 'completado', costos: { grabacion: Number(nuevoProyecto.costos.grabacion || 0), edicion: Number(nuevoProyecto.costos.edicion || 0), freelancers: Number(nuevoProyecto.costos.freelancers || 0), movilidad: Number(nuevoProyecto.costos.movilidad || 0), equipos: Number(nuevoProyecto.costos.equipos || 0) } };
    if (nuevoProyecto.tipoCliente === 'variable') proyecto.ingreso = Number(nuevoProyecto.ingreso || 0);
    if (addProject) { addProject(proyecto); } else { setProyectos(prev => [...prev, proyecto]); }
    setMostrarFormProyecto(false);
    setNuevoProyecto({ nombre: '', cliente: '', tipoCliente: 'variable', ingreso: '', fecha: '2025-02', costos: { grabacion: '', edicion: '', freelancers: '', movilidad: '', equipos: '' } });
  };

  const agregarRetainer = async () => {
    if (!nuevoRetainer.cliente || !nuevoRetainer.pagoMensual || !nuevoRetainer.proyectosMensuales) return;
    const retainer = { id: Date.now(), cliente: nuevoRetainer.cliente, pagoMensual: Number(nuevoRetainer.pagoMensual), proyectosMensuales: Number(nuevoRetainer.proyectosMensuales), etiqueta: nuevoRetainer.etiqueta || (nuevoRetainer.cliente || '').toLowerCase().replace(/\s+/g, ''), activo: true };
    if (saveRetainer) { await saveRetainer(retainer); if (fetchRetainers) await fetchRetainers(); } else { setRetainers(prev => [...prev, retainer]); }
    setMostrarFormRetainer(false);
    setNuevoRetainer({ cliente: '', pagoMensual: '', proyectosMensuales: '', etiqueta: '' });
  };

  const actualizarRetainer = async () => {
    if (!editandoRetainer) return;
    if (saveRetainer) { await saveRetainer(editandoRetainer); if (fetchRetainers) await fetchRetainers(); }
    else { setRetainers(prev => prev.map(r => r.id === editandoRetainer.id ? editandoRetainer : r)); }
    setEditandoRetainer(null);
  };

  // add editing state
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingProjectData, setEditingProjectData] = useState(null);

  // editing helpers
  const startEditProject = (p) => {
    setEditingProjectId(p.id);
    // prepare editable data (income + costs breakdown)
    setEditingProjectData({
      ...p,
      ingreso: Number(p.ingreso || p.income || 0),
      costos: { ...(p.costos || p.properties?.costos || {}), grabacion: (p.costos || p.properties?.costos || {}).grabacion || (p.costos || {}).grabacion || 0, edicion: (p.costos || p.properties?.costos || {}).edicion || 0, freelancers: (p.costos || p.properties?.costos || {}).freelancers || 0, movilidad: (p.costos || p.properties?.costos || {}).movilidad || 0, equipos: (p.costos || p.properties?.costos || {}).equipos || 0 }
    });
  };

  const cancelEditProject = () => { setEditingProjectId(null); setEditingProjectData(null); };

  const saveEditedProject = async () => {
    if (!editingProjectData) return;
    // build payload for updateProject: ensure fields kept consistent with normalizeProject
    const payload = {
      ...editingProjectData,
      ingreso: Number(editingProjectData.ingreso || 0),
      income: Number(editingProjectData.ingreso || 0),
      costos: {
        grabacion: Number(editingProjectData.costos.grabacion || 0),
        edicion: Number(editingProjectData.costos.edicion || 0),
        freelancers: Number(editingProjectData.costos.freelancers || 0),
        movilidad: Number(editingProjectData.costos.movilidad || 0),
        equipos: Number(editingProjectData.costos.equipos || 0),
      }
    };

    try {
      if (updateProject) {
        await updateProject(payload);
        // refresh local set (hook in useStore will update projects via supabase channel or fetch)
      } else {
        // fallback local update
        setProyectos(prev => prev.map(pr => pr.id === payload.id ? { ...pr, ...payload } : pr));
      }
    } catch (err) {
      console.error('Error saving edited project:', err);
    } finally {
      cancelEditProject();
    }
  };

  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Dashboard Financiero</h1>
            <p className="text-purple-200">Agencia de Realización Audiovisual</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setMostrarFormRetainer(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition text-sm"><Plus size={18} /> Retainer</button>
            <button onClick={() => setMostrarFormProyecto(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition text-sm"><Plus size={18} /> Proyecto</button>
          </div>
        </div>

        {mostrarFormRetainer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-blue-500/30">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">Nuevo Cliente Retainer</h3>
                <button onClick={() => setMostrarFormRetainer(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <input type="text" placeholder="Nombre del cliente" value={nuevoRetainer.cliente} onChange={(e) => setNuevoRetainer({...nuevoRetainer, cliente: e.target.value})} className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg" />
                <input type="number" placeholder="Pago mensual (S/)" value={nuevoRetainer.pagoMensual} onChange={(e) => setNuevoRetainer({...nuevoRetainer, pagoMensual: e.target.value})} className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg" />
                <input type="number" placeholder="Proyectos mensuales" value={nuevoRetainer.proyectosMensuales} onChange={(e) => setNuevoRetainer({...nuevoRetainer, proyectosMensuales: e.target.value})} className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg" />
                <input type="text" placeholder="Etiqueta (ej: carbono)" value={nuevoRetainer.etiqueta} onChange={(e) => setNuevoRetainer({...nuevoRetainer, etiqueta: e.target.value})} className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg" />
              </div>
              <button onClick={agregarRetainer} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Guardar Retainer</button>
            </div>
          </div>
        )}

        {mostrarFormProyecto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl border border-purple-500/30 my-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">Nuevo Proyecto</h3>
                <button onClick={() => setMostrarFormProyecto(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Nombre del proyecto" value={nuevoProyecto.nombre} onChange={(e) => setNuevoProyecto({...nuevoProyecto, nombre: e.target.value})} className="bg-slate-700 text-white px-4 py-2 rounded-lg" />
                <input type="text" placeholder="Cliente" value={nuevoProyecto.cliente} onChange={(e) => setNuevoProyecto({...nuevoProyecto, cliente: e.target.value})} className="bg-slate-700 text-white px-4 py-2 rounded-lg" />
                <select value={nuevoProyecto.tipoCliente} onChange={(e) => setNuevoProyecto({...nuevoProyecto, tipoCliente: e.target.value})} className="bg-slate-700 text-white px-4 py-2 rounded-lg">
                  <option value="variable">Cliente Variable</option>
                  <option value="retainer">Cliente Retainer (Carbono, etc.)</option>
                </select>
                <input type="month" value={nuevoProyecto.fecha} onChange={(e) => setNuevoProyecto({...nuevoProyecto, fecha: e.target.value})} className="bg-slate-700 text-white px-4 py-2 rounded-lg" />
                {nuevoProyecto.tipoCliente === 'variable' && (
                  <input type="number" placeholder="Ingreso del proyecto (S/)" value={nuevoProyecto.ingreso} onChange={(e) => setNuevoProyecto({...nuevoProyecto, ingreso: e.target.value})} className="col-span-2 bg-slate-700 text-white px-4 py-2 rounded-lg" />
                )}
                <div className="col-span-2"><p className="text-sm text-gray-400 mb-2">Costos de Producción:</p></div>
                <input type="number" placeholder="Grabación" value={nuevoProyecto.costos.grabacion} onChange={(e) => setNuevoProyecto({...nuevoProyecto, costos: {...nuevoProyecto.costos, grabacion: e.target.value}})} className="bg-slate-700 text-white px-4 py-2 rounded-lg" />
                <input type="number" placeholder="Edición" value={nuevoProyecto.costos.edicion} onChange={(e) => setNuevoProyecto({...nuevoProyecto, costos: {...nuevoProyecto.costos, edicion: e.target.value}})} className="bg-slate-700 text-white px-4 py-2 rounded-lg" />
                <input type="number" placeholder="Freelancers" value={nuevoProyecto.costos.freelancers} onChange={(e) => setNuevoProyecto({...nuevoProyecto, costos: {...nuevoProyecto.costos, freelancers: e.target.value}})} className="bg-slate-700 text-white px-4 py-2 rounded-lg" />
                <input type="number" placeholder="Movilidad" value={nuevoProyecto.costos.movilidad} onChange={(e) => setNuevoProyecto({...nuevoProyecto, costos: {...nuevoProyecto.costos, movilidad: e.target.value}})} className="bg-slate-700 text-white px-4 py-2 rounded-lg" />
                <input type="number" placeholder="Equipos" value={nuevoProyecto.costos.equipos} onChange={(e) => setNuevoProyecto({...nuevoProyecto, costos: {...nuevoProyecto.costos, equipos: e.target.value}})} className="bg-slate-700 text-white px-4 py-2 rounded-lg col-span-2" />
              </div>
              {nuevoProyecto.tipoCliente === 'retainer' && (<p className="text-sm text-yellow-300 mt-3">ℹ️ El ingreso se calculará automáticamente según el retainer del cliente</p>)}
              <button onClick={agregarProyecto} className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">Guardar Proyecto</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-6 shadow-2xl">
            <DollarSign className="text-white opacity-80 mb-2" size={28} />
            <p className="text-purple-100 text-sm mb-1">Facturación Total</p>
            <p className="text-3xl font-bold text-white">{currency(kpis.totalIngreso)}</p>
            <p className="text-xs text-purple-200 mt-2">Retainer: {currency(kpis.ingresoRetainer)} | Variable: {currency(kpis.ingresoVariable)}</p>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl p-6 shadow-2xl">
            <TrendingUp className="text-white opacity-80 mb-2" size={28} />
            <p className="text-green-100 text-sm mb-1">Margen Total</p>
            <p className="text-3xl font-bold text-white">{currency(kpis.margen)}</p>
            <p className="text-xs text-green-200 mt-2">{kpis.margenPorcentaje.toFixed(1)}% de margen</p>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-red-600 rounded-xl p-6 shadow-2xl">
            <Users className="text-white opacity-80 mb-2" size={28} />
            <p className="text-orange-100 text-sm mb-1">Clientes Activos</p>
            <p className="text-3xl font-bold text-white">{kpis.clientesActivos}</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl p-6 shadow-2xl">
            <Calendar className="text-white opacity-80 mb-2" size={28} />
            <p className="text-cyan-100 text-sm mb-1">Proyectos Totales</p>
            <p className="text-3xl font-bold text-white">{kpis.proyectosTotales}</p>
          </div>
        </div>

        {contadorRetainers.length > 0 && (
          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><Calendar size={24} /> Clientes con Retainer Mensual</h2>
            <div className="space-y-4">
              {contadorRetainers.map(r => (
                <div key={r.id} className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{r.cliente}</h3>
                      <p className="text-blue-100">Contrato: {r.proyectosMensuales} proyectos/mes → {currency(r.pagoMensual)}</p>
                      <p className="text-sm text-blue-200">Por proyecto: {currency((r.pagoMensual || 0) / Math.max(1, r.proyectosMensuales || 1))}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-4xl font-bold text-white">{r.proyectosRealizados}/{r.proyectosMensuales}</span>
                      <button onClick={() => setEditandoRetainer(r)} className="mt-2 text-white/80 hover:text-white block ml-auto"><Edit2 size={16} /></button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-blue-50"><span>Progreso del mes</span><span>{r.cumplimiento.toFixed(0)}%</span></div>
                    <div className="w-full bg-blue-900/30 rounded-full h-3"><div className="bg-green-400 h-3 rounded-full transition-all" style={{width: `${Math.min(r.cumplimiento, 100)}%`}} /></div>
                    {r.proyectosPendientes > 0 ? (<p className="text-yellow-300 text-sm flex items-center gap-1 mt-2"><AlertCircle size={16} /> Faltan {r.proyectosPendientes} proyecto(s) para cumplir el contrato</p>) : (<p className="text-green-300 text-sm font-semibold flex items-center gap-1"><CheckCircle size={16} /> Contrato mensual completado</p>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {editandoRetainer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-blue-500/30">
              <h3 className="text-xl font-semibold text-white mb-4">Editar Retainer</h3>
              <div className="space-y-3">
                <input type="text" value={editandoRetainer.cliente} onChange={(e) => setEditandoRetainer({...editandoRetainer, cliente: e.target.value})} className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg" />
                <input type="number" value={editandoRetainer.pagoMensual} onChange={(e) => setEditandoRetainer({...editandoRetainer, pagoMensual: Number(e.target.value)})} className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg" placeholder="Pago mensual" />
                <input type="number" value={editandoRetainer.proyectosMensuales} onChange={(e) => setEditandoRetainer({...editandoRetainer, proyectosMensuales: Number(e.target.value)})} className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg" placeholder="Proyectos mensuales" />
                <input type="text" value={editandoRetainer.etiqueta} onChange={(e) => setEditandoRetainer({...editandoRetainer, etiqueta: e.target.value})} className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg" placeholder="Etiqueta" />
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setEditandoRetainer(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg">Cancelar</button>
                <button onClick={actualizarRetainer} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"><Save size={18} /> Guardar</button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-800 rounded-xl p-6 shadow-2xl border border-purple-500/30">
          <h2 className="text-2xl font-bold text-white mb-4">Rentabilidad por Proyecto</h2>
          <div className="space-y-3">
            {proyectosEnriquecidos.filter(p => p.tipoCliente === 'variable').map(p => (
              <div key={p.id} className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{p.nombre || p.name}</h3>
                    <p className="text-sm text-gray-400">{p.cliente} {p.tipoCliente === 'retainer' && '(Retainer)'} • {p.fecha}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${p.porcentajeMargen > 40 ? 'bg-green-500/20 text-green-400' : p.porcentajeMargen > 20 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{p.porcentajeMargen.toFixed(1)}%</span>
                    {/* Edit controls only for variable projects */}
                    {editingProjectId !== p.id && (
                      <button onClick={() => startEditProject(p)} className="text-white/80 hover:text-white ml-2"><Edit2 size={16} /></button>
                    )}
                  </div>
                </div>

                {/* Show editable fields when this project is being edited */}
                {editingProjectId === p.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Ingreso editable</p>
                        <input type="number" value={editingProjectData?.ingreso ?? 0} onChange={(e) => setEditingProjectData({...editingProjectData, ingreso: Number(e.target.value)})} className="bg-slate-700 text-white px-3 py-2 rounded-lg w-full" />
                      </div>
                      <div>
                        <p className="text-gray-400">Costos totales</p>
                        <input type="number" value={Object.values(editingProjectData?.costos || {}).reduce((s, v) => s + Number(v || 0), 0)} disabled className="bg-slate-700 text-white px-3 py-2 rounded-lg w-full" />
                      </div>
                      <div>
                        <p className="text-gray-400">Margen</p>
                        <p className="text-green-400 font-semibold">{currency((editingProjectData?.ingreso || 0) - Object.values(editingProjectData?.costos || {}).reduce((s, v) => s + Number(v || 0), 0))}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-gray-400">Grabación</p>
                        <input type="number" value={editingProjectData?.costos?.grabacion ?? 0} onChange={(e) => setEditingProjectData({...editingProjectData, costos: {...editingProjectData.costos, grabacion: Number(e.target.value)}})} className="bg-slate-700 text-white px-3 py-2 rounded-lg w-full" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Edición</p>
                        <input type="number" value={editingProjectData?.costos?.edicion ?? 0} onChange={(e) => setEditingProjectData({...editingProjectData, costos: {...editingProjectData.costos, edicion: Number(e.target.value)}})} className="bg-slate-700 text-white px-3 py-2 rounded-lg w-full" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Freelancers</p>
                        <input type="number" value={editingProjectData?.costos?.freelancers ?? 0} onChange={(e) => setEditingProjectData({...editingProjectData, costos: {...editingProjectData.costos, freelancers: Number(e.target.value)}})} className="bg-slate-700 text-white px-3 py-2 rounded-lg w-full" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <div>
                        <p className="text-xs text-gray-400">Movilidad</p>
                        <input type="number" value={editingProjectData?.costos?.movilidad ?? 0} onChange={(e) => setEditingProjectData({...editingProjectData, costos: {...editingProjectData.costos, movilidad: Number(e.target.value)}})} className="bg-slate-700 text-white px-3 py-2 rounded-lg w-full" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Equipos</p>
                        <input type="number" value={editingProjectData?.costos?.equipos ?? 0} onChange={(e) => setEditingProjectData({...editingProjectData, costos: {...editingProjectData.costos, equipos: Number(e.target.value)}})} className="bg-slate-700 text-white px-3 py-2 rounded-lg w-full" />
                      </div>
                      <div className="flex items-end gap-2">
                        <button onClick={cancelEditProject} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg">Cancelar</button>
                        <button onClick={saveEditedProject} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"><Save size={16} /> Guardar</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><p className="text-gray-400">Ingreso</p><p className="text-white font-semibold">{currency(p.ingreso)}</p></div>
                    <div><p className="text-gray-400">Costos</p><p className="text-white font-semibold">{currency(p.costoTotal)}</p></div>
                    <div><p className="text-gray-400">Margen</p><p className="text-green-400 font-semibold">{currency(p.margen)}</p></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl p-6 shadow-2xl border border-purple-500/30">
            <h2 className="text-2xl font-bold text-white mb-4">Facturación Mensual</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={facturacionMensual}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="mes" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #7c3aed', borderRadius: '8px'}} labelStyle={{color: '#fff'}} />
                <Legend />
                <Bar dataKey="retainer" stackId="a" fill="#3b82f6" name="Retainer" radius={[0,0,0,0]} />
                <Bar dataKey="variable" stackId="a" fill="#8b5cf6" name="Variable" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-2xl border border-purple-500/30">
            <h2 className="text-2xl font-bold text-white mb-4">Clientes Más Rentables</h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {clientesRentables.map((c, idx) => (
                <div key={c.cliente} className="bg-slate-700/50 rounded-lg p-3 hover:bg-slate-700 transition">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{backgroundColor: COLORS[idx % COLORS.length] + '40', color: COLORS[idx % COLORS.length]}}>{idx + 1}</span>
                      <div><p className="text-white font-semibold">{c.cliente}</p><p className="text-xs text-gray-400">{c.tipo === 'retainer' ? (<span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400">Retainer</span>) : (<span>{c.proyectos} proyectos</span>)}</p></div>
                    </div>
                    <div className="text-right"><p className="text-white font-semibold">{currency(c.totalFacturado)}</p><p className="text-xs text-green-400">Margen: {c.margenPorcentaje.toFixed(1)}%</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 shadow-2xl border border-purple-500/30">
          <h2 className="text-2xl font-bold text-white mb-4">Proyección de Ingresos (6 meses)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={[
              { mes: '2025-03', conservador: kpis.totalIngreso * 0.7, proyectado: kpis.totalIngreso * 0.9, optimista: kpis.totalIngreso * 1.1 },
              { mes: '2025-04', conservador: kpis.totalIngreso * 0.75, proyectado: kpis.totalIngreso * 0.95, optimista: kpis.totalIngreso * 1.15 },
              { mes: '2025-05', conservador: kpis.totalIngreso * 0.8, proyectado: kpis.totalIngreso * 1, optimista: kpis.totalIngreso * 1.2 },
              { mes: '2025-06', conservador: kpis.totalIngreso * 0.8, proyectado: kpis.totalIngreso * 1.05, optimista: kpis.totalIngreso * 1.25 },
              { mes: '2025-07', conservador: kpis.totalIngreso * 0.85, proyectado: kpis.totalIngreso * 1.1, optimista: kpis.totalIngreso * 1.3 },
              { mes: '2025-08', conservador: kpis.totalIngreso * 0.85, proyectado: kpis.totalIngreso * 1.1, optimista: kpis.totalIngreso * 1.35 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="mes" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #7c3aed', borderRadius: '8px'}} labelStyle={{color: '#fff'}} />
              <Legend />
              <Line type="monotone" dataKey="conservador" stroke="#ef4444" strokeWidth={2} name="Conservador" />
              <Line type="monotone" dataKey="proyectado" stroke="#8b5cf6" strokeWidth={3} name="Proyectado" />
              <Line type="monotone" dataKey="optimista" stroke="#10b981" strokeWidth={2} name="Optimista" />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-400 mt-4">* Proyección basada en el promedio actual de ingresos mensuales ({currency(kpis.totalIngreso)})</p>
        </div>
      </div>
    </div>
  );
}
