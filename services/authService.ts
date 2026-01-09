import { supabase } from '../lib/supabase.ts';
import { User, Brokerage, UserRole } from '../types.ts';

interface UserProfile {
  id: string;
  brokerage_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string | null;
  license_number: string | null;
  avatar_url: string | null;
  is_deleted: boolean;
}

interface BrokerageData {
  id: string;
  name: string;
  subscription_plan: string;
}

 export const authService = {
  async signUp(email: string, password: string, role: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role }
      }
    });
    if (error) throw error;
    return data;
  },

  async getCurrentUser(): Promise<User | null> {
    // ... keep the rest of the file as it was
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return null;

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .eq('is_deleted', false)
        .maybeSingle();

      if (profileError || !profile) {
        console.error('Profile error:', profileError);
        return null;
      }

      const userProfile = profile as UserProfile;

      return {
        id: userProfile.id,
        brokerageId: userProfile.brokerage_id,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        email: userProfile.email,
        role: userProfile.role as UserRole,
        phone: userProfile.phone || undefined,
        licenseNumber: userProfile.license_number || undefined,
        avatar: userProfile.avatar_url || undefined,
        isDeleted: userProfile.is_deleted,
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  async getBrokerage(brokerageId: string): Promise<Brokerage | null> {
    try {
      const { data, error } = await supabase
        .from('brokerages')
        .select('*')
        .eq('id', brokerageId)
        .maybeSingle();

      if (error || !data) {
        console.error('Brokerage error:', error);
        return null;
      }

      const brokerageData = data as BrokerageData;

      return {
        id: brokerageData.id,
        name: brokerageData.name,
        subscriptionPlan: brokerageData.subscription_plan as 'BASIC' | 'PRO' | 'ENTERPRISE',
      };
    } catch (error) {
      console.error('Error getting brokerage:', error);
      return null;
    }
  },

  async updateProfile(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const updateData: any = {};

      if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
      if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.licenseNumber !== undefined) updateData.license_number = updates.licenseNumber;
      if (updates.avatar !== undefined) updateData.avatar_url = updates.avatar;

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return null;
      }

      return this.getCurrentUser();
    } catch (error) {
      console.error('Error updating profile:', error);
      return null;
    }
  },

  async signUp(
    email: string,
    password: string,
    profile: {
      firstName: string;
      lastName: string;
      phone: string;
      licenseNumber: string;
      avatarUrl: string;
      role: UserRole;
      brokerageId: string;
    }
  ): Promise<boolean> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError || !authData.user) {
        console.error('Auth signup error:', authError);
        throw authError || new Error('Failed to create auth user');
      }

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          brokerage_id: profile.brokerageId,
          email,
          first_name: profile.firstName,
          last_name: profile.lastName,
          role: profile.role,
          phone: profile.phone,
          license_number: profile.licenseNumber,
          avatar_url: profile.avatarUrl,
          is_deleted: false,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw profileError;
      }

      return true;
    } catch (error) {
      console.error('Error in signUp:', error);
      throw error;
    }
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        try {
          if (session) {
            const user = await this.getCurrentUser();
            callback(user);
          } else {
            callback(null);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
          callback(null);
        }
      })();
    });
  },
};
