'use client';

import React, { useMemo } from 'react';
import useStore from '../../hooks/useStore';
import { Calendar, Clock, Video, Zap } from 'lucide-react';
import { format, isToday, isFuture, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Helper para obtener el nombre simple del agente a partir del objeto de usuario
const getAgentName = (user) => {
  if (!user) return null;
  const email = user.email?.toLowerCase() || '';
  if (email === 'mauriciomu22ts@gmail.com') return 'Mauricio';
  if (email === 'edsonlom321@gmail.com') return 'Edson';
  // Fallback por si el nombre está en los metadatos
  const name = user.user_metadata?.name || '';
  if (['Mauricio', 'Edson'].includes(name)) return name;
  return null;
};

const VistaAgenteDashboard = () => {
  const currentUser = useStore((state) => state.currentUser);
  const projects = useStore((state) => state.projects);
  const runAgent = useStore((state) => state.runAgent);
  const agentSuggestions = useStore((state) => state.agent.suggestions);

  const assignedProjects = useMemo(() => {
    const agentName = getAgentName(currentUser);
    if (!agentName || !projects) return [];
    return projects.filter(p => {
      const managers = p.managers || [];
      return managers.includes(agentName);
    });
  }, [currentUser, projects]);

  const { tareasHoy, grabaciones, recordatorios } = useMemo(() => {
    const hoy = new Date();
    const tareasHoy = [];
    let grabacionesHoy = [];
    let proximasGrabaciones = [];
    const recordatorios = [];

    assignedProjects.forEach(p => {
      const stage = p.stage || p.properties?.stage || '';

      // Tareas de entrega (solo proyectos en edición)
      if (stage === 'edicion' && p.deadline) {
        try {
          const deadlineDate = parseISO(p.deadline);
          if (isToday(deadlineDate)) {
            tareasHoy.push(p);
          }
          if (isFuture(deadlineDate) && differenceInDays(deadlineDate, hoy) <= 3) {
            recordatorios.push(p);
          }
        } catch (e) {
          console.error('Invalid deadline date', p.deadline);
        }
      }

      // Lógica de Grabaciones
      if (stage === 'grabacion' && p.fechaGrabacion) {
        try {
          const recordingDate = parseISO(p.fechaGrabacion);
          if (isToday(recordingDate)) {
            grabacionesHoy.push(p);
          } else if (isFuture(recordingDate) && differenceInDays(recordingDate, hoy) <= 7) {
            proximasGrabaciones.push(p);
          }
        } catch (e) {
          console.error('Invalid recording date', p.fechaGrabacion);
        }
      }
    });

    // Decide qué grabaciones mostrar
    let grabacionesMostradas;
    let tituloGrabaciones;

    if (grabacionesHoy.length > 0) {
      grabacionesMostradas = grabacionesHoy;
      tituloGrabaciones = "Grabaciones para hoy";
    } else {
      proximasGrabaciones.sort((a, b) => parseISO(a.fechaGrabacion) - parseISO(b.fechaGrabacion));
      grabacionesMostradas = proximasGrabaciones;
      tituloGrabaciones = "Próximas Grabaciones";
    }

    return { 
      tareasHoy, 
      grabaciones: { title: tituloGrabaciones, items: grabacionesMostradas }, 
      recordatorios 
    };
  }, [assignedProjects]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Tu Dashboard</h1>
        <p className="text-sm text-secondary/80">Tareas, recordatorios y sugerencias para tus proyectos.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Columna Principal: Tareas y Recordatorios */}
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-3xl">
            <Header title={grabaciones.title} icon={Video} />
            {grabaciones.items.length > 0 ? (
              <ul className="space-y-3 mt-4">
                {grabaciones.items.map(p => <ProjectListItem key={p.id} project={p} dateToDisplay={p.fechaGrabacion} />)}
              </ul>
            ) : (
              <p className="text-sm text-secondary/70 mt-4">No hay grabaciones agendadas próximamente.</p>
            )}
          </div>

          <div className="glass-panel p-5 rounded-3xl">
            <Header title="Entregas para hoy" icon={Calendar} />
            {tareasHoy.length > 0 ? (
              <ul className="space-y-3 mt-4">
                {tareasHoy.map(p => <ProjectListItem key={p.id} project={p} dateToDisplay={p.deadline} />)}
              </ul>
            ) : (
              <p className="text-sm text-secondary/70 mt-4">No tienes entregas para hoy.</p>
            )}
          </div>

          <div className="glass-panel p-5 rounded-3xl">
            <Header title="Recordatorios: Próximas entregas" icon={Clock} />
            {recordatorios.length > 0 ? (
              <ul className="space-y-3 mt-4">
                {recordatorios.map(p => <ProjectListItem key={p.id} project={p} dateToDisplay={p.deadline} />)}
              </ul>
            ) : (
              <p className="text-sm text-secondary/70 mt-4">No hay entregas en los próximos 3 días.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

const Header = ({ title, icon: Icon }) => (
  <div className="flex items-center gap-3">
    <Icon className="text-accent" size={20} />
    <h2 className="text-lg font-semibold text-primary">{title}</h2>
  </div>
);

const ProjectListItem = ({ project, dateToDisplay }) => (
  <li className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-sm">
    <div>
      <p className="font-semibold text-primary">{project.name}</p>
      <p className="text-xs text-secondary/80">Cliente: {project.client}</p>
    </div>
    {dateToDisplay ? (
      <p className="text-xs font-semibold text-accent">
        <span className="inline-flex items-center rounded-full bg-[#EEF1FF] px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-accent">
          {format(parseISO(dateToDisplay), 'dd/MM/yyyy')}
        </span>
      </p>
    ) : null}
  </li>
);

export default VistaAgenteDashboard;
