import axios from "axios";
import { ok, fail } from "./apiHelpers";
import { initCsrf, getCsrfToken } from "./apiservice";

const BASE_URL = "https://lms.steel.study/trainer";

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

export const fetchTrainerDashboard = async (username) => {
  return apiClient.get(`/${username}/`)
    .then(response => ({ success: true, data: response.data }))
    .catch(error => ({ success: false, error }));
};

export const fetchCourses = async () => {
  return apiClient.get("/courses/")
    .then(response => ({ success: true, data: response.data }))
    .catch(error => ({ success: false, error }));
};


const toInt = (v) => {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};

// ✅ Make ids numeric & consistent
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
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });
      } else {
        response = await apiClient.get(nextPageUrl);
      }

      const raw = response.data;
      const items = Array.isArray(raw) ? raw : Array.isArray(raw?.results) ? raw.results : [];

      const lessons = items.map((lesson) => {
        const id = toInt(lesson.lesson_id) ?? toInt(lesson.id) ?? toInt(lesson.pk) ?? toInt(lesson.lesson);
        const courseId = toInt(lesson.course) ?? toInt(lesson.course_id) ?? toInt(lesson?.course?.id);
        return {
          id,                   // numeric PK
          db_id: id,            // keep this alias for UI code
          name: lesson.lesson_name ?? lesson.name ?? lesson.title ?? (id != null ? `Lesson #${id}` : "Lesson"),
          courseId,             // numeric
          courseName: lesson.course_name ?? lesson?.course?.name ?? "—",
          videoUrl: lesson.lesson_video || null,
          lessonPlanUrl: lesson.lesson_plans || null,
          lessonPpt: lesson.lesson_ppt || null,
          lessonEditor: lesson.lesson_editor || "",
          displayOnFrontend: !!lesson.display_on_frontend,
        };
      });

      allLessons = allLessons.concat(lessons);
      nextPageUrl = null; // no pagination
    }

    return { success: true, data: allLessons };
  } catch (error) {
    console.error("❌ Error fetching lessons:", error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
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

export const deleteMacroPlanner = async (id) => {
  try {
    const response = await apiClient.delete(`/macroplanners/${id}/`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
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


export const deleteMicroPlanner = async (id) => {
  try {
    const response = await apiClient.delete(`/microplanners/${id}/`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const notifyEmployees = async (data) => {
  try {
    console.log("Payload sent to notifyStudents API:", data); // Log the payload for debugging
    const response = await apiClient.post("/notify_employees/", data);
    console.log("Response from notifyStudents API:", response.data); // Log the response for debugging
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error in notifyStudents API:", error.response?.data || error.message); // Log the error response
    return { success: false, error: error.response?.data || error.message };
  }
};

export const fetchActiveEmployees = async () => {
  try {
    const response = await apiClient.get("/active-users/");
    return { success: true, data: response.data.active_users };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const fetchRecentActivity = async () => {
  return apiClient.get("/recent_activity/")
    .then(response => ({ success: true, data: response.data }))
    .catch(error => ({ success: false, error }));
};

export const trainerSendNotification = async (payload) => {
  try {
    const res = await apiClient.post("/notifications/send/", payload);
    return ok(res.data);
  } catch (error) {
    return fail(error, "Failed to send notifications.");
  }
};

// (Optional) If you expose /notifications/me/ for trainers too:
export const fetchMyNotifications = async ({ unread } = {}) => {
  try {
    const res = await apiClient.get("/notifications/me/", {
      params: unread ? { unread: 1 } : {},
    });
    return ok(res.data);
  } catch (error) {
    return fail(error, "Failed to fetch my notifications.");
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

export async function getTrainerQueries() {
  const res = await apiClient.get("/queries/");
  return res.data;
}

export async function respondToTrainerQuery(queryId, formDataOrPayload) {
  // Accepts either FormData or a plain object { response: "..." }
  const res = await apiClient.post(`/queries/${queryId}/response/`, formDataOrPayload);
  return res.data;
}

export async function assignTrainerToQuery(queryId, assignedTrainer) {
  // `assignedTrainer` can be username, user id, or email — depends on your backend expectation.
  // Your current APIView just sets `query.assigned_trainer = trainer` directly.
  // If your serializer expects an ID, pass the ID here.
  const payload = { assigned_trainer: assignedTrainer };
  const res = await apiClient.patch(`/queries/${queryId}/assign/`, payload);
  return res.data;
}

// Optional (only if you are using a mark-read endpoint for notifications)
export async function markTrainerNotificationRead(notificationId) {
  const res = await apiClient.post("/mark-read/", { id: notificationId });
  return res.data;
}

// trainerAPIservice.js
export async function sendTrainerNotification(notificationData) {
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

// --- NEW: Lesson Progress list ---
export const fetchTrainerLessonProgress = async () => {
  try {
    const res = await apiClient.get(`/lesson-progress/`);
    return { success: true, data: res.data };
  } catch (error) {
    return { success: false, error };
  }
};

// GET /trainer/course-progress/
export const fetchTrainerCourseProgress = async () => {
  try {
    const res = await apiClient.get(`/course-progress/`);
    return { success: true, data: res.data };
  } catch (error) {
    console.error("fetchTrainerCourseProgress error:", error?.response?.data || error);
    return { success: false, error: error?.response?.data || error };
  }
};

// trainerAPIservice.js
export const updateTrainerLessonProgress = async (lessonPk, action) => {
  try {
    const pk = Number(lessonPk);
    if (!Number.isInteger(pk)) throw new Error(`Invalid lesson pk: ${lessonPk}`);

    const res = await apiClient.post(`/lesson-progress/`, {
      lesson: pk,   // integer, not string
      action,       // "start" | "complete" | (optionally "reset" if supported)
    });
    return { success: true, data: res.data };
  } catch (error) {
    console.error("updateTrainerLessonProgress error:", error?.response?.data || error);
    return { success: false, error: error?.response?.data || error.message || error };
  }
};

// ---------- Trainer Profile API ----------

/**
 * Fetch current trainer profile
 * GET /trainer/profile/
 */
export const fetchTrainerProfile = async () => {
  try {
    console.log("Fetching trainer profile from:", apiClient.defaults.baseURL + "/profile/");
    const response = await apiClient.get("/profile/");
    console.log("Profile response:", response);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error fetching trainer profile:", error);
    console.error("Error details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    // Return error object with status for component to handle
    const errorData = error.response?.data || {};
    return { 
      success: false, 
      error: {
        ...errorData,
        status: error.response?.status,
        message: error.message,
        // Extract detail, error, or message from response
        detail: errorData.detail || errorData.error || errorData.message || error.message,
      }
    };
  }
};

/**
 * Update trainer profile (partial update)
 * PATCH /trainer/profile/
 * @param {Object} profileData - Profile data to update
 * @param {string} profileData.name - Name (optional)
 * @param {string} profileData.department - Department (required)
 * @param {string} profileData.designation - Designation (required)
 * @param {File} profileData.profile_picture - Profile picture file (optional)
 */
export const updateTrainerProfile = async (profileData) => {
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
    console.log("Updating trainer profile:", {
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
    console.error("Error updating trainer profile:", error);
    const fullURL = error.config?.baseURL + error.config?.url;
    console.error("Error details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      config: {
        method: error.config?.method,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: fullURL,
      },
    });
    
    // Handle HTML error responses (404 Not Found pages)
    let errorMessage = "Failed to update profile";
    if (error.response?.status === 404) {
      errorMessage = `Endpoint not found: ${fullURL}. Please verify the endpoint exists on the server.`;
      console.error("404 Error - Endpoint may not exist on server:", fullURL);
    } else if (error.response?.data) {
      // Check if response is HTML (404 page)
      const responseData = error.response.data;
      if (typeof responseData === 'string' && responseData.includes('<!doctype html>')) {
        errorMessage = `Server returned HTML error page. Endpoint may not exist: ${fullURL}`;
      } else {
        errorMessage = error.response.data;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
};