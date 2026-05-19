const axios = require('axios');

const AI_BASE_URL = process.env.AI_BASE_URL || 'http://yourfactory-ai:8000';

function logAiQueue(message, payload = {}) {
  console.log(`[aiQueue] ${message}`, payload);
}

async function enqueueAnalyzeJob(workId, sourceVideoPath) {
  const endpoint = `${AI_BASE_URL}/analyze/async`;
  logAiQueue('enqueue analyze start', { endpoint, workId, sourceVideoPath });

  try {
    const response = await axios.post(endpoint, {
      work_id: workId,
      sourceVideoPath,
    });

    logAiQueue('enqueue analyze done', {
      workId,
      jobId: response.data?.jobId,
      status: response.data?.status,
      jobType: response.data?.jobType,
    });

    return response.data;
  } catch (error) {
    logAiQueue('enqueue analyze failed', {
      workId,
      endpoint,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

async function enqueueRenderJob(workId, subtitleData) {
  const endpoint = `${AI_BASE_URL}/render/async`;
  logAiQueue('enqueue render start', {
    endpoint,
    workId,
    subtitleKeys: Object.keys(subtitleData || {}),
  });

  try {
    const response = await axios.post(endpoint, {
      work_id: workId,
      subtitle_data: subtitleData,
    });

    logAiQueue('enqueue render done', {
      workId,
      jobId: response.data?.jobId,
      status: response.data?.status,
      jobType: response.data?.jobType,
    });

    return response.data;
  } catch (error) {
    logAiQueue('enqueue render failed', {
      workId,
      endpoint,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

async function getJobStatus(jobId) {
  const endpoint = `${AI_BASE_URL}/jobs/${jobId}`;
  logAiQueue('job status fetch start', { endpoint, jobId });

  try {
    const response = await axios.get(endpoint);

    logAiQueue('job status fetch done', {
      jobId,
      status: response.data?.status,
      jobType: response.data?.jobType,
      progress: response.data?.progress,
    });

    return response.data;
  } catch (error) {
    logAiQueue('job status fetch failed', {
      jobId,
      endpoint,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

module.exports = {
  enqueueAnalyzeJob,
  enqueueRenderJob,
  getJobStatus,
};
