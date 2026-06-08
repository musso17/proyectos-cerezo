"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { startOfMonth, addMonths, startOfDay } from 'date-fns';
import useStore from '../../hooks/useStore';
import { getUIPreference, setUIPreference } from '../../utils/uiPreferences';
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
  const updateProject = useStore((state) => state.updateProject);

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [primaryView, setPrimaryView] = useState(() => getStoredCalendarPrimaryView());
  const [selectedMember, setSelectedMember] = useState(() => getStoredCalendarMember());
  const [selectedDayKey, setSelectedDayKey] = useState(() => startOfDay(new Date()).toISOString());

  useEffect(() => { setUIPreference('calendarPrimaryView', primaryView); }, [primaryView]);
  useEffect(() => { setUIPreference('calendarSelectedMember', selectedMember); }, [selectedMember]);

  const {
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
            <div className="flex items-center justify-between px-4 pb-2">
              <button
                onClick={handleGoToToday}
                className="text-sm font-semibold text-accent active:opacity-50 transition-opacity"
              >
                Hoy
              </button>
              <span className="text-xs text-secondary/60 dark:text-white/40">
                {selectedDayDetails.length} evento{selectedDayDetails.length !== 1 ? 's' : ''}
              </span>
            </div>
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
              openModal={openModal}
            />
            <DayDetailPanel
              selectedDayDate={selectedDayDate}
              selectedDayDetails={selectedDayDetails}
              setSelectedDayKey={setSelectedDayKey}
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
