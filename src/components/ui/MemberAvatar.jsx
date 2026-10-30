"use client";

import React from 'react';
import clsx from 'clsx';
import useStore from '../../hooks/useStore';
import {
  DEFAULT_MEMBER_COLOR,
  MEMBER_COLORS,
  ensureMemberName,
  getMemberInitials,
  getMemberNameForUser,
} from '../../constants/team';

const SIZES = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-7 w-7 text-[11px]',
  lg: 'h-8 w-8 text-xs',
};

// Color del avatar: el que cada persona eligió en Ajustes (solo disponible para
// el usuario con sesión) o el color fijo del integrante.
export const useMemberColor = (name) => {
  const currentUser = useStore((state) => state.currentUser);
  const member = ensureMemberName(name);
  const ownColor =
    getMemberNameForUser(currentUser) === member ? currentUser?.user_metadata?.avatar_color : null;
  return ownColor || MEMBER_COLORS[member] || DEFAULT_MEMBER_COLOR;
};

const MemberAvatar = ({ name, size = 'md', ring = false, className }) => {
  const member = ensureMemberName(name);
  const color = useMemberColor(member);
  return (
    <span
      title={member}
      className={clsx(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white',
        SIZES[size] || SIZES.md,
        ring && 'border-2 border-white shadow-sm dark:border-[#16171D]',
        className
      )}
      style={{ backgroundColor: color }}
    >
      {getMemberInitials(member)}
    </span>
  );
};

export default MemberAvatar;
