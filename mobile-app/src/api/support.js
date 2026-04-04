/**
 * Support Tickets API - People App
 */

import apiClient from './client';

export const supportAPI = {
  startTicket: async (payload) => {
    const res = await apiClient.post('/api/support/tickets/start', payload || {});
    return res.data;
  },
  listTickets: async (limit = 7) => {
    const res = await apiClient.get('/api/support/tickets', { params: { limit } });
    return res.data;
  },
  getTicket: async (ticketId) => {
    const res = await apiClient.get(`/api/support/tickets/${ticketId}`);
    return res.data;
  },
  append: async (ticketId, payload) => {
    const res = await apiClient.post(`/api/support/tickets/${ticketId}/append`, payload);
    return res.data;
  },
  cancelOrderAction: async (ticketId) => {
    const res = await apiClient.post(`/api/support/tickets/${ticketId}/actions/cancel-order`);
    return res.data;
  },
  clientUnassign: async (ticketId, jobId) => {
    const res = await apiClient.post(`/api/support/tickets/${ticketId}/actions/client-unassign`, {
      ...(jobId ? { jobId: String(jobId) } : {}),
    });
    return res.data;
  },
  clientCancelJob: async (ticketId) => {
    const res = await apiClient.post(`/api/support/tickets/${ticketId}/actions/client-cancel-job`);
    return res.data;
  },
  clientConfirmDeleteJob: async (ticketId, jobId) => {
    const res = await apiClient.post(`/api/support/tickets/${ticketId}/actions/client-confirm-delete-job`, {
      jobId,
    });
    return res.data;
  },
  complete: async (ticketId) => {
    const res = await apiClient.post(`/api/support/tickets/${ticketId}/complete`);
    return res.data;
  },
};

export default supportAPI;

