import React from 'react';
import styled from 'styled-components';

const HamButton = ({ onClick }) => {
  return (
    <StyledWrapper>
      <div className="background">
        <button className="menu__icon" onClick={onClick}>
          <span />
          <span />
          <span />
        </button>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  /* <reset-style> ============================ */
  button {
    border: none;
    background: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    font-family: inherit;
  }
  /* ============================ */
  /* <style for bg> ======== */
  .background {
    border-radius: 16px;
    border: 1px solid #1a1a1a;
    background: rgba(74, 74, 74, 0.39);
    mix-blend-mode: luminosity;
    box-shadow: 0px 0px 0px 1px rgba(0, 0, 0, 0.20);
    backdrop-filter: blur(15px);
    width: 32.5px; /* Half the original width */
    height: 32.5px; /* Half the original height */
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* <style for menu__icon> ======== */
  .menu__icon {
    width: 16px; /* Half the original width */
    height: 16px; /* Half the original height */
    padding: 2px; /* Half the original padding */
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: transform .4s;
  }

  .menu__icon span {
    width: 100%;
    height: 0.125rem; /* Half the original height */
    border-radius: 0.125rem;
    background-color: #ffffff; /* Change color to white */
    box-shadow: 0 .5px 2px 0 hsla(0, 0%, 0%, .2);
    transition: width .4s, transform .4s, background-color .4s;
  }

  .menu__icon :nth-child(1) {
    width: 75%;
  }

  .menu__icon :nth-child(2) {
    width: 50%;
  }

  .menu__icon:hover {
    transform: rotate(-90deg);
  }

  .menu__icon:hover span {
    width: .25rem;
    transform: translateX(10px);
    background-color: rgb(255, 59, 48);
  }
`;

export default HamButton;
