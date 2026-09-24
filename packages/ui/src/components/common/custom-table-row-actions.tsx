"use client"
/* import { MoreHorizontal } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'; */
import React from 'react';
interface DataTableRowActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function DataTableRowActions({
  children,
  className
}: DataTableRowActionsProps) {
  return (
    <div
      className={`flex flex-nowrap gap-1 justify-end items-center ${className || ''}`}
    >
      {children}
    </div>
  );
}

{
  /* <DropdownMenu>
  <DropdownMenuTrigger asChild className="focus-visible:outline-hidden!">
    <Button
      variant="ghost"
      className="flex h-8 w-8 p-0 focus-visible:ring-0! data-[state=open]:bg-muted"
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">Open menu</span>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-[160px]">
    <DropdownMenuLabel>Actions</DropdownMenuLabel>
    {children}
  </DropdownMenuContent>
</DropdownMenu>; */
}
