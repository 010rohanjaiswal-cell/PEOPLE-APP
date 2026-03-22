/**
 * Freelancer Jobs API - People App
 */

import apiClient from './client';

export const freelancerJobsAPI = {
  /**
   * Get available jobs for freelancer (filtered by state when lat/lng provided; includes distanceKm)
   * @param {number} [lat] - Latitude for state-based filtering and distance
   * @param {number} [lng] - Longitude for state-based filtering and distance
   * @param {string} [sort] - 'nearest_first' | 'farthest_first'
   * @returns {Promise} List of available jobs (each may have distanceKm)
   */
  getAvailableJobs: async (lat, lng, sort) => {
    const params = {};
    if (lat != null && lng != null) {
      params.lat = lat;
      params.lng = lng;
    }
    if (sort) params.sort = sort;
    const response = await apiClient.get('/api/freelancer/jobs/available', { params });
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
   * Apply to a non-delivery job (client accepts later)
   * @param {string} jobId - Job ID
   * @returns {Promise}
   */
  applyJob: async (jobId) => {
    const response = await apiClient.post(`/api/freelancer/jobs/${jobId}/apply`);
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

  /**
   * Get completed orders (order history) for freelancer
   * @returns {Promise} List of completed orders
   */
  getOrders: async () => {
    const response = await apiClient.get('/api/freelancer/orders');
    return response.data;
  },
};

export default freelancerJobsAPI;

