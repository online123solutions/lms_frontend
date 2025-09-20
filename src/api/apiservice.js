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

export const trainerClient = axios.create({
  baseURL: "http://lms.steel.study/trainer",
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

export const requestPasswordReset = async (data) => {
  try {
    const response = await apiClient.post("/account/password-reset/", data, {
      headers: {
        "X-CSRFTOKEN": getCsrfToken(), // Ensure CSRF token is included
      },
      withCredentials: true, // Use withCredentials instead of credentials for Axios
    });
    return response.data; // Return the raw response data as per your backend's format
  } catch (error) {
    return { success: false, error: handleError(error, "Failed to request password reset.") };
  }
};

export const confirmPasswordReset = async (data) => {
  try {
    const response = await apiClient.post(
      `/account/password-reset-confirm/${data.uidb64}/${data.token}/`,
      { new_password: data.new_password },
      {
        headers: {
          "X-CSRFTOKEN": getCsrfToken(), // Ensure CSRF token is included
        },
        withCredentials: true, // Use withCredentials instead of credentials for Axios
      }
    );
    return response.data; // Return the raw response data as per your backend's format
  } catch (error) {
    return { success: false, error: handleError(error, "Failed to confirm password reset.") };
  }
};

// Helper to get CSRF token (if using Django CSRF protection)
const getCsrfToken = () => {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrftoken="))
    ?.split("=")[1] || "";
};