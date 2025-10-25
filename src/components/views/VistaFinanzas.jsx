"use client";

import React, { useMemo, useState, useEffect } from 'react';
import useStore from '../../hooks/useStore';
import { format, parseISO, endOfMonth } from 'date-fns';
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

  const updateProject = useStore((s) => s.updateProject);

  const [editingProject, setEditingProject] = useState(null);
  const [financeEdit, setFinanceEdit] = useState({
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

  const openFinanceEdit = (p) => {
    setEditingProject(p.id || p.name);
    setFinanceEdit({
      income: p.income || p.properties?.income || '',
      cost_recording: p.cost_recording || p.properties?.cost_recording || '',
      cost_editing: p.cost_editing || p.properties?.cost_editing || '',
      cost_freelancers: p.cost_freelancers || p.properties?.cost_freelancers || '',
      cost_mobility: p.cost_mobility || p.properties?.cost_mobility || '',
      cost_equipment: p.cost_equipment || p.properties?.cost_equipment || '',
      contract: !!(p.contract || p.properties?.contract),
      contract_total: p.contract_total || p.properties?.contract_total || '',
      contract_months: p.contract_months || p.properties?.contract_months || '',
    });
  };

  const closeFinanceEdit = () => {
    setEditingProject(null);
    setFinanceEdit({
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
  };

  const handleFinanceChange = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFinanceEdit((s) => ({ ...s, [k]: value }));
  };

  const saveFinanceForProject = async (p) => {
    const payload = {
      ...p,
      properties: {
        ...(p.properties || {}),
        income: Number(financeEdit.income || 0),
        cost_recording: Number(financeEdit.cost_recording || 0),
        cost_editing: Number(financeEdit.cost_editing || 0),
        cost_freelancers: Number(financeEdit.cost_freelancers || 0),
        cost_mobility: Number(financeEdit.cost_mobility || 0),
        cost_equipment: Number(financeEdit.cost_equipment || 0),
        contract: !!financeEdit.contract,
        contract_total: Number(financeEdit.contract_total || 0),
        contract_months: Number(financeEdit.contract_months || 0),
      },
    };
    await updateProject(payload);
    closeFinanceEdit();
  };

  const monthlyBilling = useMemo(() => {
    const map = new Map();
    // Build set of tags for retainers to exclude those projects from variable income
    const retainerTags = new Set((retainers || []).map((r) => (r.tag || r.client || '').toString().trim().toLowerCase()));
    financialEnriched.forEach((p) => {
      const clientTag = (p.properties?.tag || p.tag || p.client || '').toString().trim().toLowerCase();
      if (retainerTags.has(clientTag)) return; // skip retained projects
      const date = p.date || p.startDate || p.properties?.startDate || p.created_at || null;
      if (!date) return;
      const monthKey = format(new Date(date), 'yyyy-MM');
      map.set(monthKey, (map.get(monthKey) || 0) + (p.income || 0));
    });

    // Add fixed retainers into monthly billing for the current month key
    const currentKey = format(new Date(), 'yyyy-MM');
    if ((retainers || []).length > 0) {
      const fixed = computeFixedRetainersForMonth();
      map.set(currentKey, (map.get(currentKey) || 0) + fixed);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [financialEnriched, retainers]);

  const clientsRanking = useMemo(() => {
    const map = new Map();
    const retainerTags = new Set((retainers || []).map((r) => (r.tag || r.client || '').toString().trim().toLowerCase()));
    // Aggregate variable project income excluding retainers
    financialEnriched.forEach((p) => {
      const clientTag = (p.properties?.tag || p.tag || p.client || '').toString().trim().toLowerCase();
      if (retainerTags.has(clientTag)) return;
      const key = (p.client || 'Sin cliente').toString();
      const entry = map.get(key) || { total: 0, count: 0, marginSum: 0, contract: p.contract || false };
      entry.total += p.income || 0;
      entry.count += 1;
      entry.marginSum += p.margin || 0;
      if (p.contract) entry.contract = true;
      map.set(key, entry);
    });

    // Include retainers as clients with fixed totals
    (retainers || []).forEach((r) => {
      const key = r.client || r.tag || 'Sin cliente';
      const existing = map.get(key) || { total: 0, count: 0, marginSum: 0, contract: false };
      existing.total += Number(r.monthly || 0);
      existing.count += 0;
      existing.marginSum += 0;
      map.set(key, existing);
    });

    return Array.from(map.entries())
      .map(([client, v]) => ({ client, total: v.total, projects: v.count, avgMargin: v.count ? v.marginSum / v.count : 0, contract: v.contract }))
      .sort((a, b) => b.total - a.total);
  }, [financialEnriched, retainers]);

  const kpis = useMemo(() => {
  const variableRevenue = financialEnriched.reduce((s, p) => s + (p.income || 0), 0);
  const revenue = variableRevenue + Number(fixedRetainersThisMonth || 0);
    const totalCost = financialEnriched.reduce((s, p) => s + (p.costs?.totalCost || 0), 0);
    const margin = revenue > 0 ? (revenue - totalCost) / revenue : 0;
    const clientsActive = new Set(financialEnriched.map((p) => p.client)).size;
    const totalProjects = financialEnriched.length;
    return { revenue, totalCost, margin, clientsActive, totalProjects };
  }, [financialEnriched]);

  // Retainers (Clientes fijos) - stored in localStorage under key 'cerezo-retainers'
  const RETAINERS_KEY = 'cerezo-retainers';
  const [retainers, setRetainers] = useState([]);
  const [editingRetainerIndex, setEditingRetainerIndex] = useState(null);
  const [retainerEdit, setRetainerEdit] = useState({ client: '', monthly: '', startDate: '', endDate: '', tag: '' });

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(RETAINERS_KEY) : null;
      if (raw) {
        setRetainers(JSON.parse(raw));
      } else {
        // seed default Carbono entry as requested
        const seed = [
          { client: 'Carbono', monthly: 4000, startDate: '2024-01-01', endDate: '', tag: 'carbono' },
        ];
        setRetainers(seed);
        if (typeof window !== 'undefined') window.localStorage.setItem(RETAINERS_KEY, JSON.stringify(seed));
      }
    } catch (err) {
      console.error('Error reading retainers:', err);
    }
  }, []);

  const saveRetainers = (next) => {
    setRetainers(next);
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(RETAINERS_KEY, JSON.stringify(next));
    } catch (err) {
      console.error('Error saving retainers:', err);
    }
  };

  const startOfCurrentMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  };

  const computeFixedRetainersForMonth = (monthDate) => {
    const start = monthDate ? new Date(monthDate.getFullYear(), monthDate.getMonth(), 1) : startOfCurrentMonth();
    const end = endOfMonth(start);
    return retainers.reduce((sum, r) => {
      try {
        const s = r.startDate ? parseISO(r.startDate) : null;
        const e = r.endDate ? parseISO(r.endDate) : null;
        const started = s ? s.getTime() <= start.getTime() : true;
        const notEnded = e ? e.getTime() >= end.getTime() : true; // include open-ended
        if (started && notEnded) return sum + Number(r.monthly || 0);
      } catch (err) {
        // ignore parse errors
      }
      return sum;
    }, 0);
  };

  const fixedRetainersThisMonth = computeFixedRetainersForMonth();

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

      <section className="mt-6 grid grid-cols-1 gap-4">
        <div className="glass-panel p-4">
          <h3 className="text-sm font-semibold">Retainers (Clientes fijos)</h3>
          <p className="text-xs text-secondary">Tabla editable de ingresos mensuales fijos. Modifica Carbono según indicación.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-secondary">
                  <th className="py-2">Cliente</th>
                  <th className="py-2">Ingreso Mensual Fijo (S/)</th>
                  <th className="py-2">Fecha de Inicio</th>
                  <th className="py-2">Fecha de Fin</th>
                  <th className="py-2">Etiqueta Asociada</th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {retainers.map((r, idx) => (
                  <tr key={r.client + idx} className="align-top border-t border-border/40">
                    <td className="py-2">{r.client}</td>
                    <td className="py-2">
                      {editingRetainerIndex === idx ? (
                        <input value={retainerEdit.monthly} onChange={(e) => setRetainerEdit((s) => ({ ...s, monthly: e.target.value }))} className="rounded-2xl bg-slate-900/60 px-2 py-1" />
                      ) : (
                        <strong>S/ {Number(r.monthly || 0).toLocaleString()}</strong>
                      )}
                    </td>
                    <td className="py-2">
                      {editingRetainerIndex === idx ? (
                        <input type="date" value={retainerEdit.startDate} onChange={(e) => setRetainerEdit((s) => ({ ...s, startDate: e.target.value }))} className="rounded-2xl bg-slate-900/60 px-2 py-1" />
                      ) : (
                        r.startDate ? format(new Date(r.startDate), 'dd/MM/yyyy') : ''
                      )}
                    </td>
                    <td className="py-2">
                      {editingRetainerIndex === idx ? (
                        <input type="date" value={retainerEdit.endDate} onChange={(e) => setRetainerEdit((s) => ({ ...s, endDate: e.target.value }))} className="rounded-2xl bg-slate-900/60 px-2 py-1" />
                      ) : (
                        r.endDate ? format(new Date(r.endDate), 'dd/MM/yyyy') : ''
                      )}
                    </td>
                    <td className="py-2">{editingRetainerIndex === idx ? (
                      <input value={retainerEdit.tag} onChange={(e) => setRetainerEdit((s) => ({ ...s, tag: e.target.value }))} className="rounded-2xl bg-slate-900/60 px-2 py-1" />
                    ) : (
                      r.tag || ''
                    )}</td>
                    <td className="py-2">
                      {editingRetainerIndex === idx ? (
                        <div className="flex gap-2">
                          <button className="rounded-full bg-slate-700 px-3 py-1 text-sm" onClick={() => { setEditingRetainerIndex(null); setRetainerEdit({ client: '', monthly: '', startDate: '', endDate: '', tag: '' }); }}>Cancelar</button>
                          <button className="rounded-full bg-emerald-500 px-3 py-1 text-sm" onClick={() => {
                            const next = [...retainers];
                            next[idx] = { client: retainerEdit.client || next[idx].client, monthly: Number(retainerEdit.monthly || 0), startDate: retainerEdit.startDate || next[idx].startDate, endDate: retainerEdit.endDate || next[idx].endDate, tag: retainerEdit.tag || next[idx].tag };
                            saveRetainers(next);
                            setEditingRetainerIndex(null);
                            setRetainerEdit({ client: '', monthly: '', startDate: '', endDate: '', tag: '' });
                          }}>Guardar</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button className="rounded-full bg-slate-800/60 px-3 py-1 text-sm" onClick={() => { setEditingRetainerIndex(idx); setRetainerEdit({ client: r.client, monthly: String(r.monthly || ''), startDate: r.startDate || '', endDate: r.endDate || '', tag: r.tag || '' }); }}>Editar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <p className="text-xs text-secondary">Ingresos Fijos (este mes): <strong>{currency(fixedRetainersThisMonth)}</strong></p>
          </div>
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
                  <div className="mt-3 flex items-center justify-end gap-2">
                    {(() => {
                      const retainerTags = new Set((retainers || []).map((r) => (r.tag || r.client || '').toString().trim().toLowerCase()));
                      const clientTag = (p.properties?.tag || p.tag || p.client || '').toString().trim().toLowerCase();
                      if (retainerTags.has(clientTag)) {
                        return <span className="text-xs text-secondary">Incluido en Retainer</span>;
                      }
                      return <button onClick={() => openFinanceEdit(p)} className="rounded-full bg-slate-800/60 px-3 py-1 text-xs">Agregar datos financieros</button>;
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Finance edit modal / inline panel */}
        {editingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-panel p-6">
              <h4 className="mb-3 text-lg font-semibold">Editar datos financieros</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input placeholder="Ingreso" value={financeEdit.income} onChange={handleFinanceChange('income')} className="w-full rounded-2xl bg-slate-900/60 px-3 py-2" />
                <input placeholder="Costos de grabación" value={financeEdit.cost_recording} onChange={handleFinanceChange('cost_recording')} className="w-full rounded-2xl bg-slate-900/60 px-3 py-2" />
                <input placeholder="Costos de edición" value={financeEdit.cost_editing} onChange={handleFinanceChange('cost_editing')} className="w-full rounded-2xl bg-slate-900/60 px-3 py-2" />
                <input placeholder="Freelancers" value={financeEdit.cost_freelancers} onChange={handleFinanceChange('cost_freelancers')} className="w-full rounded-2xl bg-slate-900/60 px-3 py-2" />
                <input placeholder="Movilidad" value={financeEdit.cost_mobility} onChange={handleFinanceChange('cost_mobility')} className="w-full rounded-2xl bg-slate-900/60 px-3 py-2" />
                <input placeholder="Equipos" value={financeEdit.cost_equipment} onChange={handleFinanceChange('cost_equipment')} className="w-full rounded-2xl bg-slate-900/60 px-3 py-2" />
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={financeEdit.contract} onChange={handleFinanceChange('contract')} /> Cliente con contrato</label>
                <input placeholder="Contrato total" value={financeEdit.contract_total} onChange={handleFinanceChange('contract_total')} className="w-full rounded-2xl bg-slate-900/60 px-3 py-2" />
                <input placeholder="Meses de contrato" value={financeEdit.contract_months} onChange={handleFinanceChange('contract_months')} className="w-full rounded-2xl bg-slate-900/60 px-3 py-2" />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button className="rounded-full bg-slate-700 px-3 py-1 text-sm" onClick={closeFinanceEdit}>Cancelar</button>
                <button className="rounded-full bg-emerald-500 px-3 py-1 text-sm" onClick={() => {
                  const p = projects.find(pr => (pr.id || pr.name) === editingProject);
                  if (p) saveFinanceForProject(p);
                }}>Guardar</button>
              </div>
            </div>
          </div>
        )}

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
