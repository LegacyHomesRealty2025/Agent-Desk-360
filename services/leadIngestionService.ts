import { Lead, LeadStatus, LeadTemperature, User, LeadNote } from "../types.ts";

export const leadIngestionService = {
  /**
   * Transforms a mock Zillow Tech Connect JSON payload into a CRM Lead object.
   */
  transformZillow: (payload: any, brokerageId: string, agentId: string): Lead => {
    const { contact_info, property_info, inquiry_id } = payload;
    
    const leadId = `l_zillow_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const note: LeadNote = {
      id: `n_z_${Date.now()}`,
      content: `Automated Lead Ingestion from Zillow. Property Interest: ${property_info.address} (${property_info.price})`,
      createdAt: timestamp,
      authorId: 'SYSTEM',
      authorName: 'Zillow Tech Connect'
    };

    return {
      id: leadId,
      brokerageId: brokerageId,
      assignedAgentId: agentId,
      firstName: contact_info.first_name || 'Zillow',
      lastName: contact_info.last_name || 'Lead',
      email: contact_info.email || '',
      phone: contact_info.phone || '',
      status: LeadStatus.NEW,
      temperature: LeadTemperature.HOT,
      source: 'Zillow',
      tags: ['Zillow Lead', 'Buyer'],
      propertyType: 'PRIMARY',
      propertyAddress: property_info.address,
      budget: parseInt(property_info.price.replace(/[$,]/g, '')) || 0,
      notes: [note],
      createdAt: timestamp,
      updatedAt: timestamp,
      estimatedDealValue: (parseInt(property_info.price.replace(/[$,]/g, '')) || 0) * 0.03,
      externalId: inquiry_id,
      integrationSource: 'ZILLOW_TECH_CONNECT'
    };
  }
};
