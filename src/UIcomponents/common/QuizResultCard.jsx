import React from "react";

export default function QuizResultCard({ correct, total, onBackToQuizzes, onShowReport }) {
  return (
    <div style={styles.card}>
      <div style={styles.iconContainer}>
        <div style={styles.trophyIcon}>🏆</div>
        <div style={styles.star}>⭐</div>
      </div>
      <h2 style={styles.heading}>Great Job!</h2>
      <div style={styles.scoreContainer}>
        <span style={styles.scoreText}>
          Your score: <span style={styles.scoreValue}>{correct}/{total}</span>
        </span>
      </div>
      <div style={styles.buttonContainer}>
        <button style={styles.button} onClick={onBackToQuizzes}>
          Back to Quizzes
        </button>
        <button style={styles.reportButton} onClick={onShowReport}>
          Show Report
        </button>
      </div>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: "white",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
    borderRadius: "16px",
    padding: "24px",
    textAlign: "center",
    width: "100%",
    height: "100vh", // Cover the whole page
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  iconContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "16px",
    position: "relative",
  },
  trophyIcon: {
    backgroundColor: "#EDE7F6",
    padding: "16px",
    borderRadius: "50%",
    fontSize: "32px",
    color: "#0ba3e6",
  },
  star: {
    position: "absolute",
    top: "0px",
    right: "40px",
    backgroundColor: "#FFD700",
    color: "white",
    fontSize: "14px",
    fontWeight: "bold",
    borderRadius: "50%",
    padding: "4px 8px",
  },
  heading: {
    fontSize: "28px", // Increased font size
    fontWeight: "bold",
    color: "#333",
  },
  scoreContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "16px",
  },
  scoreText: {
    backgroundColor: "#EDE7F6",
    padding: "12px 24px",
    borderRadius: "20px",
    color: "#555",
    fontSize: "20px", // Increased font size
  },
  scoreValue: {
    fontWeight: "bold",
    color: "#7E57C2",
  },
  buttonContainer: {
    marginTop: "24px",
    display: "flex",
    gap: "16px",
  },
  button: {
    backgroundColor: "#7E57C2",
    color: "white",
    padding: "12px 24px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
  },
  reportButton: {
    backgroundColor: "#FF9800",
    color: "white",
    padding: "12px 24px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
  },
};
