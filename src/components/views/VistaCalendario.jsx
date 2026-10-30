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
import AbsencesPanel from '../calendar/AbsencesPanel';
import { ABSENCE_STAGE } from '../../utils/absences';
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

  const handleAddAbsence = () => openModal({ properties: { stage: ABSENCE_STAGE }, stage: ABSENCE_STAGE });

  const monthControls = (
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
  );

  return (
    <div className="space-y-6 px-3 pb-24 pt-6 sm:px-6 md:pb-6">
      <CalendarHeader
        primaryView={primaryView}
        setPrimaryView={setPrimaryView}
        onAddAbsence={handleAddAbsence}
      />

      {/* Móvil: siempre la agenda (mes + eventos del día), aunque la última
          vista elegida en escritorio haya sido el Timeline. */}
      <div className="md:hidden">
        {monthControls}
        <div className="-mx-3 mt-4">
          <div className="flex items-center justify-between px-4 pb-2">
            <button
              onClick={handleGoToToday}
              className="text-sm font-semibold text-[#C2321A] active:opacity-50 transition-opacity dark:text-accent"
            >
              Hoy
            </button>
            <span className="text-xs text-secondary dark:text-white/60">
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
          <div className="bg-white dark:bg-[#0F0F11]">
            <MobileEventList
              selectedDayDetails={selectedDayDetails}
              selectedDayDate={selectedDayDate}
              openModal={openModal}
            />
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        {primaryView === 'calendar' ? (
          <div className="space-y-6">
            {monthControls}
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
        ) : (
          <VistaTimeline projects={projects} />
        )}
      </div>

      <AbsencesPanel projects={projects} onAdd={handleAddAbsence} openModal={openModal} />
    </div>
  );
};

export default VistaCalendario;
