import React from "react";

const QuestionCard = ({ question, options, questionNumber, timeLeft, onOptionSelect, selectedOption }) => {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1040px",
        margin: "0 auto",
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
        overflow: "hidden",
        fontFamily: "'Poppins', sans-serif",
        padding: "24px",
        textAlign: "left",
        boxSizing: "border-box",
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
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span>Question {questionNumber}</span>
        <span style={{ fontSize: "14px", display: "flex", alignItems: "center", gap: "5px" }}>
          ⏳ {timeLeft}s
        </span>
      </div>

      {/* Question */}
      <h3 style={{ color: "#111", margin: "24px 0", fontSize: "18px" }}>{question}</h3>

      {/* Options */}
      {options.map((option, index) => (
        <div
          key={index}
          onClick={() => onOptionSelect(index)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            cursor: "pointer",
            marginBottom: "12px",
            transition: "background-color 0.3s",
            backgroundColor: selectedOption === index ? "#e9d5ff" : "white",
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              minWidth: "34px",
              borderRadius: "50%",
              backgroundColor: selectedOption === index ? "#7c3aed" : "#e9d5ff",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "14px",
              fontWeight: "bold",
              color: selectedOption === index ? "white" : "#7c3aed",
            }}
          >
            {String.fromCharCode(65 + index)}
          </div>
          <span style={{ fontSize: "15px", color: "#333", flex: 1 }}>{option}</span>
        </div>
      ))}
    </div>
  );
};

export default QuestionCard;
