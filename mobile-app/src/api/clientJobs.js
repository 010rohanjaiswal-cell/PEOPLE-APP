/**
 * Client Jobs API - People App
 */

import apiClient from './client';

export const clientJobsAPI = {
  /**
   * Get active jobs for client
   * @returns {Promise} List of active jobs
   */
  getActiveJobs: async () => {
    const response = await apiClient.get('/api/client/jobs/active');
    return response.data;
  },

  /** For Support chat: primary job to offer cancel (title, budget, status). */
  getSupportCancelContext: async () => {
    const response = await apiClient.get('/api/client/jobs/support-cancel-context');
    return response.data;
  },

  /** For Support chat: job + assigned freelancer name for unassign confirmation. */
  getSupportUnassignContext: async () => {
    const response = await apiClient.get('/api/client/jobs/support-unassign-context');
    return response.data;
  },

  /**
   * Get job history for client
   * @returns {Promise} List of completed jobs
   */
  getJobHistory: async () => {
    const response = await apiClient.get('/api/client/jobs/history');
    return response.data;
  },

  /**
   * Post a new job
   * @param {Object} jobData - Job details
   * @returns {Promise} Created job
   */
  postJob: async (jobData) => {
    const response = await apiClient.post('/api/client/jobs', jobData);
    return response.data;
  },

  /**
   * Update a job
   * @param {string} jobId - Job ID
   * @param {Object} jobData - Updated job details
   * @returns {Promise} Updated job
   */
  updateJob: async (jobId, jobData) => {
    const response = await apiClient.put(`/api/client/jobs/${jobId}`, jobData);
    return response.data;
  },

  /**
   * Delete a job
   * @param {string} jobId - Job ID
   * @returns {Promise}
   */
  deleteJob: async (jobId) => {
    const response = await apiClient.delete(`/api/client/jobs/${jobId}`);
    return response.data;
  },

  /**
   * Accept an offer
   * @param {string} jobId - Job ID
   * @param {string} offerId - Offer ID
   * @returns {Promise}
   */
  acceptOffer: async (jobId, offerId) => {
    const response = await apiClient.post(`/api/client/jobs/${jobId}/accept-offer`, {
      offerId,
    });
    return response.data;
  },

  /**
   * Reject an offer
   * @param {string} jobId - Job ID
   * @param {string} offerId - Offer ID
   * @returns {Promise}
   */
  rejectOffer: async (jobId, offerId) => {
    const response = await apiClient.post(`/api/client/jobs/${jobId}/reject-offer`, {
      offerId,
    });
    return response.data;
  },

  /**
   * Mark job as paid
   * @param {string} jobId - Job ID
   * @returns {Promise}
   */
  payJob: async (jobId) => {
    const response = await apiClient.post(`/api/client/jobs/${jobId}/pay`);
    return response.data;
  },

  /**
   * Mark job as paid by cash (deduct commission from freelancer wallet if possible)
   * @param {string} jobId - Job ID
   * @returns {Promise}
   */
  payJobCash: async (jobId) => {
    const response = await apiClient.post(`/api/client/jobs/${jobId}/pay-cash`);
    return response.data;
  },

  /**
   * Get offers for a job
   * @param {string} jobId - Job ID
   * @returns {Promise} List of offers
   */
  getOffers: async (jobId) => {
    const response = await apiClient.get(`/api/client/jobs/${jobId}/offers`);
    return response.data;
  },

  /**
   * Get applications for a job (pending, sorted by rating high → low)
   * @param {string} jobId - Job ID
   * @returns {Promise}
   */
  getApplications: async (jobId) => {
    const response = await apiClient.get(`/api/client/jobs/${jobId}/applications`);
    return response.data;
  },

  /**
   * Enable/disable Auto pick (best applicant by experience + rating)
   * @param {string} jobId
   * @param {boolean} enabled
   */
  setAutoPick: async (jobId, enabled) => {
    const response = await apiClient.put(`/api/client/jobs/${jobId}/auto-pick`, { enabled });
    return response.data;
  },

  /**
   * Accept an application (assigns freelancer)
   * @param {string} jobId - Job ID
   * @param {string} applicationId - Application subdocument id
   * @returns {Promise}
   */
  acceptApplication: async (jobId, applicationId) => {
    const response = await apiClient.post(`/api/client/jobs/${jobId}/accept-application`, {
      applicationId,
    });
    return response.data;
  },

  /**
   * Reject an application
   * @param {string} jobId - Job ID
   * @param {string} applicationId - Application subdocument id
   * @returns {Promise}
   */
  rejectApplication: async (jobId, applicationId) => {
    const response = await apiClient.post(`/api/client/jobs/${jobId}/reject-application`, {
      applicationId,
    });
    return response.data;
  },

  /**
   * Rate assigned freelancer for a completed job
   * @param {string} jobId - Job ID
   * @param {number} rating - 0..5
   * @returns {Promise}
   */
  rateFreelancer: async (jobId, rating, reason) => {
    const response = await apiClient.post(`/api/client/jobs/${jobId}/rate-freelancer`, {
      rating,
      ...(reason ? { reason } : {}),
    });
    return response.data;
  },
};

export default clientJobsAPI;

