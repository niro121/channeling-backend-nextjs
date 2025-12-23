'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

export function NavDropdown({
  label,
  icon,
  items
}: {
  label: string;
  icon: React.ReactNode;
  items: { href: string; label: string; icon?: React.ReactNode }[];
}) {
  const pathname = usePathname();
  const isActive = items.some(item => pathname === item.href || pathname?.startsWith(item.href + '/'));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={clsx(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full',
          {
            'bg-white/10 text-white': isActive,
            'text-white/70 hover:text-white hover:bg-white/5': !isActive
          }
        )}
      >
        {icon}
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 bg-[#01012A] border-white/10">
        {items.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link
              href={item.href}
              className={clsx(
                'flex items-center gap-3 w-full',
                {
                  'text-white': pathname === item.href || pathname?.startsWith(item.href + '/'),
                  'text-white/70': pathname !== item.href && !pathname?.startsWith(item.href + '/')
                }
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

