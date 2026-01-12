'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { signOut } from '@/lib/supabase/auth';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface UserMenuProps {
  user: SupabaseUser;
  onSignOut?: () => void;
}

export function UserMenu({ user, onSignOut }: UserMenuProps) {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      onSignOut?.();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
          <User className="h-4 w-4" />
        </div>
        <span className="hidden sm:inline font-medium">
          {user.email}
        </span>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignOut}
        disabled={loading}
      >
        <LogOut className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Déconnexion</span>
      </Button>
    </div>
  );
}