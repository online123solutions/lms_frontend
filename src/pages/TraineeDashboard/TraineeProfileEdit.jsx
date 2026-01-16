import { useState, useEffect } from "react";
import { Form, Button, Modal, Alert, Spinner } from "react-bootstrap";
import { fetchTraineeProfile, updateTraineeProfile, mediaUrl } from "../../api/traineeAPIservice";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../utils/css/sidebar.css";

// Helper function to sanitize HTML error messages
const sanitizeError = (errorText) => {
  if (typeof errorText !== "string") {
    return errorText?.detail || errorText?.error || errorText?.message || "An error occurred";
  }
  
  // Check if it's HTML
  if (errorText.includes("<!doctype") || errorText.includes("<html") || errorText.includes("<body")) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(errorText, "text/html");
      const textContent = doc.body?.textContent || doc.documentElement?.textContent;
      if (textContent && textContent.trim()) {
        return textContent.trim();
      }
    } catch (e) {
      console.error("Error parsing HTML error:", e);
    }
    return "Server returned an error page. Please check your connection and try again.";
  }
  
  return errorText;
};

const TraineeProfileEdit = ({ username, dashboardData, onCancel, onUpdate }) => {
  // Check authentication before loading
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (isAuthenticated !== "true") {
      console.warn("Not authenticated - profile component should not be accessible");
      // Don't redirect here - let the parent dashboard handle it
      return;
    }
  }, []);
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    designation: "",
    profile_picture: null,
  });
  const [previewImage, setPreviewImage] = useState("");

  // Load profile data - use dashboard data first, then try API
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError("");
      
      // First, try to use dashboard data if available (faster, no API call needed)
      if (dashboardData?.profile) {
        const profileData = dashboardData.profile;
        const profileObj = {
          name: profileData.name || "",
          department: profileData.department || "",
          designation: profileData.designation || "",
          employee_id: profileData.employee_id || "",
          profile_picture: profileData.profile_picture || profileData.profile_pic || "",
        };
        setProfile(profileObj);
        setFormData({
          name: profileObj.name,
          department: profileObj.department,
          designation: profileObj.designation,
          profile_picture: null,
        });
        // Set preview image if profile picture exists
        if (profileObj.profile_picture) {
          setPreviewImage(mediaUrl(profileObj.profile_picture));
        }
        setLoading(false);
        return;
      }
      
      // If no dashboard data, try API call
      try {
        console.log("Loading trainee profile from API...");
        const result = await fetchTraineeProfile();
        console.log("Profile fetch result:", result);
        if (result.success) {
          const data = result.data;
          setProfile(data);
          setFormData({
            name: data.name || "",
            department: data.department || "",
            designation: data.designation || "",
            profile_picture: null,
          });
          // Set preview image if profile picture exists
          if (data.profile_picture) {
            setPreviewImage(mediaUrl(data.profile_picture));
          }
        } else {
          console.error("Profile fetch failed:", result.error);
          // Handle different error formats
          let errorMsg = "Failed to load profile";
          if (typeof result.error === "string") {
            errorMsg = result.error;
          } else if (result.error?.detail) {
            errorMsg = result.error.detail;
          } else if (result.error?.error) {
            errorMsg = result.error.error;
          } else if (result.error?.message) {
            errorMsg = result.error.message;
          } else if (Array.isArray(result.error)) {
            errorMsg = result.error.join(", ");
          }
          
          // If it's a 404, show the full URL for debugging
          if (result.error?.status === 404 && result.error?.fullURL) {
            errorMsg = `Profile endpoint not found (404). URL: ${result.error.fullURL}. Please verify the endpoint exists on the server.`;
          }
          
          // Sanitize HTML errors
          setError(sanitizeError(errorMsg));
          // If it's an authentication error, show a more helpful message
          if (result.error?.status === 401 || result.error?.status === 403) {
            setError("Authentication failed. Please try logging in again.");
          }
        }
      } catch (err) {
        console.error("Profile load error:", err);
        let errorMsg = "An error occurred while loading profile";
        
        // Check if response data is HTML
        const responseData = err?.response?.data;
        if (typeof responseData === 'string' && (responseData.includes('<!doctype html>') || responseData.includes('<html'))) {
          errorMsg = "Server returned an error page. Please check the endpoint URL or contact support.";
        } else if (responseData?.detail) {
          errorMsg = responseData.detail;
        } else if (responseData?.error) {
          errorMsg = responseData.error;
        } else if (err?.message) {
          errorMsg = err.message;
        }
        
        // Sanitize HTML errors
        setError(sanitizeError(errorMsg));
        // Don't let errors cause redirect - just show error message
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [dashboardData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size should be less than 5MB");
        return;
      }
      setFormData((prev) => ({
        ...prev,
        profile_picture: file,
      }));
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const result = await updateTraineeProfile(formData);
      if (result.success) {
        setSuccess("Profile updated successfully!");
        setProfile(result.data);
        // Update preview if new image was uploaded
        if (result.data.profile_picture) {
          setPreviewImage(mediaUrl(result.data.profile_picture));
        }
        // Clear file input
        setFormData((prev) => ({
          ...prev,
          profile_picture: null,
        }));
        // Notify parent component if callback provided
        if (onUpdate) {
          onUpdate(result.data);
        }
        // Reload dashboard data after 1.5 seconds to show updated profile
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        // Handle different error formats
        let errorMsg = "Failed to update profile";
        if (typeof result.error === "string") {
          errorMsg = result.error;
        } else if (result.error?.detail) {
          errorMsg = result.error.detail;
        } else if (result.error?.error) {
          errorMsg = result.error.error;
        } else if (result.error?.message) {
          errorMsg = result.error.message;
        } else if (Array.isArray(result.error)) {
          errorMsg = result.error.join(", ");
        } else if (result.error && typeof result.error === "object") {
          // If it's an object, try to extract a meaningful message
          errorMsg = result.error.detail || result.error.error || result.error.message || JSON.stringify(result.error);
        }
        setError(errorMsg);
      }
    } catch (err) {
      console.error("Profile update error:", err);
      const errorMsg = err?.response?.data?.detail || err?.response?.data?.error || err?.message || "An error occurred while updating profile";
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      profile_picture: null,
    }));
    // Reset to original image or empty
    if (profile?.profile_picture) {
      setPreviewImage(mediaUrl(profile.profile_picture));
    } else {
      setPreviewImage("");
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading profile...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">
            <i className="bi bi-person-circle me-2"></i>
            Edit Profile
          </h4>
        </div>
        <div className="card-body">
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError("")}>
              {sanitizeError(error)}
            </Alert>
          )}
          {success && (
            <Alert variant="success" dismissible onClose={() => setSuccess("")}>
              {success}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            {/* Profile Picture */}
            <div className="mb-4 text-center">
              <div className="mb-3">
                {previewImage ? (
                  <div className="position-relative d-inline-block">
                    <img
                      src={previewImage}
                      alt="Profile"
                      style={{
                        width: "150px",
                        height: "150px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "4px solid #dee2e6",
                      }}
                    />
                    {formData.profile_picture && (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger position-absolute top-0 end-0"
                        onClick={handleRemoveImage}
                        style={{ borderRadius: "50%" }}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      width: "150px",
                      height: "150px",
                      borderRadius: "50%",
                      backgroundColor: "#6366f1",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "3rem",
                      fontWeight: "bold",
                      margin: "0 auto",
                    }}
                  >
                    {formData.name ? formData.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
              </div>
              <Form.Group>
                <Form.Label>
                  <i className="bi bi-camera me-2"></i>
                  Profile Picture
                </Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="mb-2"
                />
                <Form.Text className="text-muted">
                  Upload an image (JPG, PNG, GIF). Max size: 5MB
                </Form.Text>
              </Form.Group>
            </div>

            {/* Name */}
            <Form.Group className="mb-3">
              <Form.Label>
                <i className="bi bi-person me-2"></i>
                Name
              </Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your name"
                maxLength={100}
              />
            </Form.Group>

            {/* Department */}
            <Form.Group className="mb-3">
              <Form.Label>
                <i className="bi bi-building me-2"></i>
                Department <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                placeholder="Enter department"
                required
                maxLength={100}
              />
            </Form.Group>

            {/* Designation */}
            <Form.Group className="mb-3">
              <Form.Label>
                <i className="bi bi-briefcase me-2"></i>
                Designation <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleInputChange}
                placeholder="Enter designation"
                required
                maxLength={100}
              />
            </Form.Group>

            {/* Employee ID (read-only) */}
            {profile?.employee_id && (
              <Form.Group className="mb-3">
                <Form.Label>
                  <i className="bi bi-id-card me-2"></i>
                  Employee ID
                </Form.Label>
                <Form.Control
                  type="text"
                  value={profile.employee_id}
                  disabled
                  className="bg-light"
                />
                <Form.Text className="text-muted">Employee ID cannot be changed</Form.Text>
              </Form.Group>
            )}

            {/* Action Buttons */}
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  if (onCancel) {
                    onCancel();
                  } else {
                    // Fallback: go back to dashboard
                    window.location.reload();
                  }
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default TraineeProfileEdit;
