import React from "react";
import "./AnimatedBackground.css";

const AnimatedBackground = () => {
  return (
    <div className="background-container">
      <div className="gradient-circle circle1"></div>
      <div className="gradient-circle circle2"></div>
      <div className="gradient-circle circle3"></div>
      <div className="gradient-circle circle4"></div>
      {[...Array(8)].map((_, i) => {
        const size = Math.random() * 30 + 10;
        return (
          <div
            key={i}
            className="floating-element"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              backgroundColor: `hsl(${Math.random() * 360}, 70%, 70%)`,
              animationDuration: `${Math.random() * 5 + 3}s`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          ></div>
        );
      })}
    </div>
  );
};

export default AnimatedBackground;
