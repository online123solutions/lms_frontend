import axios from "axios";
import { ok, fail } from "./apiHelpers";

const BASE_URL = "https://lms.steel.study";

// Create Axios instance
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

let CSRF_TOKEN = null;

export async function initCsrf() {
  try {
    const res = await apiClient.get("/account/csrf/"); // sets cookie + returns token
    CSRF_TOKEN = res.data?.csrfToken || null;
    return CSRF_TOKEN;
  } catch (error) {
    // If CSRF endpoint doesn't exist (404), try to get from cookies
    if (error.response?.status === 404) {
      console.warn("CSRF endpoint not found, trying to get from cookies");
      CSRF_TOKEN = getCsrfToken(); // Try to get from cookies
      return CSRF_TOKEN;
    }
    // For other errors, log but don't throw - CSRF might not be required
    console.warn("Failed to initialize CSRF token:", error.message);
    return null;
  }
}

// Attach token to every request
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

// Handle response errors - clear cache on auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get 401 (Unauthorized) or 403 (Forbidden), clear localStorage and redirect to login
    // But only for certain endpoints to avoid false positives
    if (error.response?.status === 401 || error.response?.status === 403) {
      const url = error.config?.url || "";
      const baseURL = error.config?.baseURL || "";
      const fullUrl = (baseURL + url).toLowerCase();
      const currentPath = window.location.pathname.toLowerCase();
      
      // Don't redirect for profile endpoints - let the component handle the error
      // Don't redirect if already on login/signup page or profile page
      if (
        !fullUrl.includes("/profile/") &&
        !url.includes("/profile/") &&
        !url.includes("/account/login") &&
        !url.includes("/account/register") &&
        !currentPath.includes("/login") &&
        !currentPath.includes("/signup") &&
        !currentPath.includes("profile")
      ) {
        console.warn("Authentication error detected. Clearing cache and redirecting to login.");
        localStorage.clear();
        sessionStorage.clear();
        // Force page reload with cache-busting to clear any cached JavaScript
        window.location.href = "/login?cache_clear=" + Date.now();
      } else {
        console.log("Skipping redirect for:", { url, fullUrl, currentPath });
      }
    }
    return Promise.reject(error);
  }
);

// Utility to extract error message
const handleError = (error, defaultMessage) => {
  return error.response?.data?.error || defaultMessage;
};

// Better error extractor (DRF-friendly)
const pickError = (e, fallback) =>
  e?.response?.data?.error ||
  e?.response?.data?.detail ||
  e?.message ||
  fallback;

// ✅ LOGIN FUNCTION
export const login = async (username_or_email, password) => {
  try {
    const response = await apiClient.post("/account/login/", {
      username: username_or_email, 
      password,
    });

    const { token, username, dashboard_url, role, is_superuser } = response.data;

    localStorage.setItem("authToken", token);
    localStorage.setItem("username", username);
    localStorage.setItem("dashboard_url", dashboard_url);
    localStorage.setItem("role", role || "");
    localStorage.setItem("isSuperUser", is_superuser ? "true" : "false");
    localStorage.setItem("isAuthenticated", "true");

    return { success: true, data: response.data };
  } catch (error) {
    console.error("Login failed:", error.response?.data || error);
    return {
      success: false,
      error: handleError(error, "Invalid login credentials"),
    };
  }
};


// In apiservice.js
export const register = async (data) => {
  try {
    const response = await apiClient.post("/account/register/", data, {
      headers: { "Content-Type": "application/json" },
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data || error.message };
  }
};

export const logout = async () => {
  return apiClient.post("/account/logout/")
    .then(() => ({ success: true }))
    .catch((error) => ({ success: false, error }));
};

// **Fetch Document as Blob**
export const fetchDocument = async (url) => {
  try {
    const response = await apiClient.get(url, { responseType: "blob" });
    if (response.status !== 200) throw new Error("Failed to fetch the document");

    const fileType = response.headers["content-type"];
    return { success: true, blob: response.data, fileType };
  } catch (error) {
    console.error("Error fetching document:", error);
    return { success: false, error: handleError(error, "Failed to fetch document.") };
  }
};

export const curriculum1 = async (subjectSlug) => {
  try {
    const token = localStorage.getItem("authToken");
    const res = await apiClient.get(
      `/curriculum/lessons/${encodeURIComponent(subjectSlug)}/`,
      { headers: { Authorization: `Token ${token}` } }
    );
    return { success: true, data: res.data };
  } catch (err) {
    console.error("API call failed:", err);
    return { success: false, error: err.response?.data || err.message };
  }
};

// QUIZ APIs (reuse apiClient + interceptor)
export const getQuizzes = async () => {
  try {
    const res = await apiClient.get("/quiz/");                // list
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, error: pickError(e, "Failed to load quizzes.") };
  }
};

export const getQuizMeta = async (id) => {
  try {
    const res = await apiClient.get(`/quiz/${id}/`);          // details
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, error: pickError(e, "Failed to load quiz.") };
  }
};

export const getQuizData = async (id) => {
  try {
    const res = await apiClient.get(`/quiz/${id}/data/`);     // questions + answers
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, error: pickError(e, "Failed to load quiz data.") };
  }
};

export const saveQuizResult = async (id, payload) => {
  try {
    const res = await apiClient.post(`/quiz/${id}/save/`, payload);
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, error: pickError(e, "Failed to save quiz result.") };
  }
};

export const requestPasswordReset = async (data) => {
  try {
    if (!getCsrfToken()) await initCsrf();
    const response = await apiClient.post("/account/password-reset/", data, {
      headers: { "X-CSRFToken": getCsrfToken() }, // Django expects this header
    });
    return response.data;
  } catch (error) {
    return { success: false, error: handleError(error, "Failed to request password reset.") };
  }
};

export const confirmPasswordReset = async (data) => {
  try {
    if (!getCsrfToken()) await initCsrf();
    const response = await apiClient.post(
      `/account/password-reset-confirm/${data.uidb64}/${data.token}/`,
      { new_password: data.new_password },
      { headers: { "X-CSRFToken": getCsrfToken() } }
    );
    return response.data;
  } catch (error) {
    return { success: false, error: handleError(error, "Failed to confirm password reset.") };
  }
};

/**
 * Change password for authenticated user
 * POST /account/change-password/
 * @param {Object} data - Password change data
 * @param {string} data.old_password - Current password
 * @param {string} data.new_password - New password
 * @param {string} data.confirm_password - Confirm new password
 */
export const changePassword = async (data) => {
  try {
    // Initialize CSRF token if needed (gracefully handle if endpoint doesn't exist)
    if (!getCsrfToken()) {
      try {
        await initCsrf();
      } catch (csrfError) {
        console.warn("CSRF token initialization failed, continuing without it:", csrfError.message);
      }
    }
    
    const headers = {};
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers["X-CSRFToken"] = csrfToken;
    }
    
    const response = await apiClient.post("/account/change-password/", {
      old_password: data.old_password,
      new_password: data.new_password,
      confirm_password: data.confirm_password,
    }, { headers });
    
    return { success: true, data: response.data };
  } catch (error) {
    const errorMessage = error.response?.data?.detail || 
                        error.response?.data?.error || 
                        error.response?.data?.message ||
                        error.message || 
                        "Failed to change password.";
    return { success: false, error: errorMessage };
  }
};

export const trainerClient = axios.create({
  baseURL: "https://lms.steel.study/trainer",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

trainerClient.interceptors.request.use((config) => {
  const t = localStorage.getItem("authToken");
  if (t) config.headers.Authorization = `Token ${t}`;
  return config;
});

export async function getAssessmentReports({ quizId, audience, refresh = true, autocreate = true }) {
  const params = {
    quiz_id: quizId,
    audience,
    refresh: refresh ? 1 : 0,
    autocreate: autocreate ? 1 : 0,
  };
  const res = await trainerClient.get("/assessment-reports/", { params });
  return res.data;
}

export async function getPeopleBrief(usernames = []) {
  if (!usernames.length) return {};
  const params = { usernames: usernames.join(",") };

  // Try common paths; returns {} on failure so UI falls back nicely.
  const tryPaths = ["/people-brief/", "/users/brief/"];
  for (const path of tryPaths) {
    try {
      // Use trainerClient if it’s under /trainer, otherwise apiClient if it’s global.
      const client = path.startsWith("/people") ? (typeof trainerClient !== "undefined" ? trainerClient : apiClient) : apiClient;
      const res = await client.get(path, { params });
      const rows = Array.isArray(res.data?.results) ? res.data.results : res.data;
      const map = {};
      (rows || []).forEach((p) => {
        if (p?.username) map[p.username.toLowerCase()] = p;
      });
      if (Object.keys(map).length) return map;
    } catch (_) {}
  }
  return {};
}

export const markLessonCompleted = async (lessonSlug) => {
  try {
    const role = localStorage.getItem("role") || "";
    const baseUrl = role.toLowerCase() === "trainee" ? "/trainee" : "/employee";
    const endpoint = `${baseUrl}/lessons/${encodeURIComponent(lessonSlug)}/complete/`;
    const res = await apiClient.post(endpoint, {});
    return ok(res.data);
  } catch (error) {
    return fail(error, "Failed to mark lesson as completed.");
  }
};

// Helper to get CSRF token (if using Django CSRF protection)
export const getCsrfToken = () => {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrftoken="))
    ?.split("=")[1] || "";
};

// --- BULK USERS: Download template (GET -> blob)
export const downloadStudentsTemplate = async () => {
  try {
    const res = await apiClient.get(`/account/template/`, {
      responseType: "blob",
    });

    // Try to infer filename from Content-Disposition
    const cd = res.headers?.["content-disposition"] || "";
    const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(cd);
    const filename = match?.[1] || "students_template.xlsx";

    // Trigger browser download
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error("downloadStudentsTemplate error:", error);
    return { success: false, error };
  }
};

apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"]; // <= critical
  }
  return config;
});

// --- BULK USERS: Upload Excel (POST multipart/form-data)
export const uploadStudentsExcel = async (file) => {
  try {
    const form = new FormData();
    form.append("excel_file", file); // <-- or "excel" if your view uses that

    const res = await apiClient.post(`/account/upload/`, form, {
      // ensure JSON header is NOT sent
      headers: { "Content-Type": undefined },
      transformRequest: (d) => d, // no JSON stringify
    });
    return { success: true, data: res.data };
  } catch (error) {
    return { success: false, error: error?.response?.data || error };
  }
};