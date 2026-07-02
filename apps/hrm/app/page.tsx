import { Button } from '@archmage/ui';
import { User } from '@archmage/shared';

export default function Home() {
  const user: User = {
    name: 'Test',
    email: 'test@example.com',
    password: '',
    userType: 1,
    status: 1,
    checkedDefaultLocation: false,
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Archmage HRM</h1>
      <Button>Get Started</Button>
      <p className="text-muted-foreground text-sm">Welcome, {user.name}</p>
    </main>
  );
}
