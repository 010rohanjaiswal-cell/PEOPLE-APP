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
};

export default clientJobsAPI;

