
import { Lead, LeadStatus, LeadTemperature, User } from "../types";

/**
 * Robust Third-Party API Integration Service
 * Handles transformations from Zillow, Realtor.com, UpNest, etc.
 */

interface RawZillowPayload {
  contact_info: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  property_info: {
    address: string;
    price: string;
  };
  inquiry_id: string;
}

interface RawRealtorPayload {
  lead_details: {
    full_name: string;
    email_address: string;
    phone_number: string;
    message: string;
  };
  property_listing: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

export const leadIngestionService = {
  /**
   * Transforms a Zillow "Tech Connect" payload into a CRM Lead
   */
  transformZillow: (payload: RawZillowPayload, brokerageId: string, agentId: string): Lead => {
    const budget = parseInt(payload.property_info.price.replace(/[^0-9]/g, '')) || 0;
    return {
      id: `zillow_${payload.inquiry_id}`,
      brokerageId,
      assignedAgentId: agentId,
      firstName: payload.contact_info.first_name,
      lastName: payload.contact_info.last_name,
      email: payload.contact_info.email,
      phone: payload.contact_info.phone,
      status: LeadStatus.NEW,
      temperature: LeadTemperature.HOT,
      source: 'Zillow API',
      tags: ['API_Ingested', 'Buyer', 'Zillow_Premier'],
      propertyType: 'PRIMARY',
      propertyAddress: payload.property_info.address,
      budget,
      notes: [{
        id: `note_${Date.now()}`,
        content: `Lead automatically ingested via Zillow Tech Connect API. Inquiry ID: ${payload.inquiry_id}`,
        createdAt: new Date().toISOString(),
        authorId: 'system',
        authorName: 'API Integration'
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedDealValue: budget * 0.03,
      externalId: payload.inquiry_id,
      integrationSource: 'ZILLOW'
    };
  },

  /**
   * Transforms a Realtor.com lead payload
   */
  transformRealtor: (payload: RawRealtorPayload, brokerageId: string, agentId: string): Lead => {
    const names = payload.lead_details.full_name.split(' ');
    const address = `${payload.property_listing.street}, ${payload.property_listing.city}, ${payload.property_listing.state} ${payload.property_listing.zip}`;
    
    return {
      id: `realtor_${Date.now()}`,
      brokerageId,
      assignedAgentId: agentId,
      firstName: names[0] || 'Realtor.com',
      lastName: names.slice(1).join(' ') || 'Lead',
      email: payload.lead_details.email_address,
      phone: payload.lead_details.phone_number,
      status: LeadStatus.NEW,
      temperature: LeadTemperature.HOT,
      source: 'Realtor.com API',
      tags: ['API_Ingested', 'Buyer'],
      propertyType: 'PRIMARY',
      propertyAddress: address,
      budget: 0, // Realtor often provides listings instead of budgets
      notes: [{
        id: `note_${Date.now()}`,
        content: `Lead ingested via Realtor.com. Message: ${payload.lead_details.message}`,
        createdAt: new Date().toISOString(),
        authorId: 'system',
        authorName: 'API Integration'
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedDealValue: 0,
      integrationSource: 'REALTOR'
    };
  },

  /**
   * Generic transformer for custom website webhooks
   */
  transformWebhook: (payload: any, brokerageId: string, agentId: string): Lead => {
    return {
      id: `webhook_${Date.now()}`,
      brokerageId,
      assignedAgentId: agentId,
      firstName: payload.firstName || payload.first_name || 'New',
      lastName: payload.lastName || payload.last_name || 'Lead',
      email: payload.email || '',
      phone: payload.phone || '',
      status: LeadStatus.NEW,
      temperature: LeadTemperature.WARM,
      source: payload.source || 'Website API',
      tags: ['API_Ingested', ...(payload.tags || [])],
      propertyType: payload.propertyType || 'PRIMARY',
      propertyAddress: payload.address || '',
      budget: payload.budget || 0,
      notes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedDealValue: (payload.budget || 0) * 0.03
    };
  }
};
