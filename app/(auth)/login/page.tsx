import React from 'react';
import LoginForm from './login-form';
import { fetchServerSession } from '@/lib/session';
import { redirect, RedirectType } from 'next/navigation';

const page = async () => {
    const session = await fetchServerSession()

    if (session) {
        return redirect('/users', RedirectType.replace)
    }
    return (
        <LoginForm />
    );
};

export default page;