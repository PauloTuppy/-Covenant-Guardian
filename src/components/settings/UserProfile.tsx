/**
 * User Profile Component
 * Displays and allows editing of current user profile information
 * Requirements: 9.1
 */

import React, { useState } from 'react';
import { User, Mail, Building2, Shield, Save } from 'lucide-react';
import { Button, Card, CardHeader, CardContent, Input, Badge } from '@/components/common';
import { AuthUser, UserRole } from '@/types';

interface UserProfileProps {
  user: AuthUser;
  onUpdate?: (updates: { first_name?: string; last_name?: string }) => Promise<void>;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  analyst: 'Analyst',
  viewer: 'Viewer',
};

const ROLE_COLORS: Record<UserRole, 'info' | 'success' | 'default'> = {
  admin: 'info',
  analyst: 'success',
  viewer: 'default',
};

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!onUpdate) return;
    
    setIsSaving(true);
    try {
      await onUpdate({ first_name: firstName, last_name: lastName });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">User Profile</h3>
          {!isEditing && onUpdate && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Avatar and basic info */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900">{user.email}</h4>
              <Badge variant={ROLE_COLORS[user.role]}>
                <Shield className="mr-1 h-3 w-3" />
                {ROLE_LABELS[user.role]}
              </Badge>
            </div>
          </div>

          {/* Profile details */}
          <div className="grid gap-4 sm:grid-cols-2">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Organization</p>
                    <p className="font-medium text-gray-900">{user.bank_name}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Edit actions */}
          {isEditing && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfile;
