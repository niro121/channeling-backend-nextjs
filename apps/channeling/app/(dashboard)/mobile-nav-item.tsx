'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import clsx from 'clsx';

const MobileNavItem = ({
    href,
    label,
    children
}: {
    href: string;
    label: string;
    children: React.ReactNode;
}) => {

    const pathname = usePathname();

    return (
        <Link
            href={href}
            className={clsx(
                "flex items-center gap-4 px-2.5 text-sm text-white transition-colors md:h-8 md:w-8",
                {
                    "text-primary!": pathname === href,
                }
            )}
        >
            {children}
            {label}
        </Link>
    );
};

export default MobileNavItem;