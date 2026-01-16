import axios from "axios";
import { ok, fail } from "./apiHelpers";
import { apiClient as defaultApiClient, initCsrf, getCsrfToken } from "./apiservice"; 

const BASE_URL = "https://lms.steel.study/trainee";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers["Authorization"] = `Token ${token}`; 
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - don't auto-redirect for profile endpoints
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // For profile endpoints, let the component handle errors
    // Don't auto-redirect to login
    const url = error.config?.url || "";
    const baseURL = error.config?.baseURL || "";
    const fullUrl = baseURL + url;
    
    console.log("Trainee API error:", { url, baseURL, fullUrl, status: error.response?.status });
    
    if (url.includes("/profile/") || fullUrl.includes("/profile/")) {
      // Just return the error, let the component handle it
      // Don't redirect for profile endpoints
      console.log("Profile endpoint error - not redirecting");
      return Promise.reject(error);
    }
    
    // For other endpoints, you can add redirect logic here if needed
    // For now, just reject the error
    return Promise.reject(error);
  }
);

const handleError = (error) => {
  console.error("API call failed: ", error);
  // You can add further custom logic here to handle errors like showing a notification
  throw error; // Rethrow the error to propagate it
};

export const fetchTraineeDashboard = async (username) => {
  return apiClient.get(`/${username}/`)
    .then(response => ({ success: true, data: response.data }))
    .catch(error => ({ success: false, error }));
};

export const fetchRecentActivity = async () => {
  try {
    const response = await apiClient.get('/trainee/recent-activity');
    return response.data; // Returning the data from the API response
  } catch (error) {
    console.error('Error fetching recent activity data:', error);
    throw error; // Handle the error appropriately
  }
};

// traineeAPIservice.js

export const curriculum = async (subjectSlug) => {
  try {
    const response = await apiClient.get(`/curriculum/lessons/${subjectSlug}/`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: handleError(error, "Error fetching lessons.") };
  }
};


export const getLessonDetail = async (lessonSlug) => {
  try {
    const response = await apiClient.get(`/curriculum/lessons/detail/${lessonSlug}/`);
    return { success: true, data: response.data.lesson };
  } catch (error) {
    return { success: false, error: handleError(error, "Error fetching lesson detail.") };
  }
};

export const getQueries = async () => {
  const res = await apiClient.get("/queries/");
  return res.data;
};

export const createQuery = async (formData) => {
  // DRF view expects 'question' field
  const { data } = await apiClient.post("/queries/create/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });                                                          // ✅ create
  return data;
};

export const respondToQuery = async (id, formData) => {
  // DRF view expects 'response' field
  const url = `/queries/${id}/response/`;              // ✅ response (not respond)
  const { data } = await apiClient.post(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

// **Fetch Login Activity**
export const fetchLoginActivity = async (year = new Date().getFullYear()) => {
  try {
    const res = await apiClient.get("/login-activity/", { params: { year } });
    return { success: true, data: res.data };
  } catch (error) {
    console.error("Error fetching login activity:", {
      status: error.response?.status,
      url: error.config?.baseURL + error.config?.url,
      params: error.config?.params,
      data: error.response?.data,
    });
    return { success: false, error: "Failed to fetch login activity." };
  }
};


// **Fetch Active Homework Assignments**
export const fetchActiveHomeworkAssignments = async () => {
  try {
    const response = await apiClient.get(`/student_dashboard/homework-assignment/`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error fetching active homework assignments:", error);
    return { success: false, error: handleError(error, "Failed to fetch active homework assignments.") };
  }
};

// somewhere central, e.g. src/api/url.js
export const API_BASE =
  (process.env.REACT_APP_API_BASE_URL || "https://lms.steel.study").replace(/\/+$/, "");

export function mediaUrl(path) {
  if (!path) return "";
  return /^https?:\/\//i.test(path) ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

export const fetchMacroPlanner = async () => {
  try {
    const response = await apiClient.get("/macroplanners/");

    // If response contains "message", return an empty planner instead of an error
    if (response.data?.message) {
      return { success: true, data: { macroplanner: {} } };
    }

    return { success: true, data: response.data };
  } catch (error) {
    // Handle 404 error by returning an empty macroplanner
    if (error.response?.status === 404) {
      return { success: true, data: { macroplanner: {} } };
    }

    // Return error message for other cases
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

export const fetchMicroPlanner = async () => {
  try {
    const response = await apiClient.get("/microplanners/");
    if (response.data?.message) {
      return { success: true, data: { microplanner_table: {} } }; // ✅ Ensure empty object
    }

    return { success: true, data: response.data };
  } catch (error) {
    if (error.response?.status === 404) {
      return { success: true, data: { microplanner_table: {} } }; // ✅ Return empty object
    }
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

export const fetchTraineeNotifications = async ({ unread } = {}) => {
  try {
    const res = await apiClient.get("/notifications/", {
      params: unread ? { unread: 1 } : {},
    });
    return ok(res.data);
  } catch (error) {
    return fail(error, "Failed to fetch trainee notifications.");
  }
};

export const markNotificationRead = async (notificationId) =>
  apiClient.post("/mark-read/", { notification_id: notificationId })
    .then(res => ({ success: true, data: res.data }))
    .catch(err => ({ success: false, error: "Failed to mark notification as read.", raw: err }));

export const markLessonCompleted = async (lessonSlug) => {
  try {
    const res = await defaultApiClient.post(`/lessons/${lessonSlug}/complete/`, {});
    return ok(res.data);
  } catch (error) {
    return fail(error, "Failed to mark lesson as completed.");
  }
};

export const fetchSOP = async () => {
  try {
    const response = await apiClient.get(`/sops/`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error fetching SOPs:", error);
    return { success: false, error: handleError(error, "Failed to fetch SOPs.") };
  }
};

export async function fetchStandardLibrary() {
  // same auth pattern as fetchSOP()
  try {
    const res = await apiClient.get("/library/"); // ← your endpoint
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, error: e?.response?.data?.detail || e.message };
  }
}


export async function getTraineeProgress() {
  const { data } = await apiClient.get("/trainee-progress/");
  return data; // { user_id, username, name, totals, subjects[] }
}

export const submitFeedback = async (feedbackData) => {
  try {
    const res = await apiClient.post("/feedback/submit/", feedbackData);
    return { success: true, data: res.data };
  } catch (error) {
    console.error("submitFeedback error:", error?.response?.data || error);
    return { success: false, error: error?.response?.data || error };
  }
};

export const listTraineeTasks = async (params = {}) => {
  try {
    const res = await apiClient.get("/trainee-tasks/", { params });
    return { success: true, data: res.data };
  } catch (error) {
    return { success: false, error: error?.response?.data || error };
  }
};

export const submitTraineeTask = async (formData) => {
  try {
    // Use apiClient for consistency (inherits baseURL/auth); override headers for FormData
    const response = await apiClient.post('/trainee-tasks/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',  // Optional; browser usually auto-sets, but explicit for safety
      },
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error: error.response?.data || error.message };
  }
};

// ---------- Review (trainer/admin) ----------
export const reviewTraineeTask = async (id, { marks, feedback, review_file }) => {
  try {
    const fd = new FormData();
    if (marks !== undefined && marks !== null) fd.append("marks", String(marks));
    if (feedback) fd.append("feedback", feedback);
    if (review_file) fd.append("review_file", review_file);
    const res = await apiClient.post(`/trainee-tasks/${id}/review/`, fd, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return { success: true, data: res.data };
  } catch (error) {
    return { success: false, error: error?.response?.data || error };
  }
};

export async function fetchBanners(params = {}) {
  const res = await apiClient.get("/banners/", { params }); // e.g., ?is_active=true
  // Return plain array
  return Array.isArray(res.data) ? res.data : [];
}

// ---------- Trainee Profile API ----------

/**
 * Fetch current trainee profile
 * GET /trainee/profile/
 */
export const fetchTraineeProfile = async () => {
  try {
    const endpoint = "/profile/";
    const fullURL = apiClient.defaults.baseURL + endpoint;
    const token = localStorage.getItem("authToken");
    
    console.log("Fetching trainee profile:", {
      endpoint: endpoint,
      baseURL: apiClient.defaults.baseURL,
      fullURL: fullURL,
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
    });
    
    const response = await apiClient.get(endpoint);
    console.log("Profile response:", response);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error fetching trainee profile:", error);
    const fullURL = apiClient.defaults.baseURL + "/profile/";
    console.error("Error details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      fullURL: fullURL,
      config: {
        method: error.config?.method,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      },
    });
    
    // Handle HTML error responses (404 pages, etc.)
    let errorMessage = "Failed to load profile";
    const responseData = error.response?.data;
    
    if (error.response?.status === 404) {
      // Check if response is HTML
      if (typeof responseData === 'string' && responseData.includes('<!doctype html>')) {
        errorMessage = `Profile endpoint not found (404). Please verify the endpoint exists: ${fullURL}`;
      } else if (responseData?.detail) {
        errorMessage = responseData.detail;
      } else {
        errorMessage = `Profile not found (404). Endpoint: ${fullURL}`;
      }
    } else if (responseData) {
      // Check if response is HTML
      if (typeof responseData === 'string' && responseData.includes('<!doctype html>')) {
        errorMessage = `Server returned HTML error page. Status: ${error.response?.status}. Endpoint: ${fullURL}`;
      } else if (typeof responseData === 'object') {
        errorMessage = responseData.detail || responseData.error || responseData.message || error.message;
      } else if (typeof responseData === 'string') {
        errorMessage = responseData;
      }
    } else {
      errorMessage = error.message || "Failed to load profile";
    }
    
    return { 
      success: false, 
      error: {
        status: error.response?.status,
        message: errorMessage,
        detail: errorMessage,
        fullURL: fullURL,
      }
    };
  }
};

/**
 * Update trainee profile (partial update)
 * PATCH /trainee/profile/
 * @param {Object} profileData - Profile data to update
 * @param {string} profileData.name - Name (optional)
 * @param {string} profileData.department - Department (required)
 * @param {string} profileData.designation - Designation (required)
 * @param {File} profileData.profile_picture - Profile picture file (optional)
 */
export const updateTraineeProfile = async (profileData) => {
  try {
    // Initialize CSRF token if needed
    if (!getCsrfToken()) {
      await initCsrf();
    }
    
    const formData = new FormData();
    
    // Add fields to FormData
    if (profileData.name !== undefined) {
      formData.append("name", profileData.name);
    }
    if (profileData.department !== undefined) {
      formData.append("department", profileData.department);
    }
    if (profileData.designation !== undefined) {
      formData.append("designation", profileData.designation);
    }
    if (profileData.profile_picture instanceof File) {
      formData.append("profile_picture", profileData.profile_picture);
    }
    
    const headers = {
      "Content-Type": "multipart/form-data",
    };
    
    // Add CSRF token if available
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers["X-CSRFToken"] = csrfToken;
    }
    
    // Log the request details for debugging
    const endpoint = "/profile/";
    const fullUrl = apiClient.defaults.baseURL + endpoint;
    console.log("Updating trainee profile:", {
      method: "PATCH",
      url: fullUrl,
      baseURL: apiClient.defaults.baseURL,
      endpoint: endpoint,
      headers: { ...headers, Authorization: "Token ***" }, // Don't log full token
      formDataKeys: Array.from(formData.keys()),
    });
    
    // Try PATCH first (as confirmed working in backend), fallback to PUT if needed
    let response;
    try {
      response = await apiClient.patch(endpoint, formData, {
        headers,
      });
      console.log("Profile update successful (PATCH):", response.data);
    } catch (patchError) {
      // If PATCH fails with method not allowed, try PUT
      if (patchError.response?.status === 405 || 
          patchError.response?.data?.detail?.toLowerCase().includes("not allowed")) {
        console.log("PATCH not allowed, trying PUT...");
        try {
          response = await apiClient.put(endpoint, formData, {
            headers,
          });
          console.log("Profile update successful (PUT):", response.data);
        } catch (putError) {
          throw putError; // Re-throw PUT error
        }
      } else {
        throw patchError; // Re-throw if it's not a method error
      }
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error updating trainee profile:", error);
    console.error("Error details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      config: {
        method: error.config?.method,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: error.config?.baseURL + error.config?.url,
      },
    });
    return { 
      success: false, 
      error: error?.response?.data || error.message || "Failed to update profile" 
    };
  }
};


export async function createTaskAssignment(formData) {
  try {
    // If your backend expects JSON, convert; here we assume multipart to allow file upload
    const res = await apiClient.post("https://lms.steel.study/trainer/tasks/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { success: true, data: res.data };
  } catch (err) {
    const error = err?.response?.data || err.message || "Error";
    return { success: false, error };
  }
}

export async function listMyAssignments(params = {}) { // trainee/employee: only own
  try {
    const res = await defaultApiClient.get("https://lms.steel.study/trainer/tasks/", { params }); // backend uses request.user
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, error: e?.response?.data || e.message };
  }
}

export async function startAssignment(id) {
  try {
    const res = await defaultApiClient.post(`https://lms.steel.study/trainer/tasks/${id}/start/`);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, error: e?.response?.data || e.message };
  }
}

export async function completeAssignment(id) {
  try {
    const res = await defaultApiClient.post(`https://lms.steel.study/trainer/tasks/${id}/complete/`);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, error: e?.response?.data || e.message };
  }
}

export async function attachSubmissionToAssignment(id, submissionId) {
  try {
    const fd = new FormData();
    fd.append("submission_id", String(submissionId));
    const res = await defaultApiClient.post(`https://lms.steel.study/trainer/tasks/${id}/attach-submit/`, fd);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, error: e?.response?.data || e.message };
  }
}

export async function listAssignments(params = {}) {
  try {
    const res = await defaultApiClient.get("https://lms.steel.study/trainer/tasks/", { params });
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, error: e?.response?.data || e.message };
  }
}

// ---------- Concern API ----------

export async function listConcerns() {
  try {
    const res = await apiClient.get("/concerns/");
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: err?.response?.data || err.message };
  }
}

export async function createConcern(formData) {
  try {
    const res = await apiClient.post("/concerns/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: err?.response?.data || err.message };
  }
}

export async function addConcernComment(id, formData) {
  try {
    const res = await apiClient.post(`/concerns/${id}/comment/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: err?.response?.data || err.message };
  }
}
