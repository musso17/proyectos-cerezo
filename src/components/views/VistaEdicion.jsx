"use client";

import React, { useMemo, useState, useCallback } from 'react';
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
import { format, isPast, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import useStore from '../../hooks/useStore';
import { ensureMemberName } from '../../constants/team';

// -- Constants & Helpers --

const STATUS_DOT_COLORS = {
    'Programado': 'bg-slate-300',
    'En progreso': 'bg-[#FF4B2A]',
    'En edición': 'bg-[#FF4B2A] shadow-[0_0_8px_rgba(255,75,42,0.4)]',
    'En revisión': 'bg-[#5F6468]',
    'Completado': 'bg-black dark:bg-white',
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
                    className={`group relative flex overflow-hidden rounded-[1.5rem] bg-white transition-all dark:bg-[#1E1F23] ${
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
                                <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-secondary/40">
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
                                <span className="text-[10px] font-medium text-secondary/60 dark:text-white/40">
                                    {task.status}
                                </span>
                            </div>

                            <div className={`flex items-center gap-1.5 text-[10px] font-medium ${isOverdue ? 'text-red-500' : 'text-secondary/40'}`}>
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
                                className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-secondary/60 opacity-0 transition-all hover:bg-dark-bg hover:text-white group-hover:opacity-100 dark:bg-white/5 dark:text-white/40 dark:hover:bg-accent dark:hover:text-dark-bg"
                            >
                                <CheckCircle2 size={12} />
                                <span>Marcar Completado</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </Draggable>
    );
};

const EditorColumn = ({ member, tasks, onComplete }) => {
    const initials = member.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const formattedName = member.charAt(0).toUpperCase() + member.slice(1).toLowerCase();

    return (
        <div className="flex min-w-[340px] flex-col gap-6 rounded-[2.5rem] bg-slate-100/30 p-6 dark:bg-white/[0.02] h-full">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[11px] font-bold text-primary shadow-sm dark:bg-white/10 dark:text-white">
                        {initials}
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-sm font-semibold text-primary dark:text-white leading-none">{formattedName}</h3>
                        <span className="mt-1 text-[10px] font-medium text-secondary/40 uppercase tracking-widest">
                            {tasks.length} {tasks.length === 1 ? 'Tarea' : 'Tareas'}
                        </span>
                    </div>
                </div>
                <button className="flex h-8 w-8 items-center justify-center rounded-full text-secondary/30 transition-colors hover:bg-white hover:text-primary dark:hover:bg-white/5">
                    <MoreHorizontal size={16} />
                </button>
            </div>

            <Droppable droppableId={member}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex flex-col gap-4 h-full overflow-y-auto pr-1 pb-4 soft-scroll min-h-[200px] transition-all rounded-[2rem] ${
                            snapshot.isDraggingOver ? 'bg-white/60 dark:bg-white/[0.05] ring-2 ring-accent/10' : ''
                        }`}
                    >
                        {tasks.length === 0 && !snapshot.isDraggingOver && (
                            <div className="flex grow flex-col items-center justify-center rounded-[2rem] bg-slate-50/50 dark:bg-white/[0.01]">
                                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-secondary/20">Disponible</p>
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
    const { projects, teamMembers, updateProject } = useStore(
        useShallow((state) => ({
            projects: state.projects,
            teamMembers: state.teamMembers,
            updateProject: state.updateProject,
        }))
    );

    const [searchTerm, setSearchTerm] = useState('');

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

    }, [projects, searchTerm]);

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
        if (!confirm(`¿Marcar "${task.title}" como completado?`)) return;

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
                        <p className="text-sm font-medium text-secondary/40">
                            Gestión de entregas y revisiones por editor profesional
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-6">
                        <div className="flex items-center gap-4">
                            {['Urgente', 'En Revisión', 'Feedbacks'].map((f) => (
                                <button key={f} className="text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary/30 hover:text-accent transition-colors">
                                    {f}
                                </button>
                            ))}
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/30 transition-colors group-focus-within:text-accent" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar proyecto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-80 rounded-[1.5rem] border border-border/40 bg-slate-50/50 py-3.5 pl-12 pr-6 text-sm outline-none transition-all focus:border-accent focus:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:text-white dark:focus:border-accent"
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
