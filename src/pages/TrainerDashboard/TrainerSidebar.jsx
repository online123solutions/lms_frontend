const TrainerSidebar = () => (
  <div style={{
    width: "240px",
    background: "#4c1d95",
    color: "#fff",
    padding: "20px",
    zIndex: 3,
    position: "relative"
  }}>
    <h3>Trainer Panel</h3>
    <ul style={{ listStyle: "none", padding: 0 }}>
      <li><a href="#" style={{ color: "#fff" }}>Dashboard</a></li>
      <li><a href="#">Trainees</a></li>
      <li><a href="#">Subjects</a></li>
      <li><a href="#">Reports</a></li>
    </ul>
  </div>
);
export default TrainerSidebar;
