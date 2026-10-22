'use client';

import { useState, useCallback } from 'react';
import { Lead, LeadStatus, CreateLeadPayload, LeadFilter } from '../domain/types';
import { HeadlessCrmService } from '../domain/lead-actions';
import { LeadStateMachine } from '../domain/lead-state-machine';

const defaultCrmService = new HeadlessCrmService([
  {
    id: 'lead-101',
    name: 'Sarah Connor',
    email: 'sarah@cyberdyne.io',
    company: 'Cyberdyne Systems',
    status: 'QUALIFIED',
    estimatedValue: 45000,
    score: 80,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'lead-102',
    name: 'Bruce Wayne',
    email: 'bruce@wayneenterprises.com',
    company: 'Wayne Enterprises',
    status: 'NEW',
    estimatedValue: 120000,
    score: 90,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]);

export function useLeads(filter: LeadFilter = {}) {
  const [service] = useState(() => defaultCrmService);
  const [leads, setLeads] = useState<Lead[]>(() => service.filterLeads(filter));

  const refreshLeads = useCallback(() => {
    setLeads(service.filterLeads(filter));
  }, [service, filter]);

  return {
    leads,
    refreshLeads
  };
}

export function useLeadActions() {
  const [service] = useState(() => defaultCrmService);

  const createLead = useCallback((payload: CreateLeadPayload): Lead => {
    return service.createLead(payload);
  }, [service]);

  const updateLeadStatus = useCallback((leadId: string, nextStatus: LeadStatus): Lead => {
    return service.updateLeadStatus(leadId, nextStatus);
  }, [service]);

  const canTransitionStatus = useCallback((currentStatus: LeadStatus, nextStatus: LeadStatus): boolean => {
    return LeadStateMachine.canTransition(currentStatus, nextStatus);
  }, []);

  return {
    createLead,
    updateLeadStatus,
    canTransitionStatus
  };
}
