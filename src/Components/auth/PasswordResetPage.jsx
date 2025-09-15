import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button, Form, Alert, Spinner } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "./PasswordResetPage.css"; // Custom CSS file (see below)
import { requestPasswordReset,confirmPasswordReset } from "../../api/apiservice";

const PasswordResetPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isConfirm, setIsConfirm] = useState(false);
  const uidb64 = searchParams.get("uidb64");
  const token = searchParams.get("token");

  useEffect(() => {
    if (uidb64 && token) {
      setIsConfirm(true);
    }
  }, [uidb64, token]);

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const result = await requestPasswordReset({ email });
    setLoading(false);
    if (result.success) {
      setMessage("Password reset email sent successfully. Check your inbox!");
    } else {
      setMessage(`Error: ${result.error || "Failed to send reset email."}`);
    }
  };

  const handleResetConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    if (newPassword !== confirmPassword) {
      setLoading(false);
      setMessage("Passwords do not match.");
      return;
    }
    const result = await confirmPasswordReset({ uidb64, token, new_password: newPassword });
    setLoading(false);
    if (result.success) {
      setMessage("Password reset successfully. Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } else {
      setMessage(`Error: ${result.error || "Failed to reset password."}`);
    }
  };

  return (
    <div className="password-reset-page">
      <div className="reset-card">
        <h2 className="text-center mb-4 animate__animated animate__fadeIn">
          {isConfirm ? "Reset Your Password" : "Request Password Reset"}
        </h2>
        {message && (
          <Alert
            variant={message.includes("Error") ? "danger" : "success"}
            className="animate__animated animate__fadeIn"
          >
            {message}
          </Alert>
        )}
        <Form onSubmit={isConfirm ? handleResetConfirm : handleResetRequest}>
          {!isConfirm ? (
            <Form.Group className="mb-3" controlId="email">
              <Form.Label>Email Address</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </Form.Group>
          ) : (
            <>
              <Form.Group className="mb-3" controlId="newPassword">
                <Form.Label>New Password</Form.Label>
                <Form.Control
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="confirmPassword">
                <Form.Label>Confirm Password</Form.Label>
                <Form.Control
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </Form.Group>
              <input type="hidden" name="uidb64" value={uidb64} />
              <input type="hidden" name="token" value={token} />
            </>
          )}
          <Button
            variant="primary"
            type="submit"
            className="w-100 mb-3 animate__animated animate__pulse"
            disabled={loading}
          >
            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : isConfirm ? (
              "Reset Password"
            ) : (
              "Send Reset Email"
            )}
          </Button>
          <p className="text-center">
            <a href="/login" className="text-decoration-none">
              Back to Login
            </a>
          </p>
        </Form>
      </div>
    </div>
  );
};

export default PasswordResetPage;