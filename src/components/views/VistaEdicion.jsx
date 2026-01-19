"use client";

import React, { useMemo, useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    Calendar as CalendarIcon,
    CheckCircle2,
    Clock,
    Filter,
    MoreHorizontal,
    Search,
    AlertCircle
} from 'lucide-react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import useStore from '../../hooks/useStore';
import { ensureMemberName } from '../../constants/team';
import { getClientBadgeClass } from '../../utils/clientStyles';
import {
    computeIsaAverages,
    buildIsaMilestones,
    getIsaProjectKey,
    applyIsaOverridesToMilestones,
    getProjectRecordingDate,
} from '../../utils/isaEstimates';

// -- Constants & Helpers --

const STATUS_COLORS = {
    'Programado': 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    'En progreso': 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    'En edición': 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800',
    'En revisión': 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    'Completado': 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
};

const PRIORITY_LABELS = {
    high: { label: 'Alta', color: 'text-red-500 bg-red-50 border-red-200' },
    medium: { label: 'Media', color: 'text-amber-500 bg-amber-50 border-amber-200' },
    normal: { label: 'Normal', color: 'text-slate-500 bg-slate-50 border-slate-200' },
};

// -- Components --

const TaskCard = ({ task, onStatusChange, onComplete, index }) => {
    const isIsa = task.isIsa;
    const isOverdue = task.deadline && isPast(parseISO(task.deadline)) && !isToday(parseISO(task.deadline));

    const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS['Programado'];

    return (
        <Draggable draggableId={task.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{ ...provided.draggableProps.style }}
                    className={`group relative flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm transition-all dark:bg-[#1E1F23] ${snapshot.isDragging
                        ? 'border-indigo-400 shadow-xl rotate-2 scale-105 z-50'
                        : 'border-slate-200 hover:shadow-md dark:border-slate-800'
                        }`}
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1">
                            <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getClientBadgeClass(task.client)}`}>
                                {task.client || 'Sin cliente'}
                            </span>
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                                {task.title}
                            </h4>
                        </div>
                        {isIsa && (
                            <span className="shrink-0 rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
                                ISA
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${statusColor}`}>
                            <span className="size-1.5 rounded-full bg-current" />
                            {task.status}
                        </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                        <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
                            {isOverdue ? <AlertCircle size={14} /> : <CalendarIcon size={14} />}
                            <span>
                                {task.deadline ? format(parseISO(task.deadline), "d MMM", { locale: es }) : 'Sin fecha'}
                            </span>
                        </div>

                        {!task.completed && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onComplete && onComplete(task);
                                }}
                                className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-emerald-600 opacity-0 transition-opacity hover:bg-emerald-100 group-hover:opacity-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
                            >
                                <CheckCircle2 size={12} />
                                <span className="font-medium">Completar</span>
                            </button>
                        )}
                    </div>

                    {/* Visual indicator for ISA phase if applicable */}
                    {isIsa && task.isaMilestoneLabel && (
                        <div className="mt-1 text-[10px] text-slate-400">
                            {task.isaMilestoneLabel}
                        </div>
                    )}
                </div>
            )}
        </Draggable>
    );
};

const EditorColumn = ({ member, tasks, onStatusChange, onComplete }) => {
    return (
        <div className="flex min-w-[320px] flex-col gap-4 rounded-2xl bg-slate-50/50 p-4 border border-slate-100 dark:bg-[#0F0F11] dark:border-slate-800 h-full">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                        {member.charAt(0)}
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{member}</h3>
                </div>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {tasks.length}
                </span>
            </div>

            <Droppable droppableId={member}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-col gap-3 h-full overflow-y-auto pr-1 pb-4 soft-scroll min-h-[150px] transition-colors rounded-xl ${snapshot.isDraggingOver ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                            }`}
                    >
                        {tasks.length === 0 && !snapshot.isDraggingOver ? (
                            <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-600">
                                <span className="text-xs">Arrastra aquí para asignar</span>
                            </div>
                        ) : (
                            tasks.map((task, index) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    index={index}
                                    onStatusChange={onStatusChange}
                                    onComplete={onComplete}
                                />
                            ))
                        )}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
};

const VistaEdicion = () => {
    const { projects, revisionCycles, teamMembers, updateProject, openModal } = useStore(
        useShallow((state) => ({
            projects: state.projects,
            revisionCycles: state.revisionCycles,
            teamMembers: state.teamMembers,
            updateProject: state.updateProject,
            openModal: state.openModal,
        }))
    );

    const [searchTerm, setSearchTerm] = useState('');

    const isaStats = useMemo(() => computeIsaAverages(revisionCycles), [revisionCycles]);

    // Build tasks and sort by priority
    const allTasks = useMemo(() => {
        let tasks = [];

        // 1. Explicit Editing Projects
        const editingProjects = projects.filter(p => {
            const isCompleted = (p.status || '').toLowerCase() === 'completado';
            const isEditingType = (p.type || '').toLowerCase() === 'edicion' || (p.stage || '').toLowerCase() === 'edicion';
            return !isCompleted && isEditingType;
        });

        tasks = editingProjects.map(p => ({
            id: p.id,
            title: p.name,
            client: p.client,
            manager: ensureMemberName(p.manager), // Normalize manager name
            status: p.status || 'Programado',
            deadline: p.deadline || p.endDate,
            isIsa: false,
            originalProject: p,
            priorityOrder: p.properties?.editionPriority || 9999, // Lower is higher priority
            completed: false
        }));

        // 2. ISA Estimates (Inferred)
        projects.forEach(p => {
            if ((p.status || '').toLowerCase() === 'completado') return;

            const recordingDate = getProjectRecordingDate(p);
            if (!recordingDate) return;

            const projectKey = getIsaProjectKey(p);
            if (!projectKey) return;

            const milestones = applyIsaOverridesToMilestones(
                p,
                buildIsaMilestones(p, isaStats)
            );

            const today = new Date();
            const start = milestones[0]?.date;
            const end = milestones[milestones.length - 1]?.date;

            if (start && end && today >= recordingDate) {
                let activeMilestone = milestones.find(m => isToday(m.date) || m.date > today) || milestones[milestones.length - 1];

                const alreadyHasExplicit = tasks.some(t => t.originalProject.id === p.id);
                if (alreadyHasExplicit) return;

                let status = 'En edición';
                if (activeMilestone.key === 'isa_review') status = 'En revisión';

                tasks.push({
                    id: `isa-${p.id}`,
                    title: p.name,
                    client: p.client,
                    manager: ensureMemberName(p.manager),
                    status: status,
                    deadline: activeMilestone.date.toISOString(),
                    isIsa: true,
                    isaMilestoneLabel: activeMilestone.label,
                    originalProject: p,
                    priorityOrder: p.properties?.editionPriority || 9999,
                    completed: false
                });
            }
        });

        // Filter by search
        if (searchTerm.trim()) {
            const lowerRaw = searchTerm.toLowerCase();
            tasks = tasks.filter(t =>
                t.title.toLowerCase().includes(lowerRaw) ||
                t.client.toLowerCase().includes(lowerRaw) ||
                t.manager.toLowerCase().includes(lowerRaw)
            );
        }

        // Sort by priorityOrder (ascending)
        return tasks.sort((a, b) => (a.priorityOrder || 0) - (b.priorityOrder || 0));

    }, [projects, isaStats, searchTerm]);

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

        // Optimistic Update can be tricky with generated state, but we'll fire the update immediately.
        // We need to calculate the new priorityOrder for the moved item.

        // Get tasks in the destination column (sorted)
        const destTasks = [...(tasksByMember[destColumnId] || [])];

        // If moving within same column, remove from list first to find correct insertion point index
        if (sourceColumnId === destColumnId) {
            const currentIndex = destTasks.findIndex(t => t.id === draggableId);
            destTasks.splice(currentIndex, 1);
        }

        // Insert physically to calculate new neighbors
        destTasks.splice(destination.index, 0, task);

        const prevTask = destTasks[destination.index - 1];
        const nextTask = destTasks[destination.index + 1];

        let newPriority = 1000; // Default if empty
        if (!prevTask && !nextTask) {
            newPriority = 1000;
        } else if (!prevTask) {
            // First item
            newPriority = (nextTask.priorityOrder || 2000) / 2;
        } else if (!nextTask) {
            // Last item
            newPriority = (prevTask.priorityOrder || 1000) + 1000;
        } else {
            // Middle
            newPriority = ((prevTask.priorityOrder || 0) + (nextTask.priorityOrder || 0)) / 2;
        }

        // Apply Update
        // Create updated project object
        let newManagers = task.originalProject.managers || [];
        // If column changed, update manager
        if (sourceColumnId !== destColumnId) {
            // Basic single manager logic for column change
            if (destColumnId === 'Sin asignar') {
                newManagers = [];
            } else {
                newManagers = [destColumnId]; // Assign only to the new column owner
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
        // Also update legacy manager field for compatibility if needed, though prepareProjectForSupabase handles properties
        if (sourceColumnId !== destColumnId) {
            updatePayload.manager = newManagers.join(', ');
            updatePayload.managers = newManagers;
        }

        await updateProject(updatePayload);

    }, [allTasks, tasksByMember, updateProject]);


    const handleComplete = async (task) => {
        if (!confirm(`¿Marcar "${task.title}" como completado?`)) return;

        if (task.isIsa) {
            const updated = {
                ...task.originalProject,
                status: 'Completado'
            };
            await updateProject(updated);
        } else {
            const updated = {
                ...task.originalProject,
                status: 'Completado',
                state: 'entregado',
                properties: {
                    ...task.originalProject.properties,
                    completedAt: new Date().toISOString()
                }
            };
            await updateProject(updated);
        }
    };

    return (
        <div className="flex h-full w-full flex-col bg-white dark:bg-[#151518]">
            {/* Header */}
            <div className="flex shrink-0 flex-col gap-4 border-b border-slate-100 p-6 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Cola de Edición
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Gestión de entregas y revisiones por editor
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar edición..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-64 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Board */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex grow gap-4 overflow-x-auto p-6">
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
