import React from "react";

const QuizCard = ({ quiz, onClick, noOfQuestions, timeLimit }) => {
  return (
    <div
      onClick={onClick}
      style={{
        width: "100%",
        maxWidth: "320px",
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
        overflow: "hidden",
        fontFamily: "Arial, sans-serif",
        padding: "20px",
        textAlign: "center",
        cursor: "pointer",
        transition: "transform 0.2s ease-in-out",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#8b5cf6",
          color: "white",
          fontSize: "18px",
          fontWeight: "bold",
          padding: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          justifyContent: "center",
        }}
      >
        📖 {quiz.topic || "General Knowledge"} {/* Show topic */}
      </div>

      {/* Description */}
      <p style={{ color: "#333", fontSize: "14px", margin: "16px 0" }}>
        Test your skills in
        <br />
        <strong>{quiz.topic || "this topic"}</strong>
      </p>

      {/* Tags */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "10px" }}>
        <span
          style={{
            backgroundColor: "#f3f4f6",
            padding: "6px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          {noOfQuestions} Questions
        </span>
        <span
          style={{
            backgroundColor: "#f3f4f6",
            padding: "6px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          Medium {/* Keep "Medium" */}
        </span>
      </div>

      {/* Quiz Time */}
      <div style={{ color: "#8b5cf6", fontSize: "14px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", marginBottom: "12px" }}>
        ⏳ Quiz Time: {timeLimit} minutes
      </div>

      {/* Button */}
      <button
        style={{
          backgroundColor: "#8b5cf6",
          color: "white",
          border: "none",
          padding: "12px",
          width: "100%",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        Start Quiz
      </button>
    </div>
  );
};

export default QuizCard;
