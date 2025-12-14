/**
 * Freelancer Jobs API - People App
 */

import apiClient from './client';

export const freelancerJobsAPI = {
  /**
   * Get available jobs for freelancer
   * @returns {Promise} List of available jobs
   */
  getAvailableJobs: async () => {
    const response = await apiClient.get('/api/freelancer/jobs/available');
    return response.data;
  },

  /**
   * Get assigned jobs for freelancer
   * @returns {Promise} List of assigned jobs
   */
  getAssignedJobs: async () => {
    const response = await apiClient.get('/api/freelancer/jobs/assigned');
    return response.data;
  },

  /**
   * Pickup a job
   * @param {string} jobId - Job ID
   * @returns {Promise}
   */
  pickupJob: async (jobId) => {
    const response = await apiClient.post(`/api/freelancer/jobs/${jobId}/pickup`);
    return response.data;
  },

  /**
   * Make an offer on a job
   * @param {string} jobId - Job ID
   * @param {Object} offerData - Offer details (amount, message)
   * @returns {Promise}
   */
  makeOffer: async (jobId, offerData) => {
    const response = await apiClient.post(`/api/freelancer/jobs/${jobId}/offer`, offerData);
    return response.data;
  },

  /**
   * Mark work as done
   * @param {string} jobId - Job ID
   * @returns {Promise}
   */
  completeWork: async (jobId) => {
    const response = await apiClient.post(`/api/freelancer/jobs/${jobId}/complete`);
    return response.data;
  },

  /**
   * Mark job as fully completed
   * @param {string} jobId - Job ID
   * @returns {Promise}
   */
  fullyComplete: async (jobId) => {
    const response = await apiClient.post(`/api/freelancer/jobs/${jobId}/fully-complete`);
    return response.data;
  },
};

export default freelancerJobsAPI;

