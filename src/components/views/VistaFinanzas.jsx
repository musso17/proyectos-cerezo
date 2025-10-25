"use client";

import React, { useMemo, useState } from 'react';
import useStore from '../../hooks/useStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Financial dashboard for authorized user
const AUTH_EMAIL = 'hola@cerezoperu.com';

const rentabilityColor = (margin) => {
  if (margin > 0.4) return 'verde';
  if (margin > 0.2) return 'amarillo';
  return 'rojo';
};

const currency = (v) => `S/${Number(v || 0).toFixed(2)}`;

const VistaFinanzas = () => {
  const currentUser = useStore((s) => s.currentUser);
  const projects = useStore((s) => s.projects || []);
  const addProject = useStore((s) => s.addProject);

  const [form, setForm] = useState({
    name: '',
    client: '',
    date: '',
    income: '',
    cost_recording: '',
    cost_editing: '',
    cost_freelancers: '',
    cost_mobility: '',
    cost_equipment: '',
    contract: false,
    contract_total: '',
    contract_months: '',
  });

  const isAuthorized = currentUser && currentUser.email === AUTH_EMAIL;

  const financialEnriched = useMemo(() => {
    return projects.map((p) => {
      const income = Number(p.income || p.properties?.income || 0);
      const c_rec = Number(p.cost_recording || p.properties?.cost_recording || 0);
      const c_edit = Number(p.cost_editing || p.properties?.cost_editing || 0);
      const c_free = Number(p.cost_freelancers || p.properties?.cost_freelancers || 0);
      const c_mob = Number(p.cost_mobility || p.properties?.cost_mobility || 0);
      const c_eq = Number(p.cost_equipment || p.properties?.cost_equipment || 0);
      const totalCost = c_rec + c_edit + c_free + c_mob + c_eq;
      const net = income - totalCost;
      const margin = income > 0 ? net / income : 0;
      return { ...p, income, costs: { c_rec, c_edit, c_free, c_mob, c_eq, totalCost }, net, margin };
    });
  }, [projects]);

  const rentByProject = financialEnriched;

  const monthlyBilling = useMemo(() => {
    const map = new Map();
    financialEnriched.forEach((p) => {
      const date = p.date || p.startDate || p.properties?.startDate || p.created_at || null;
      if (!date) return;
      const monthKey = format(new Date(date), 'yyyy-MM');
      map.set(monthKey, (map.get(monthKey) || 0) + (p.income || 0));
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [financialEnriched]);

  const clientsRanking = useMemo(() => {
    const map = new Map();
    financialEnriched.forEach((p) => {
      const key = (p.client || 'Sin cliente').toString();
      const entry = map.get(key) || { total: 0, count: 0, marginSum: 0, contract: p.contract || false };
      entry.total += p.income || 0;
      entry.count += 1;
      entry.marginSum += p.margin || 0;
      if (p.contract) entry.contract = true;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .map(([client, v]) => ({ client, total: v.total, projects: v.count, avgMargin: v.count ? v.marginSum / v.count : 0, contract: v.contract }))
      .sort((a, b) => b.total - a.total);
  }, [financialEnriched]);

  const kpis = useMemo(() => {
    const revenue = financialEnriched.reduce((s, p) => s + (p.income || 0), 0);
    const totalCost = financialEnriched.reduce((s, p) => s + (p.costs?.totalCost || 0), 0);
    const margin = revenue > 0 ? (revenue - totalCost) / revenue : 0;
    const clientsActive = new Set(financialEnriched.map((p) => p.client)).size;
    const totalProjects = financialEnriched.length;
    return { revenue, totalCost, margin, clientsActive, totalProjects };
  }, [financialEnriched]);

  const handleInput = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleAdd = () => {
    // Basic payload - store in properties for compatibility
    const payload = {
      name: form.name,
      client: form.client,
      startDate: form.date,
      status: 'Programado',
      properties: {
        income: Number(form.income || 0),
        cost_recording: Number(form.cost_recording || 0),
        cost_editing: Number(form.cost_editing || 0),
        cost_freelancers: Number(form.cost_freelancers || 0),
        cost_mobility: Number(form.cost_mobility || 0),
        cost_equipment: Number(form.cost_equipment || 0),
        contract: form.contract,
        contract_total: Number(form.contract_total || 0),
        contract_months: Number(form.contract_months || 0),
      },
    };
    addProject(payload);
    setForm({ name: '', client: '', date: '', income: '', cost_recording: '', cost_editing: '', cost_freelancers: '', cost_mobility: '', cost_equipment: '', contract: false, contract_total: '', contract_months: '' });
  };

  if (!isAuthorized) {
    return (
      <div className="p-6 text-sm text-secondary">Acceso restringido: Dashboard financiero disponible solo para usuarios autorizados.</div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-xl font-semibold">Dashboard financiero</h2>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-panel p-4">
          <p className="text-xs text-secondary">Facturación total</p>
          <p className="mt-2 text-2xl font-semibold">{currency(kpis.revenue)}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs text-secondary">Margen total</p>
          <p className="mt-2 text-2xl font-semibold">{(kpis.margin * 100).toFixed(1)}%</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs text-secondary">Clientes activos</p>
          <p className="mt-2 text-2xl font-semibold">{kpis.clientsActive}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs text-secondary">Proyectos totales</p>
          <p className="mt-2 text-2xl font-semibold">{kpis.totalProjects}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass-panel p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold">1. Rentabilidad por Proyecto</h3>
          <div className="mt-4 space-y-3">
            {rentByProject.map((p) => (
              <div key={p.id || p.name} className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
                <div>
                  <p className="font-semibold">{p.name || p.displayName}</p>
                  <p className="text-xs text-secondary">{p.client || 'Sin cliente'}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{currency(p.income)}</p>
                  <p className="text-xs text-secondary">Costos: {currency(p.costs?.totalCost)}</p>
                  <p className="text-xs">Margen: {(p.margin * 100).toFixed(1)}%</p>
                  <div className="mt-2">
                    <span className={`inline-block h-3 w-16 rounded-full ${p.margin > 0.4 ? 'bg-emerald-400' : p.margin > 0.2 ? 'bg-amber-400' : 'bg-rose-400'}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-4">
          <h3 className="text-sm font-semibold">2. Facturación Mensual</h3>
          <div className="mt-4">
            {monthlyBilling.length === 0 ? (
              <p className="text-xs text-secondary">Sin datos</p>
            ) : (
              <ul className="space-y-2">
                {monthlyBilling.map(([month, total]) => (
                  <li key={month} className="flex items-center justify-between">
                    <span>{format(new Date(month + '-01'), 'MMMM yyyy', { locale: es })}</span>
                    <strong>{currency(total)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass-panel p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold">3. Proyección de ingresos (3-6 meses)</h3>
          <p className="text-xs text-secondary">Escenarios mostrando conservador/proyectado/optimista basado en histórico</p>
          <div className="mt-4 space-y-2">
            {/* Simple projection mock */}
            <div className="flex items-center justify-between"><span>Conservador</span><strong>{currency(kpis.revenue * 0.6)}</strong></div>
            <div className="flex items-center justify-between"><span>Proyectado</span><strong>{currency(kpis.revenue * 1)}</strong></div>
            <div className="flex items-center justify-between"><span>Optimista</span><strong>{currency(kpis.revenue * 1.3)}</strong></div>
          </div>
        </div>

        <div className="glass-panel p-4">
          <h3 className="text-sm font-semibold">4. Clientes Más Rentables</h3>
          <div className="mt-4 space-y-2">
            {clientsRanking.map((c) => (
              <div key={c.client} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{c.client}</p>
                  <p className="text-xs text-secondary">Proyectos: {c.projects}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{currency(c.total)}</p>
                  <p className="text-xs">Margen promedio: {(c.avgMargin * 100).toFixed(1)}%</p>
                  {c.contract && <span className="inline-block mt-1 rounded-full bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">Contrato</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass-panel p-4">
          <h3 className="text-sm font-semibold">5. Seguimiento de Contratos</h3>
          <div className="mt-4 space-y-2">
            {clientsRanking.filter(c => c.contract).map(c => (
              <div key={c.client} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{c.client}</p>
                  <p className="text-xs text-secondary">Proyectos este mes: {Math.floor(Math.random()*4)}/6</p>
                </div>
                <div className="w-36">
                  <div className="h-3 w-full rounded-full bg-slate-800/50">
                    <div className="h-3 rounded-full bg-emerald-400" style={{ width: `${Math.floor(Math.random()*100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-4">
          <h3 className="text-sm font-semibold">6. Agregar Proyecto Financiero</h3>
          <div className="mt-4 space-y-2">
            <input placeholder="Nombre" value={form.name} onChange={handleInput('name')} className="w-full rounded-2xl bg-slate-900/60 px-3 py-2" />
            <input placeholder="Cliente" value={form.client} onChange={handleInput('client')} className="w-full rounded-2xl bg-slate-900/60 px-3 py-2" />
            <input type="date" value={form.date} onChange={handleInput('date')} className="w-full rounded-2xl bg-slate-900/60 px-3 py-2" />
            <input placeholder="Ingreso" value={form.income} onChange={handleInput('income')} className="w-full rounded-2xl bg-slate-900/60 px-3 py-2" />
            <input placeholder="Costos de grabación" value={form.cost_recording} onChange={handleInput('cost_recording')} className="w-full rounded-2xl bg-slate-900/60 px-3 py-2" />
            <input placeholder="Costos de edición" value={form.cost_editing} onChange={handleInput('cost_editing')} className="w-full rounded-2xl bg-slate-900/60 px-3 py-2" />
            <input placeholder="Freelancers" value={form.cost_freelancers} onChange={handleInput('cost_freelancers')} className="w-full rounded-2xl bg-slate-900/60 px-3 py-2" />
            <input placeholder="Movilidad" value={form.cost_mobility} onChange={handleInput('cost_mobility')} className="w-full rounded-2xl bg-slate-900/60 px-3 py-2" />
            <input placeholder="Equipos" value={form.cost_equipment} onChange={handleInput('cost_equipment')} className="w-full rounded-2xl bg-slate-900/60 px-3 py-2" />
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.contract} onChange={handleInput('contract')} /> Cliente con contrato</label>
            <button onClick={handleAdd} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold">Agregar</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default VistaFinanzas;
