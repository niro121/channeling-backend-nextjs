/* 'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from '@/components/icons';
import { useRouter } from 'next/navigation';

export default function AddBtnSection() {
  const router = useRouter();

  const handleClick = (id: string) => {
    router.push(`/`);
  };

  return (
    <>
      <Button
        size="sm"
        onClick={() => console.log("ANALYSE & CREATE CLICK")}
        className="gap-1 px-8 text-white transition-colors ease-in-out duration-100 hover:text-black"
      >
        <PlusCircle />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          Analyse & Create
        </span>
      </Button>
      <Button
        size="sm"
        onClick={() => handleClick("UPDATE CLICK")}
        className="gap-1 px-8 text-white transition-colors ease-in-out duration-100 hover:text-black"
      >
        <PlusCircle />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          Update Only
        </span>
      </Button>
    </>
  );
}
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from '@/components/icons';

export default function AddBtnSection() {
  return (
    <Button
      size="sm"
      className="gap-1 px-8 text-white transition-colors ease-in-out duration-100 hover:text-black"
    >
      <PlusCircle />
      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
        Generate Session
      </span>
    </Button>
  );
}
