"use client"
'use client'

import React from 'react';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../ui/pagination';
import { usePathname, useSearchParams } from 'next/navigation';


interface CustomPaginationProps {
    currentPage: number
    totalPages: number
}

const CustomPagination = ({ currentPage, totalPages }: CustomPaginationProps) => {

    const searchParams = useSearchParams()
    const pathname = usePathname();

    const getNewSearchParams = (page: number) => {
        const params = new URLSearchParams()
        
        if (searchParams && searchParams.keys()) {
            Array.from(searchParams.keys()).forEach((key: string) => {
                if (key !== 'page') {
                    params.set(key, String(searchParams.get(key)));
                }
            });
        }

        //finally set page
        params.set('page', String(page))

        return `${pathname}/?${params.toString()}`
    }

    const renderPageItems = () => {
        const items = []

        if (totalPages <= 10) {
            for (let index = 1; index <= totalPages; index++) {
                items.push(
                    <PaginationItem
                        key={index + Math.floor(Math.random() * 99)}
                    >
                        <PaginationLink href={getNewSearchParams(index)} isActive={currentPage === index}>{index}</PaginationLink>
                    </PaginationItem>
                )
            }
        }
        else {
            const ellipsisStart = Math.max(1, currentPage - 2) > 1;
            const ellipsisEnd = Math.min(currentPage + 2, totalPages) < totalPages;

            if (ellipsisStart) {
                items.push(<PaginationEllipsis key="start-ellipsis" />);
            }

            for (let index = Math.max(1, currentPage - 2); index <= Math.min(currentPage + 2, totalPages); index++) {
                items.push(
                    <PaginationItem
                        key={index + Math.floor(Math.random() * 99)}
                    >
                        <PaginationLink href={getNewSearchParams(index)} isActive={currentPage === index}>{index}</PaginationLink>
                    </PaginationItem>
                );
            }

            if (ellipsisEnd) {
                items.push(<PaginationEllipsis key="end-ellipsis" />);
            }
        }

        return items
    }
    return (
        <Pagination>
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious href={getNewSearchParams(currentPage - 1)} />
                </PaginationItem>

                {renderPageItems()}

                <PaginationItem>
                    <PaginationNext href={getNewSearchParams(currentPage + 1)} />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
};

export default CustomPagination;
