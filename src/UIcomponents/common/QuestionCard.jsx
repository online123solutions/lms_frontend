import React from "react";
import { API_BASE } from "../../api/config";

const mediaUrl = (url) => (!url || /^https?:\/\//.test(url) ? url : `${API_BASE}${url}`);

const QuestionCard = ({
  question,
  questionImage,
  options,
  optionImages = [],
  questionNumber,
  timeLeft,
  onOptionSelect,
  selectedOption,
}) => {
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
          backgroundColor: "#393939",
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
      {question && (
        <h3 style={{ color: "#111", margin: "24px 0", fontSize: "18px" }}>{question}</h3>
      )}
      {questionImage && (
        <div style={{ margin: question ? "0 0 24px" : "24px 0", textAlign: "center" }}>
          <img
            src={mediaUrl(questionImage)}
            alt={`Question ${questionNumber}`}
            style={{
              maxWidth: "100%",
              maxHeight: "420px",
              objectFit: "contain",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
            }}
          />
        </div>
      )}

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
              backgroundColor: selectedOption === index ? "#393939" : "#e9d5ff",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "14px",
              fontWeight: "bold",
              color: selectedOption === index ? "white" : "#393939",
            }}
          >
            {String.fromCharCode(65 + index)}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
            {option && <span style={{ fontSize: "15px", color: "#333" }}>{option}</span>}
            {optionImages[index] && (
              <img
                src={mediaUrl(optionImages[index])}
                alt={`Option ${String.fromCharCode(65 + index)}`}
                style={{ maxWidth: "100%", maxHeight: "180px", objectFit: "contain", alignSelf: "flex-start" }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuestionCard;
