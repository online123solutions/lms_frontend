import PropTypes from "prop-types";

const formatDate = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

export default function UpdatesCard({ data }) {
  const updates = data?.admin_updates || [
    { type: "Module", message: "New module 'Advanced Techniques' is now available.", endDate: "2025-10-01" },
    { type: "Planner", message: "Updated weekly planner for September is live.", endDate: "2025-09-30" },
    { type: "Assessment", message: "New assessment 'Mid-Term Review' is live.", endDate: "2025-09-15" },
  ];

  return (
    <div className="updates-card" style={{
      background:"#fff",
      padding:"16px 18px",
      borderRadius:"14px",
      boxShadow:"0 6px 18px rgba(0,0,0,.06)",
      marginTop:"0",
      maxHeight:"420px",
      overflowY:"auto"
    }}>
      <h3 style={{ color:"#333", marginBottom:"12px" }}>Latest Updates</h3>
      <ul>
        {updates.map((update, index) => (
          <li key={index} style={{ color:"black" }}>
            <strong style={{ fontSize:"14px"}}>{update.type}:</strong> {update.message} <br />
            <span style={{ fontSize:"14px", color:"#6b7280" }}>
              Ends on: {formatDate(update.endDate)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

UpdatesCard.propTypes = {
  data: PropTypes.shape({
    admin_updates: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string,
        message: PropTypes.string,
        endDate: PropTypes.string,
      })
    ),
  }),
};
