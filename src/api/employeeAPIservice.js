import axios from "axios";
import { ok, fail } from "./apiHelpers";
import { apiClient as defaultApiClient } from "./apiservice"; 

const BASE_URL = "https://lms.steel.study/employee";

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

const handleError = (error) => {
  console.error("API call failed: ", error);
  // You can add further custom logic here to handle errors like showing a notification
  throw error; // Rethrow the error to propagate it
};

export const fetchEmployeeDashboard = async (username) => {
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
export const fetchEmployeeLoginActivity = async (year = new Date().getFullYear()) => {
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

// **Fetch Notifications**
export const fetchNotifications = async () => {
  try {
    const response = await apiClient.get("/student_dashboard/student_notification/");
    return { success: true, data: response.data.notifications };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { success: false, error: handleError(error, "Failed to fetch notifications.") };
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
  (process.env.REACT_APP_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");

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

export const fetchEmployeeNotifications = async ({ unread } = {}) => {
  try {
    const res = await apiClient.get("/notifications/", {
      params: unread ? { unread: 1 } : {},
    });
    return ok(res.data);
  } catch (error) {
    return fail(error, "Failed to fetch trainee notifications.");
  }
};

// Mark a notification as read (works for any role)
export const markNotificationRead = async (notificationId) => {
  try {
    const res = await apiClient.post("/mark-read/", {
      notification_id: notificationId,
    });
    return ok(res.data);
  } catch (error) {
    return fail(error, "Failed to mark notification as read.");
  }
};


export const markLessonCompleted = async (lessonSlug) => {
  try {
    const res = await defaultApiClient.post(`/lessons/${lessonSlug}/complete/`, {});
    return ok(res.data);
  } catch (error) {
    return fail(error, "Failed to mark lesson as completed.");
  }
};