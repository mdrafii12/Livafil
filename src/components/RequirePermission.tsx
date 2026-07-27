import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import AccessRestricted from './AccessRestricted';

interface RequirePermissionProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  fallback?: React.ReactNode;
}

/**
 * Reusable permission wrapper.
 * Checks the authenticated user's role and renders children if authorized,
 * otherwise displays the fallback (default: AccessRestricted view).
 */
export function RequirePermission({
  children,
  allowedRoles = ['Owner', 'Manager', 'Staff'],
  fallback = <AccessRestricted />,
}: RequirePermissionProps) {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-center text-xs text-gray-400">Verifying access permissions...</div>;
  }

  const currentRole = profile?.role || 'Staff';

  if (!allowedRoles.includes(currentRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default RequirePermission;
