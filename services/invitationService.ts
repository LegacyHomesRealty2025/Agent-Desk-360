import { supabase } from '../lib/supabase.ts';
import { UserRole } from '../types.ts';

export interface BrokerageInvite {
  id: string;
  brokerageId: string;
  email: string;
  role: UserRole;
  invitedBy: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
}

class InvitationService {
  async createInvitation(email: string, role: UserRole, brokerageId: string): Promise<BrokerageInvite | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('brokerage_invites')
        .insert({
          email: email.toLowerCase(),
          role,
          brokerage_id: brokerageId,
          invited_by: user.id,
          status: 'PENDING'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating invitation:', error);
        throw error;
      }

      return {
        id: data.id,
        brokerageId: data.brokerage_id,
        email: data.email,
        role: data.role as UserRole,
        invitedBy: data.invited_by,
        status: data.status,
        expiresAt: data.expires_at,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error in createInvitation:', error);
      return null;
    }
  }

  async getInvitation(inviteId: string): Promise<BrokerageInvite | null> {
    try {
      const { data, error } = await supabase
        .from('brokerage_invites')
        .select('*')
        .eq('id', inviteId)
        .eq('status', 'PENDING')
        .single();

      if (error) {
        console.error('Error fetching invitation:', error);
        return null;
      }

      if (!data) return null;

      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        await this.expireInvitation(inviteId);
        return null;
      }

      return {
        id: data.id,
        brokerageId: data.brokerage_id,
        email: data.email,
        role: data.role as UserRole,
        invitedBy: data.invited_by,
        status: data.status,
        expiresAt: data.expires_at,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error in getInvitation:', error);
      return null;
    }
  }

  async acceptInvitation(inviteId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('brokerage_invites')
        .update({ status: 'ACCEPTED' })
        .eq('id', inviteId);

      if (error) {
        console.error('Error accepting invitation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in acceptInvitation:', error);
      return false;
    }
  }

  private async expireInvitation(inviteId: string): Promise<void> {
    try {
      await supabase
        .from('brokerage_invites')
        .update({ status: 'EXPIRED' })
        .eq('id', inviteId);
    } catch (error) {
      console.error('Error expiring invitation:', error);
    }
  }
}

export const invitationService = new InvitationService();
