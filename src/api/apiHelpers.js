// utils/apiHelpers.js
export const ok = (data) => ({ success: true, data });
export const fail = (error, fallbackMsg = "Request failed.") => {
  // Standardized logging across app
  console.error(fallbackMsg, {
    status: error?.response?.status,
    url: error?.config?.baseURL + error?.config?.url,
    params: error?.config?.params,
    body: error?.config?.data,
    data: error?.response?.data,
  });
  return { success: false, error: fallbackMsg, raw: error?.response?.data };
};
