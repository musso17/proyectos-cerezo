"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    Calendar as CalendarIcon,
    CheckCircle2,
    Clock,
    MoreHorizontal,
    Search,
    AlertCircle,
    ChevronDown
} from 'lucide-react';
import { differenceInCalendarDays, format, isPast, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import useStore from '../../hooks/useStore';
import { ensureMemberName } from '../../constants/team';
import { getStatusLabel, normalizeStatus } from '../../utils/statusHelpers';
import { isAbsenceProject } from '../../utils/absences';
import { filterProjects } from '../../utils/filterProjects';
import { setUIPreference } from '../../utils/uiPreferences';
import MemberAvatar from '../ui/MemberAvatar';
import { hasDeliverableLink } from '../ui/projectActions';

// -- Constants & Helpers --

const STATUS_DOT_COLORS = {
    'Programado': 'bg-slate-400',
    'En progreso': 'bg-amber-500',
    'En revisión': 'bg-blue-500',
    'Completado': 'bg-emerald-500',
    'Stuck': 'bg-red-500',
};

// Urgente: vencido o vence en los próximos 2 días.
const isUrgentTask = (task) => {
    if (!task.deadline) return false;
    try {
        return differenceInCalendarDays(parseISO(task.deadline), new Date()) <= 2;
    } catch {
        return false;
    }
};

const QUICK_FILTERS = [
    { id: 'urgent', label: 'Urgente', test: isUrgentTask },
    { id: 'review', label: 'En revisión', test: (task) => task.status === 'En revisión' },
    { id: 'stuck', label: 'Atascados', test: (task) => task.status === 'Stuck' },
];

// Menú "···" de cada editor: atajos a su agenda y a sus proyectos.
const EditorMenu = ({ member }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const setCurrentView = useStore((state) => state.setCurrentView);
    const setSearchTerm = useStore((state) => state.setSearchTerm);

    useEffect(() => {
        if (!open) return undefined;
        const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const goToTimeline = () => {
        setUIPreference('calendarPrimaryView', 'timeline');
        setSearchTerm(`responsable:${member}`);
        setCurrentView('Calendar');
    };

    const goToProjects = () => {
        setSearchTerm(`responsable:${member}`);
        setCurrentView('Table');
    };

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`Opciones de ${member}`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-secondary transition-colors hover:bg-white hover:text-primary dark:text-white/50 dark:hover:bg-white/5"
            >
                <MoreHorizontal size={16} />
            </button>
            {open && (
                <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1.5 text-sm shadow-xl dark:border-white/10 dark:bg-[#16171D]">
                    <button type="button" role="menuitem" onClick={goToTimeline} className="block w-full rounded-md px-3 py-2 text-left text-primary hover:bg-slate-100 dark:text-white/80 dark:hover:bg-white/5">
                        Ver su semana en el Timeline
                    </button>
                    <button type="button" role="menuitem" onClick={goToProjects} className="block w-full rounded-md px-3 py-2 text-left text-primary hover:bg-slate-100 dark:text-white/80 dark:hover:bg-white/5">
                        Ver todos sus proyectos
                    </button>
                </div>
            )}
        </div>
    );
};

// -- Components --

const TaskCard = ({ task, onComplete, index }) => {
    const isOverdue = task.deadline && isPast(parseISO(task.deadline)) && !isToday(parseISO(task.deadline));
    const openModal = useStore(state => state.openModal);

    return (
        <Draggable draggableId={task.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => openModal(task.originalProject)}
                    className={`group relative flex overflow-hidden rounded-lg bg-white transition-all dark:bg-[#1E1F23] ${
                        snapshot.isDragging
                        ? 'shadow-2xl ring-2 ring-accent/20 z-50 scale-[1.02]'
                        : 'shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1'
                    }`}
                >
                    {/* Vertical Client Color Line */}
                    <div className="w-1.5 shrink-0 bg-accent/20 group-hover:bg-accent transition-colors" />

                    <div className="flex flex-1 flex-col p-5 gap-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-xs font-medium text-secondary dark:text-white/50">
                                    {task.client || 'Sin cliente'}
                                </span>
                                <h4 className="text-[14px] font-semibold tracking-tight text-primary dark:text-white leading-tight">
                                    {task.title}
                                </h4>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_COLORS[task.status] || 'bg-slate-300'}`} />
                                <span className="text-xs font-medium text-secondary dark:text-white/60">
                                    {getStatusLabel(task.status)}
                                </span>
                            </div>

                            <div className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-secondary dark:text-white/50'}`}>
                                {isOverdue ? <AlertCircle size={12} /> : <Clock size={12} />}
                                <span>{task.deadline ? format(parseISO(task.deadline), "d MMM", { locale: es }) : 'S/F'}</span>
                            </div>
                        </div>

                        {!task.completed && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onComplete && onComplete(task);
                                }}
                                className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-2.5 text-xs font-semibold text-secondary opacity-0 transition-all hover:bg-dark-bg hover:text-white focus:opacity-100 group-hover:opacity-100 dark:bg-white/5 dark:text-white/60 dark:hover:bg-accent dark:hover:text-dark-bg"
                            >
                                <CheckCircle2 size={12} />
                                <span>Marcar completado</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </Draggable>
    );
};

const EditorColumn = ({ member, tasks, onComplete }) => {
    const formattedName = member.charAt(0).toUpperCase() + member.slice(1).toLowerCase();
    const isUnassigned = member === 'Sin asignar';

    return (
        <div className="flex min-w-[340px] flex-col gap-6 rounded-xl bg-slate-100/30 p-6 dark:bg-white/[0.02] h-full">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    {isUnassigned ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white dark:bg-slate-600">?</div>
                    ) : (
                        <MemberAvatar name={member} size="lg" />
                    )}
                    <div className="flex flex-col">
                        <h3 className="text-sm font-semibold text-primary dark:text-white leading-none">{formattedName}</h3>
                        <span className="mt-1 text-xs font-medium text-secondary dark:text-white/50">
                            {tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}
                        </span>
                    </div>
                </div>
                {!isUnassigned && <EditorMenu member={member} />}
            </div>

            <Droppable droppableId={member}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-col gap-4 h-full overflow-y-auto pr-1 pb-4 soft-scroll min-h-[200px] transition-all rounded-xl ${
                            snapshot.isDraggingOver ? 'bg-white/60 dark:bg-white/[0.05] ring-2 ring-accent/10' : ''
                        }`}
                    >
                        {tasks.length === 0 && !snapshot.isDraggingOver && (
                            <div className="flex grow flex-col items-center justify-center rounded-xl bg-slate-50/50 dark:bg-white/[0.01]">
                                <p className="text-xs font-medium text-secondary/70 dark:text-white/40">Disponible</p>
                            </div>
                        )}
                        {tasks.map((task, index) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                index={index}
                                onComplete={onComplete}
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
};

const VistaEdicion = () => {
    const { projects, teamMembers, updateProject, openModal, searchTerm, setSearchTerm } = useStore(
        useShallow((state) => ({
            projects: state.projects,
            teamMembers: state.teamMembers,
            updateProject: state.updateProject,
            openModal: state.openModal,
            // Misma búsqueda que el buscador de arriba.
            searchTerm: state.searchTerm,
            setSearchTerm: state.setSearchTerm,
        }))
    );

    const [quickFilter, setQuickFilter] = useState(null);

    // Build tasks and sort by priority
    const allTasks = useMemo(() => {
        let tasks = [];

        // 1. Explicit Editing Projects
        const editingProjects = filterProjects(projects, searchTerm).filter(p => {
            if (isAbsenceProject(p)) return false;
            const isCompleted = normalizeStatus(p.status) === 'Completado';
            const isEditingType = (p.type || '').toLowerCase() === 'edicion' || (p.stage || '').toLowerCase() === 'edicion';
            return !isCompleted && isEditingType;
        });

        tasks = editingProjects.map(p => ({
            id: p.id,
            title: p.name,
            client: p.client,
            manager: ensureMemberName(p.manager), // Normalize manager name
            status: normalizeStatus(p.status),
            deadline: p.deadline || p.endDate,
            isIsa: false,
            originalProject: p,
            priorityOrder: p.properties?.editionPriority || 9999, // Lower is higher priority
            completed: false
        }));

        const activeFilter = QUICK_FILTERS.find((f) => f.id === quickFilter);
        if (activeFilter) {
            tasks = tasks.filter(activeFilter.test);
        }

        // Sort by priorityOrder (ascending)
        return tasks.sort((a, b) => (a.priorityOrder || 0) - (b.priorityOrder || 0));

    }, [projects, searchTerm, quickFilter]);

    const tasksByMember = useMemo(() => {
        const grouped = {};
        teamMembers.forEach(m => grouped[m] = []);
        grouped['Sin asignar'] = [];

        allTasks.forEach(task => {
            let manager = task.manager;
            const normalizedManager = teamMembers.find(m => m.toLowerCase() === manager.toLowerCase());

            if (normalizedManager) {
                grouped[normalizedManager].push(task);
            } else {
                grouped['Sin asignar'].push(task);
            }
        });
        return grouped;
    }, [allTasks, teamMembers]);


    const handleDragEnd = useCallback(async (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        const sourceColumnId = source.droppableId;
        const destColumnId = destination.droppableId;

        // Find the task object
        const task = allTasks.find(t => t.id === draggableId);
        if (!task) return;

        // Get tasks in the destination column (sorted)
        const destTasks = [...(tasksByMember[destColumnId] || [])];

        // If moving within same column, remove from list first
        if (sourceColumnId === destColumnId) {
            const currentIndex = destTasks.findIndex(t => t.id === draggableId);
            destTasks.splice(currentIndex, 1);
        }

        // Insert physically
        destTasks.splice(destination.index, 0, task);

        const prevTask = destTasks[destination.index - 1];
        const nextTask = destTasks[destination.index + 1];

        let newPriority = 1000; 
        if (!prevTask && !nextTask) {
            newPriority = 1000;
        } else if (!prevTask) {
            newPriority = (nextTask.priorityOrder || 2000) / 2;
        } else if (!nextTask) {
            newPriority = (prevTask.priorityOrder || 1000) + 1000;
        } else {
            newPriority = ((prevTask.priorityOrder || 0) + (nextTask.priorityOrder || 0)) / 2;
        }

        let newManagers = task.originalProject.managers || [];
        if (sourceColumnId !== destColumnId) {
            if (destColumnId === 'Sin asignar') {
                newManagers = [];
            } else {
                newManagers = [destColumnId];
            }
        }

        const updatePayload = {
            ...task.originalProject,
            id: task.originalProject.id,
            properties: {
                ...task.originalProject.properties,
                editionPriority: newPriority,
                managers: newManagers
            }
        };
        if (sourceColumnId !== destColumnId) {
            updatePayload.manager = newManagers.join(', ');
            updatePayload.managers = newManagers;
        }

        await updateProject(updatePayload);

    }, [allTasks, tasksByMember, updateProject]);


    const handleComplete = async (task) => {
        // Completado exige el link del entregable: se abre el formulario para pedirlo.
        if (!hasDeliverableLink(task.originalProject)) {
            openModal(task.originalProject, { status: 'Completado' });
            return;
        }

        const updated = {
            ...task.originalProject,
            status: 'Completado',
            state: 'entregado',
            properties: {
                ...task.originalProject.properties,
                completedAt: new Date().toISOString()
            }
        };
        const result = await updateProject(updated);
        if (result?.ok) toast.success(`«${task.title}» completado`);
        else toast.error('No se pudo marcar como completado.');
    };

    return (
        <div className="flex h-full w-full flex-col bg-white dark:bg-black">
            {/* Header */}
            <div className="flex shrink-0 flex-col gap-8 p-10">
                <div className="flex items-end justify-between border-b border-border/40 pb-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="h-6 w-1 brand-gradient rounded-full" />
                            <h1 className="text-3xl font-semibold tracking-tight text-primary dark:text-white">
                                Cola de Edición
                            </h1>
                        </div>
                        <p className="text-sm text-secondary dark:text-white/60">
                            Proyectos en edición por editor. Arrastra para reasignar o priorizar.
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-6">
                        <div className="flex items-center gap-2" role="group" aria-label="Filtros rápidos">
                            {QUICK_FILTERS.map((f) => {
                                const active = quickFilter === f.id;
                                return (
                                    <button
                                        key={f.id}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => setQuickFilter(active ? null : f.id)}
                                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${active
                                            ? 'border-dark-bg bg-dark-bg text-white dark:border-accent dark:bg-accent dark:text-dark-bg'
                                            : 'border-border text-secondary hover:border-secondary hover:text-primary dark:border-white/10 dark:text-white/60 dark:hover:text-white'}`}
                                    >
                                        {f.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/30 transition-colors group-focus-within:text-accent" size={16} />
                            <input
                                type="text"
                                aria-label="Buscar en la cola de edición"
                                placeholder="Buscar proyecto…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-80 rounded-lg border border-border/40 bg-slate-50/50 py-3.5 pl-12 pr-6 text-sm outline-none transition-all focus:border-accent focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-accent"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Board */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex grow gap-6 overflow-x-auto p-10 pt-0">
                    {teamMembers.map((member) => (
                        <EditorColumn
                            key={member}
                            member={member}
                            tasks={tasksByMember[member] || []}
                            onComplete={handleComplete}
                        />
                    ))}
                    {tasksByMember['Sin asignar']?.length > 0 && (
                        <EditorColumn
                            key="Sin asignar"
                            member="Sin asignar"
                            tasks={tasksByMember['Sin asignar']}
                            onComplete={handleComplete}
                        />
                    )}
                </div>
            </DragDropContext>
        </div>
    );
};

export default VistaEdicion;
