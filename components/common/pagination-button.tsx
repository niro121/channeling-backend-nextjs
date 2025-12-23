'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation'

interface PaginationBtnProps {
    type: string,
    offset: number,
    disabled: boolean,
    children: React.ReactNode
}

const PaginationButton = ({ type, disabled, offset, children }: PaginationBtnProps) => {

    const router = useRouter()

    const btnAction = () => {
        if(type === 'left') {
            router.back()
        }

        if(type === 'right') {
            router.push(`/adverts/?page=${offset}`, { scroll: false });
        }
       
    }
    return (
        <Button
        formAction={btnAction}
        variant="ghost"
        size="sm"
        type="submit"
        disabled={disabled}
      >
        {children}
      </Button>
    );
};

export default PaginationButton;