import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../../api/apiservice";
import "./signup.css";
import ParticleBackground from "../ParticleBackground"; // Assuming this is a custom or library component
import { AuthContext } from "../../App";

import logo from "../../assets/logo3.png"; // Adjust the path based on your structure
import logo1 from "../../assets/logo3.png"; // Adjust the path based on your structure

const Signup = () => {
  const { setIsAuthenticated, setRole, setIsSuperUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);
  const [formData, setFormData] = useState({
    user: {
      role: "",
      username: "",
      email: "",
      password: "",
    },
    name: "",
    employee_id: "",
    department: "",
    designation: "",
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleToggle = () => {
    setIsLoginView(!isLoginView);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["username", "email", "password", "role"].includes(name)) {
      setFormData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          [name]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { username, user } = formData;
    const result = await login(formData.user.username, formData.user.password);
    setLoading(false);

    if (result.success) {
      setIsAuthenticated(true);
      setRole(result.data.role);
      setIsSuperUser(result.data.is_superuser);

      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("role", result.data.role);
      localStorage.setItem("isSuperUser", result.data.is_superuser ? "true" : "false");
      localStorage.setItem("activeContent", "dashboard");
      localStorage.setItem("authToken", result.data.token);
      localStorage.setItem("username", result.data.username);

      setError(null);

      if (result.data.dashboard_url) {
        navigate(result.data.dashboard_url);
        console.log("Navigating to:", result.data.dashboard_url);
      } else {
        navigate("/dashboard");
      }
    } else {
      setError(result.error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const result = await register({
      user: formData.user,
      name: formData.name,
      employee_id: formData.employee_id,
      department: formData.department,
      designation: formData.designation,
    });

    if (result.success) {
      alert("Registration successful. Please log in.");
      setIsLoginView(true);
      setError(null);
    } else {
      setError(result.error || "Registration failed.");
    }
  };

  return (
    <>
      {/* Debug log for ParticleBackground */}
      {typeof ParticleBackground === "function" ? (
        <ParticleBackground
          particleColor="#0ba3e6"
          particleSpeed={0.5}
          style={{ position: "absolute", zIndex: 0, width: "100%", height: "100%" }}
        />
      ) : (
        <div style={{ position: "absolute", zIndex: 0, width: "100%", height: "100%" }}>
          <p>ParticleBackground not loaded. Check dependencies.</p>
        </div>
      )}
      <div className="signup-wrapper">
        <div className="signup-container upgraded-card">
          <div className="form-panel">
            <div className="logo-container">
              {logo ? (
                <img src={logo1} alt="Company Logo" className="signup-logo" onError={(e) => console.log("Image load error:", e)} />
              ) : (
                <img src="/assets/logo.jpg" alt="Company Logo" className="signup-logo" onError={(e) => console.log("Image load error:", e)} />
              )}
            </div>
            <div className="form-wrapper">
              <h2 className="form-title">{isLoginView ? "Sign In" : "Register"}</h2>
              <form onSubmit={isLoginView ? handleLogin : handleRegister}>
                {!isLoginView && (
                  <>
                    <select
                      name="role"
                      value={formData.user.role}
                      onChange={handleChange}
                      required
                      className="input-field"
                    >
                      <option value="">Select Role</option>
                      <option value="trainee">Trainee</option>
                      <option value="employee">Employee</option>
                      <option value="trainer">Trainer</option>
                      <option value="admin">Admin</option>
                    </select>

                    <input
                      type="text"
                      name="name"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="input-field"
                    />

                    <input
                      type="text"
                      name="employee_id"
                      placeholder="Employee ID"
                      value={formData.employee_id}
                      onChange={handleChange}
                      required
                      className="input-field"
                    />

                    <input
                      type="text"
                      name="department"
                      placeholder="Department"
                      value={formData.department}
                      onChange={handleChange}
                      required
                      className="input-field"
                    />

                    <input
                      type="text"
                      name="designation"
                      placeholder="Designation"
                      value={formData.designation}
                      onChange={handleChange}
                      required
                      className="input-field"
                    />

                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      value={formData.user.email}
                      onChange={handleChange}
                      required
                      className="input-field"
                    />
                  </>
                )}

                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={formData.user.username}
                  onChange={handleChange}
                  required
                  className="input-field"
                />

                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.user.password}
                  onChange={handleChange}
                  required
                  className="input-field"
                />

                <button type="submit" className="submit-button">
                  {loading ? "Processing..." : isLoginView ? "Sign In" : "Register"}
                </button>
              </form>

              {error && <p className="error-text">{error}</p>}

              <p onClick={handleToggle} className="toggle-text">
                {isLoginView
                  ? "Don't have an account? Register"
                  : "Already have an account? Login"}
              </p>
            </div>
          </div>

          <div className="wave-divider"></div>

          <div className="info-panel">
            <div className="logo-container">
              {logo ? (
                <img src={logo} alt="Company Logo" className="signup-logo" onError={(e) => console.log("Image load error:", e)} />
              ) : (
                <img src="/assets/logo.jpg" alt="Company Logo" className="signup-logo" onError={(e) => console.log("Image load error:", e)} />
              )}
            </div>
            <h2 className="info-title">{isLoginView ? "Hello, Friend!" : "Welcome Back!"}</h2>
            <p className="info-text">
              {isLoginView
                ? "Register with your personal details to use all site features"
                : "Sign in with your credentials to continue"}
            </p>
            <button onClick={handleToggle} className="toggle-button">
              {isLoginView ? "Register" : "Sign In"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;