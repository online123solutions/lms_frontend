import { createContext, useState, useEffect, useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PropTypes from "prop-types";
import Signup from "./Components/auth/signup";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap/dist/css/bootstrap.min.css";
import TeacherDashboard from "./pages/TrainerDashboard/TrainerDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard/EmployeeDashboard";
import TraineeDashboard from "./pages/TraineeDashboard/TraineeDashboard";
import AdminDashboard from "./pages/AdminDashboard/AdminDashboard";
import Learning from "./learning"; // Ensure this path matches your file structure
import PasswordResetPage from "./Components/auth/PasswordResetPage";
import DetailedTrainingReport from "./pages/TrainerDashboard/DetailedTrainingReport"; // Import the new component

// Create a context to manage authentication state
export const AuthContext = createContext();

function PrivateRoute({ children }) {
  const { isAuthenticated } = useContext(AuthContext);

  if (isAuthenticated === null) {
    return <div>Loading...</div>; // Prevent redirect before auth state is confirmed
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

function RoleBasedRoute() {
  const { role } = useContext(AuthContext); // Removed isSuperUser since it's not used here

  if (role === "trainer") return <Navigate to="/trainer-dashboard/:username" />;
  if (role === "trainee") return <Navigate to="/trainee-dashboard/:username" />;
  if (role === "employee") return <Navigate to="/employee-dashboard/:username" />;
  if (role === "admin") return <Navigate to="/admin-dashboard/:username" />;

  return <Navigate to="/login" />; // Default fallback if no role matches
}

function App() {
  // Load authentication state from localStorage immediately
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem("isAuthenticated") === "true"
  );
  const [isSuperUser, setIsSuperUser] = useState(
    () => localStorage.getItem("isSuperUser") === "true"
  );
  const [role, setRole] = useState(() => localStorage.getItem("role") || "");

  useEffect(() => {
    localStorage.setItem("isAuthenticated", isAuthenticated);
    localStorage.setItem("role", role);
    localStorage.setItem("isSuperUser", isSuperUser);
  }, [isAuthenticated, role, isSuperUser]);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, setIsAuthenticated, role, setRole, isSuperUser, setIsSuperUser }}
    >
      <Routes>
        <Route path="/" element={<Signup />} />
        <Route path="/login" element={<Signup />} />

        {/* School Dashboard Route */}
        <Route
          path="/employee-dashboard/:username"
          element={
            <PrivateRoute>
              <EmployeeDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/trainer-dashboard/:username"
          element={
            <PrivateRoute>
              <TeacherDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/trainee-dashboard/:username"
          element={
            <PrivateRoute>
              <TraineeDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin-dashboard/:username"
          element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          }
        />

        {/* Add route for Learning component */}
        <Route
          path="/learning/:subjectSlug"
          element={
            <PrivateRoute>
              <Learning />
            </PrivateRoute>
          }
        />
        <Route path="/reset-password" element={<PasswordResetPage />} />
        <Route path="/reset-password/:uidb64/:token" element={<PasswordResetPage />} />
        <Route path="/training-report/:userId" element={<DetailedTrainingReport />} />

        {/* Catch-all route to redirect unknown URLs */}
        <Route path="*" element={<Navigate to="/login" />} /> {/* Changed to /login for better UX */}
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;