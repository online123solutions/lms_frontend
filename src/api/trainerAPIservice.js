import axios from "axios";
import { ok, fail } from "./apiHelpers";

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