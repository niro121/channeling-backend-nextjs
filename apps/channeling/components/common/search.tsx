'use client';

import { ChangeEvent, useRef, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/icons';
import { Search } from 'lucide-react';

interface SearchInputProps {
  name: string;
  placeholder: string;
  className: string;
}

export function SearchInput({ name, placeholder, className }: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition();

  const currentKeyword = searchParams?.get(name) ?? '';

  function searchAction(formData: FormData) {
    const value = formData.get(name) as string;

    const params = new URLSearchParams();
    if (searchParams) {
      Array.from(searchParams.entries()).forEach(([key, val]) => {
        if (key !== name) params.set(key, val);
      });
    }
    params.set('page', '0');
    params.set('limit', params.get('limit') || '10');
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    startTransition(() => {
      router.replace(`${pathname}/?${params.toString()}`);
    });
  }

  const onChangeValue = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) {
      if (formRef && formRef.current) {
        formRef.current.requestSubmit()
      }
    }
  }

  return (
    <form action={searchAction} ref={formRef}>
      <Search className="absolute left-2.5 top-[.75rem] h-4 w-4 text-muted-foreground" />
      <Input
        name={name}
        type="search"
        placeholder={placeholder}
        defaultValue={currentKeyword}
        className={`focus-visible:ring-offset-0! ${className}`}
        onChange={onChangeValue}
        data-filter-include
      />
      {isPending && <div className="absolute inset-y-0 right-0 flex items-center pr-2"><Spinner /></div>}
    </form>
  );
}
