'use client';

import { signOut } from 'next-auth/react';

const SignOutButton = () => {
    const handleSignOut = async () => {
        await signOut({
            redirect: false, // Prevent automatic redirection
        });
        // Optionally handle additional logic here
        window.location.href = '/login'; // Redirect to home page
    };

    return (
        <button type="button" onClick={handleSignOut}>
            Sign Out
        </button>
    );
};

export default SignOutButton;