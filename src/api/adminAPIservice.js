import axios from 'axios';
import { ok, fail } from './apiHelpers';

const BASE_URL = 'https://lms.steel.study/custom_admin';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Token ${token}`;
    }
    // Log request details for debugging
    console.log('Request:', {
      url: config.url,
      headers: config.headers,
      method: config.method,
    });
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

export const fetchAdminDashboard = async (username) => {
  try {
    const response = await apiClient.get(`/${username}`); // Remove trailing slash
    console.log('Fetch admin dashboard response:', response.data);
    return ok(response.data);
  } catch (error) {
    console.error('Fetch admin dashboard error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
      headers: error.config?.headers,
    });
    return fail(error.response?.data?.error || error.message);
  }
};

export const fetchCourses = async () => {
  return apiClient.get("/courses/")
    .then(response => ({ success: true, data: response.data }))
    .catch(error => ({ success: false, error }));
};

export const fetchLessons = async (initialUrl = "/course-lessons/") => {
  try {
    let allLessons = [];
    let nextPageUrl = initialUrl;

    while (nextPageUrl) {
      let response;

      if (nextPageUrl.startsWith("http")) {
        const token = localStorage.getItem("authToken");
        response = await axios.get(nextPageUrl, {
          headers: {
            "Authorization": `Token ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });
      } else {
        response = await apiClient.get(nextPageUrl);
      }

      const rawData = response.data;

      // ✅ NEW: support raw array and paginated object
      const lessonsRaw = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData.results)
        ? rawData.results
        : [];

      if (!Array.isArray(lessonsRaw)) {
        throw new Error("Invalid API response format");
      }

      const lessons = lessonsRaw.map((lesson) => ({
        id: lesson.lesson_id,
        name: lesson.lesson_name,
        courseId: lesson.course,  
        courseName: lesson.course_name,
        videoUrl: lesson.lesson_video || null,
        lessonPlanUrl: lesson.lesson_plans || null,
        lessonPpt: lesson.lesson_ppt || null,
        lessonEditor: lesson.lesson_editor || "",
        displayOnFrontend: lesson.display_on_frontend,
        }));
      allLessons = [...allLessons, ...lessons];

      // 🛑 No pagination anymore
      nextPageUrl = null;
    }

    return { success: true, data: allLessons };
  } catch (error) {
    console.error("❌ Error fetching lessons:", error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

export const fetchLMSEngagement = async ({ month } = {}) => {
  try {
    const res = await apiClient.get("/lms-engagement/", {
      params: month ? { month } : {},
    });
    return ok(res.data);
  } catch (error) {
    return fail(error, "Failed to fetch LMS engagement.");
  }
};

export const fetchRecentActivity = async () => {
  try {
    const response = await apiClient.get('/recent_activity/');
    console.log('fetchRecentActivity response:', response.data);
    return ok(response.data);
  } catch (error) {
    console.error('fetchRecentActivity error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
      headers: error.config?.headers,
    });
    return fail(error.response?.data?.error || 'Failed to fetch recent activity.');
  }
};

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

export const addMacroPlanner = async (planner) => {
  try {
    const response = await apiClient.post("/macroplanners/", {
      duration: planner.duration,
      week: planner.week,
      month: planner.month,
      department: planner.department,
      module: planner.module,
    }, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

export const updateMacroPlanner = async (planner) => {
  try {
    const response = await apiClient.patch(`/macroplanners/${planner.id}/`, {
      duration: planner.duration,
      month: planner.month,
      department: planner.department,
      module: planner.module,
      week: planner.week,
    }, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
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

export const addMicroPlanner = async (planner) => {
  try {
    const formData = new FormData();
    formData.append("grade", planner.grade);
    formData.append("month", planner.month);
    formData.append("no_of_sessions", planner.no_of_sessions);
    formData.append("name_of_activity", JSON.stringify(planner.name_of_activity));
    formData.append("extra_activity", planner.extra_activity);
    
    const response = await apiClient.post("/microplanners/", planner, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    

    return { success: true, data: response.data };
  } catch (error) {
    // console.error("Server error:", error.response ? error.response.data : error.message);
    return { success: false, error: error.response ? error.response.data : error.message };
  }
};

export const updateMicroPlanner = async (planner) => {
  try {
    const response = await apiClient.patch(`/microplanners/${planner.id}/`, {
      month: planner.month,
      week: planner.week,
      department: planner.department,
      no_of_sessions: planner.no_of_sessions,
      name_of_topic: planner.name_of_topic,
    }, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data || error.message };
  }
};

export async function trainingService() {
  const res = await apiClient.get("/training-report/");
  return res.data;
}

export async function getDetailedTrainingReport(userId) {
  const res = await apiClient.get(`/training-report/${userId}/`);
  return res.data;
}

export const API_BASE =
  (process.env.REACT_APP_API_BASE_URL || "https://lms.steel.study").replace(/\/+$/, "");

export function mediaUrl(path) {
  if (!path) return "";
  return /^https?:\/\//i.test(path) ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

const handleError = (error) => {
  console.error("API call failed: ", error);
  // You can add further custom logic here to handle errors like showing a notification
  throw error; // Rethrow the error to propagate it
};

export async function sendAdminNotification(notificationData) {
  try {
    const fd = new FormData();

    // required
    fd.append("subject", (notificationData.subject || "").trim());
    fd.append("message", (notificationData.message || "").trim());

    // coerce notification_type to backend-accepted values
    const nt = (notificationData.notification_type || "info").toLowerCase();
    const ntMapped = nt === "general" || nt === "reminder" ? "info" : nt; // map unsupported to "info"
    fd.append("notification_type", ntMapped);

    // mode + audience
    fd.append("mode", notificationData.mode); // "group" | "individual"
    fd.append(
      "audience",
      notificationData.mode === "group"
        ? notificationData.audience || "both"
        : "both" // backend ignores in individual mode anyway
    );

    // optional fields
    const link = (notificationData.link || "").trim();
    if (link) fd.append("link", link);

    if (notificationData.mode === "individual") {
      // usernames must be sent as repeated keys: usernames=alice&usernames=bob
      (notificationData.usernames || []).forEach((u) => {
        if (u) fd.append("usernames", u);
      });
    } else {
      if (notificationData.audience !== "trainee") {
        const dept = (notificationData.department || "").trim();
        if (dept) fd.append("department", dept);
      }
    }

    const res = await apiClient.post("/notifications/send/", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { success: true, data: res.data };
  } catch (error) {
    // bubble up field errors from DRF so the UI can show them
    return { success: false, error: error.response?.data || error.message };
  }
}

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

export const fetchTraineeFeedback = async (params = {}) => {
  try {
    const res = await apiClient.get("/feedback/", { params });
    return { success: true, data: res.data };
  } catch (error) {
    console.error("fetchTraineeFeedback error:", error?.response?.data || error);
    return { success: false, error: error?.response?.data || error };
  }
};

export async function fetchAdminCourseProgress(params = {}) {
  try {
    const res = await apiClient.get("/progress/trainer-courses/", {
      params,
    });
    return { success: true, data: res.data };
  } catch (error) {
    console.error("fetchAdminCourseProgress error:", error?.response || error);
    return { success: false, error: error?.response || error };
  }
}

export async function fetchAdminLessonRows(params = {}) {
  try {
    const res = await apiClient.get("/progress/lesson-rows/", { params });
    return { success: true, data: res.data };
  } catch (error) {
    console.error("fetchAdminLessonRows error:", error?.response || error);
    return {
      success: false,
      error: {
        status: error?.response?.status,
        message:
          error?.response?.data?.detail ||
          error?.message ||
          "Request failed",
      },
    };
  }
}

export const fetchAdminNotifications = async (params) => {
  try {
    const res = await apiClient.get("/notifications/send/", { params });
    return { success: true, data: res.data };
  } catch (error) {
    return { success: false, error: error?.response?.data || error };
  }
};

const CONCERNS_CANDIDATES = [
  "/trainee/concerns/",
  "/api/trainee/concerns/",
  "/custom_admin/trainee/concerns/",
  "/custom_admin/api/trainee/concerns/",
];

// Cache the resolved base in sessionStorage (clears on tab close)
const CONCERNS_CACHE_KEY = "concerns_base_v1";

async function resolveConcernsBase() {
  const cached = sessionStorage.getItem(CONCERNS_CACHE_KEY);
  if (cached) return cached;

  for (const cand of CONCERNS_CANDIDATES) {
    try {
      // GET the list endpoint (role-aware list). If it returns 200, lock it in.
      const res = await apiClient.get(cand, { params: { _probe: 1 } });
      if (res && (res.status === 200 || res.status === 204)) {
        sessionStorage.setItem(CONCERNS_CACHE_KEY, cand);
        console.log("[concerns] using base:", cand);
        return cand;
      }
    } catch (e) {
      // 404/403 just means wrong mount or no permission with this route — try next
      // console.debug("[concerns] probe failed", cand, e?.response?.status);
    }
  }
  // Fallback to the most likely (adjust if you know your deployment)
  const fallback = "/trainee/concerns/";
  console.warn("[concerns] no route matched, falling back to", fallback);
  sessionStorage.setItem(CONCERNS_CACHE_KEY, fallback);
  return fallback;
}

export const adminListConcerns = async (params = {}) => {
  const base = await resolveConcernsBase();
  const { data } = await apiClient.get(base, { params });
  return data;
};

export const adminGetConcern = async (id) => {
  const base = await resolveConcernsBase();
  const { data } = await apiClient.get(`${base}${id}/`);
  return data;
};

export const adminChangeStatus = async (id, status) => {
  const base = await resolveConcernsBase();
  const { data } = await apiClient.patch(`${base}${id}/status/`, { status });
  return data;
};

export const adminAssignConcern = async (id, username) => {
  const base = await resolveConcernsBase();
  const { data } = await apiClient.patch(`${base}${id}/assign/`, { username });
  return data;
};

export const adminAddComment = async (id, message) => {
  const base = await resolveConcernsBase();
  const fd = new FormData();
  fd.append("message", message);
  const { data } = await apiClient.post(`${base}${id}/comment/`, fd);
  return data;
};