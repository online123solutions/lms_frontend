// import React from "react";
import { createRoot } from "react-dom/client";
// import { BrowserRouter as Router } from "react-router-dom"; 
import { HashRouter as Router } from "react-router-dom";
import App from "./App"; // Import your main App component

// Get the root element from the DOM
const container = document.getElementById("root");
const root = createRoot(container);

// Render the app within the Router
root.render(
  <Router>
    <App />
  </Router>
);
