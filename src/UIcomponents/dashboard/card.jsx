import PropTypes from "prop-types";
import "../../utils/css/cards.css";

const Card = ({ title, image }) => {
  return (
    <div className="card">
      <div className="top-section">
        
        
        {image && (
          <img
            src={image}
            alt="Overlay Logo"
            className="skyblue-overlay-logo"
          />
        )}
      </div>
      <div className="bottom-section">
        {/* <button>{title}</button> */}
        <button className="button text-white hover:bg-primary-dark">

          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 4.5l7.5 7.5-7.5 7.5M4.5 4.5l7.5 7.5-7.5 7.5"
            ></path>
          </svg>

          <div className="text">{title}</div>
        </button>
      </div>
    </div>
  );
};

Card.propTypes = {
  title: PropTypes.string.isRequired,
  image: PropTypes.string,
  description: PropTypes.string,
};

export default Card;
