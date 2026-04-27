"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { startOfMonth, addMonths, startOfDay } from 'date-fns';
import useStore from '../../hooks/useStore';
import { getUIPreference, setUIPreference } from '../../utils/uiPreferences';
import { isAllowedIsaMilestoneDay } from '../../utils/isaEstimates';
import VistaTimeline from './VistaTimeline';
import CalendarHeader from '../calendar/CalendarHeader';
import { MonthNavigator, MemberFilters } from '../calendar/CalendarControls';
import CalendarGrid from '../calendar/CalendarGrid';
import MobileCalendarGrid from '../calendar/MobileCalendarGrid';
import MobileEventList from '../calendar/MobileEventList';
import DayDetailPanel from '../calendar/DayDetailPanel';
import { useCalendarData } from '../../hooks/useCalendarData';
import { useCalendarDnD } from '../../hooks/useCalendarDnD';

const getStoredCalendarMember = () => {
  const stored = getUIPreference('calendarSelectedMember', 'Todos');
  return typeof stored === 'string' && stored.trim().length > 0 ? stored.trim() : 'Todos';
};

const getStoredCalendarPrimaryView = () => {
  const stored = getUIPreference('calendarPrimaryView', 'calendar');
  return stored === 'timeline' ? 'timeline' : 'calendar';
};

const VistaCalendario = ({ projects: projectsProp }) => {
  const projectsFromStore = useStore((state) => state.projects);
  const projects = projectsProp !== undefined ? projectsProp : projectsFromStore;
  const searchTerm = useStore((state) => state.searchTerm);
  const openModal = useStore((state) => state.openModal);
  const teamMembers = useStore((state) => state.teamMembers);
  const revisionCycles = useStore((state) => state.revisionCycles);
  const updateProject = useStore((state) => state.updateProject);

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [primaryView, setPrimaryView] = useState(() => getStoredCalendarPrimaryView());
  const [selectedMember, setSelectedMember] = useState(() => getStoredCalendarMember());
  const [showIsaEvents, setShowIsaEvents] = useState(() => getUIPreference('calendarShowIsaEvents', true));
  const [selectedDayKey, setSelectedDayKey] = useState(() => startOfDay(new Date()).toISOString());

  useEffect(() => { setUIPreference('calendarPrimaryView', primaryView); }, [primaryView]);
  useEffect(() => { setUIPreference('calendarSelectedMember', selectedMember); }, [selectedMember]);
  useEffect(() => { setUIPreference('calendarShowIsaEvents', showIsaEvents); }, [showIsaEvents]);

  const {
    isDraggingIsa,
    handleIsaDragStart,
    handleIsaDragEnd,
    handleDayDragOver,
    handleDayDrop,
  } = useCalendarDnD(projects, updateProject);

  const {
    calendarDays,
    calendarItemsByDay,
    selectedDayDate,
    selectedDayDetails,
    mobileEvents,
  } = useCalendarData({
    projects,
    searchTerm,
    selectedMember,
    showIsaEvents,
    revisionCycles,
    currentMonth,
    selectedDayKey,
  });

  const handlePrevMonth = () => setCurrentMonth((prev) => startOfMonth(addMonths(prev, -1)));
  const handleNextMonth = () => setCurrentMonth((prev) => startOfMonth(addMonths(prev, 1)));
  const handleDaySelect = (day) => {
    const key = startOfDay(day).toISOString();
    setSelectedDayKey(key);
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentMonth(startOfMonth(today));
    setSelectedDayKey(startOfDay(today).toISOString());
  };

  const filterOptions = useMemo(() => ['Todos', ...(teamMembers || [])], [teamMembers]);

  return (
    <div className="space-y-6 px-3 py-6 sm:px-6">
      <CalendarHeader
        primaryView={primaryView}
        setPrimaryView={setPrimaryView}
        showIsaEvents={showIsaEvents}
        setShowIsaEvents={setShowIsaEvents}
      />

      {primaryView === 'calendar' ? (
        <>
          <div className="flex flex-col gap-4">
            <MonthNavigator
              currentMonth={currentMonth}
              handlePrevMonth={handlePrevMonth}
              handleNextMonth={handleNextMonth}
            />
            <MemberFilters
              filterOptions={filterOptions}
              selectedMember={selectedMember}
              setSelectedMember={setSelectedMember}
            />
          </div>

          {/* Versión Móvil: Grid + Lista (iOS Style) */}
          <div className="sm:hidden -mx-3">
            <div className="border-t border-b border-gray-100 dark:border-white/5">
              <MobileCalendarGrid
                calendarDays={calendarDays}
                currentMonth={currentMonth}
                calendarItemsByDay={calendarItemsByDay}
                selectedDayKey={selectedDayKey}
                handleDaySelect={handleDaySelect}
              />
            </div>
            
            <div className="bg-white dark:bg-[#0F0F11] pb-24">
              <MobileEventList
                selectedDayDetails={selectedDayDetails}
                selectedDayDate={selectedDayDate}
                openModal={openModal}
              />
            </div>
            
            {/* Barra Inferior Estilo iOS */}
            <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/80 dark:bg-[#1E1F23]/80 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 px-6 py-4 flex items-center justify-between">
              <button
                onClick={handleGoToToday}
                className="text-red-500 text-lg font-medium active:opacity-50 transition-opacity"
              >
                Hoy
              </button>
              
              <div className="flex gap-4">
                <span className="text-gray-400 dark:text-gray-500 text-sm">
                  {selectedDayDetails.length} eventos
                </span>
              </div>
            </div>
          </div>

          {/* Versión Desktop: Grid Clásico */}
          <div className="hidden sm:block">
            <CalendarGrid
              calendarDays={calendarDays}
              currentMonth={currentMonth}
              calendarItemsByDay={calendarItemsByDay}
              selectedDayKey={selectedDayKey}
              handleDaySelect={handleDaySelect}
              handleDayDragOver={handleDayDragOver}
              handleDayDrop={handleDayDrop}
              handleIsaDragStart={handleIsaDragStart}
              handleIsaDragEnd={handleIsaDragEnd}
              isDraggingIsa={isDraggingIsa}
              isAllowedIsaMilestoneDay={isAllowedIsaMilestoneDay}
              openModal={openModal}
            />
            <DayDetailPanel
              selectedDayDate={selectedDayDate}
              selectedDayDetails={selectedDayDetails}
              setSelectedDayKey={setSelectedDayKey}
              handleIsaDragStart={handleIsaDragStart}
              handleIsaDragEnd={handleIsaDragEnd}
              openModal={openModal}
            />
          </div>
        </>
      ) : (
        <VistaTimeline projects={projects} />
      )}
    </div>
  );
};

export default VistaCalendario;
