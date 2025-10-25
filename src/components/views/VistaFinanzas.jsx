"use client";

import React, { useEffect, useMemo } from "react";
import useStore from "../../hooks/useStore";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";

const currency = (v) => `S/${Number(v || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const isCarbono = (val) => val && val.toString().trim().toLowerCase() === "carbono";

export default function VistaFinanzas() {
  const projects = useStore((s) => s.projects || []);
  const retainersFromStore = useStore((s) => s.retainers || []);
  const fetchRetainers = useStore((s) => s.fetchRetainers);
  const importRetainersFromProjects = useStore((s) => s.importRetainersFromProjects);

  useEffect(() => {
    fetchRetainers && fetchRetainers();
    importRetainersFromProjects && importRetainersFromProjects();
  }, [fetchRetainers, importRetainersFromProjects]);

  const retainers = useMemo(() => {
    if (Array.isArray(retainersFromStore) && retainersFromStore.length) return retainersFromStore;
    const grouped = {};
    (projects || []).forEach((p) => {
      const tag = (p.tag || p.properties?.tag || "").toString().trim().toLowerCase();
      if (isCarbono(tag)) {
        const client = (p.client || p.properties?.client || "Carbono").toString().trim();
        if (!grouped[client]) grouped[client] = { client, pagoMensual: 0, proyectosMensuales: 6, activo: true, etiqueta: "carbono" };
      }
    });
    return Object.values(grouped);
  }, [retainersFromStore, projects]);

  const proyectos = useMemo(() => (projects || []).map((p) => {
    const tag = (p.tag || p.properties?.tag || "").toString().trim().toLowerCase();
    return {
      id: p.id || p.name,
      name: p.name || p.nombre || p.id,
      client: p.client || p.properties?.client || "",
      tag,
      type: isCarbono(tag) ? "retainer" : "variable",
      dateKey: (p.date || p.startDate || p.created_at || "").toString().slice(0,7),
      income: Number(p.income || p.ingreso || 0),
      costs: Number(p.cost_recording || 0) + Number(p.cost_editing || 0) + Number(p.cost_freelancers || 0) + Number(p.cost_mobility || 0) + Number(p.cost_equipment || 0)
    };
  }), [projects]);

  const ingresosVariables = useMemo(() => proyectos.filter(p => p.type === 'variable').reduce((s,p) => s + p.income, 0), [proyectos]);
  const ingresosRetainer = useMemo(() => (retainers || []).reduce((s,r) => s + Number(r.pagoMensual || r.monthly || 0), 0), [retainers]);
  const costosTotales = useMemo(() => proyectos.reduce((s,p) => s + p.costs, 0), [proyectos]);

  const kpis = useMemo(() => {
    const total = ingresosVariables + ingresosRetainer;
    const margin = total - costosTotales;
    return { total, ingresosVariables, ingresosRetainer, costosTotales, margin, marginPct: total ? (margin / total) * 100 : 0 };
  }, [ingresosVariables, ingresosRetainer, costosTotales]);

  const facturacionMensual = useMemo(() => {
    const map = {};
    proyectos.forEach(p => {
      const key = p.dateKey || 'unknown';
      if (!map[key]) map[key] = { mes: key, variable: 0, retainer: 0 };
      if (p.type === 'variable') map[key].variable += p.income;
    });
    Object.keys(map).forEach(k => { map[k].retainer = ingresosRetainer; });
    return Object.values(map).sort((a,b) => a.mes.localeCompare(b.mes));
  }, [proyectos, ingresosRetainer]);

  const clientesVariables = useMemo(() => {
    const agg = {};
    proyectos.filter(p => p.type === 'variable').forEach(p => {
      const c = p.client || 'Sin cliente';
      if (!agg[c]) agg[c] = { client: c, total: 0, projects: 0 };
      agg[c].total += p.income; agg[c].projects += 1;
    });
    return Object.values(agg).sort((a,b) => b.total - a.total);
  }, [proyectos]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard Financiero</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white/5 rounded">Total ingreso<br/><strong>{currency(kpis.total)}</strong></div>
        <div className="p-4 bg-white/5 rounded">Ingreso retainer<br/><strong>{currency(kpis.ingresosRetainer)}</strong></div>
        <div className="p-4 bg-white/5 rounded">Ingreso variable<br/><strong>{currency(kpis.ingresosVariables)}</strong></div>
        <div className="p-4 bg-white/5 rounded">Margen<br/><strong>{currency(kpis.margin)} ({kpis.marginPct.toFixed(1)}%)</strong></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 p-4 bg-white/5 rounded">
          <h2 className="font-semibold mb-2">Facturación Mensual</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={facturacionMensual}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="retainer" stackId="a" fill="#3b82f6" />
                <Bar dataKey="variable" stackId="a" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 bg-white/5 rounded">
          <h2 className="font-semibold mb-2">Clientes variables (top)</h2>
          <ul className="space-y-2">
            {clientesVariables.slice(0,10).map(c => (
              <li key={c.client} className="flex justify-between">
                <span>{c.client} ({c.projects})</span>
                <strong>{currency(c.total)}</strong>
              </li>
            ))}
            {clientesVariables.length === 0 && <li className="text-sm text-muted">No hay clientes variables</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
