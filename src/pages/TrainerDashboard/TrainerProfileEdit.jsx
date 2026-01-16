import { useState, useEffect } from "react";
import { Form, Button, Alert, Spinner } from "react-bootstrap";
import { fetchTrainerProfile, updateTrainerProfile, mediaUrl } from "../../api/trainerAPIservice";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../utils/css/sidebar.css";

const TrainerProfileEdit = ({ username, dashboardData, onCancel, onUpdate }) => {
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
        console.log("Loading trainer profile from API...");
        const result = await fetchTrainerProfile();
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
          
          setError(errorMsg);
          // If it's an authentication error, show a more helpful message
          if (result.error?.status === 401 || result.error?.status === 403) {
            setError("Authentication failed. Please try logging in again.");
          }
        }
      } catch (err) {
        console.error("Unexpected error loading profile:", err);
        const errorMsg = err?.response?.data?.detail || err?.response?.data?.error || err?.message || "An error occurred while loading profile";
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    
    if (username) {
      loadProfile();
    } else {
      setLoading(false);
      setError("Username not available");
    }
  }, [username, dashboardData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(""); // Clear error on change
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
      if (!validTypes.includes(file.type)) {
        setError("Please upload a valid image file (JPG, PNG, GIF)");
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
      const result = await updateTrainerProfile(formData);
      if (result.success) {
        setSuccess("Profile updated successfully!");
        // Update profile state with new data
        const updatedProfile = result.data;
        setProfile(updatedProfile);
        // Update form data with new values
        setFormData((prev) => ({
          name: updatedProfile.name || prev.name,
          department: updatedProfile.department || prev.department,
          designation: updatedProfile.designation || prev.designation,
          profile_picture: null, // Clear file input
        }));
        // Update preview if new image was uploaded
        if (updatedProfile.profile_picture) {
          setPreviewImage(mediaUrl(updatedProfile.profile_picture));
        }
        // Notify parent component if callback provided
        if (onUpdate) {
          onUpdate(updatedProfile);
        }
        // Don't reload or redirect - stay on profile page to show success message
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
        
        // Log the full error for debugging
        console.error("Profile update error details:", {
          error: result.error,
          errorMsg: errorMsg,
        });
        
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
    setPreviewImage("");
    setFormData((prev) => ({
      ...prev,
      profile_picture: null,
    }));
    // Also clear the file input
    const fileInput = document.getElementById("profile-picture-input");
    if (fileInput) {
      fileInput.value = "";
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
    <div className="container-fluid p-4">
      <div className="card">
        <div className="card-header bg-primary text-white d-flex align-items-center">
          <i className="bi bi-person-circle me-2" style={{ fontSize: "1.5rem" }}></i>
          <h4 className="mb-0">Edit Profile</h4>
        </div>
        <div className="card-body">
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError("")}>
              {typeof error === "string" ? error : error?.detail || error?.error || error?.message || "An error occurred"}
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
                      alt="Profile Preview"
                      style={{
                        width: "150px",
                        height: "150px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "3px solid #dee2e6",
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-danger position-absolute"
                      style={{ top: "0", right: "0" }}
                      onClick={handleRemoveImage}
                    >
                      <i className="bi bi-x"></i>
                    </button>
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
                    {username ? username[0].toUpperCase() : "T"}
                  </div>
                )}
              </div>
              <div>
                <Form.Label className="fw-bold">Profile Picture</Form.Label>
                <Form.Control
                  id="profile-picture-input"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  onChange={handleFileChange}
                  className="mb-2"
                />
                <small className="text-muted">Upload an image (JPG, PNG, GIF). Max size: 5MB</small>
              </div>
            </div>

            {/* Name */}
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
              />
            </Form.Group>

            {/* Department */}
            <Form.Group className="mb-3">
              <Form.Label>
                Department <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="Enter department"
                required
              />
            </Form.Group>

            {/* Designation */}
            <Form.Group className="mb-3">
              <Form.Label>
                Designation <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                placeholder="Enter designation"
                required
              />
            </Form.Group>

            {/* Employee ID (read-only if exists) */}
            {profile?.employee_id && (
              <Form.Group className="mb-3">
                <Form.Label>Employee ID</Form.Label>
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
            <div className="d-flex justify-content-end mt-4">
              <Button variant="secondary" onClick={onCancel} className="me-2">
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default TrainerProfileEdit;
