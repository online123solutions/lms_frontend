import styled from "styled-components";

const SocialCard = () => {
  return (
    <StyledWrapper>
      <div className="card">
        <div className="background"></div>
        <div className="logo">Follow Us</div>
        <a
          href="https://www.instagram.com/abl_education/?igshid=OGQ5ZDc2ODk2ZA%3D%3D"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="box box1">
            <span className="icon">
              <svg
                viewBox="0 0 30 30"
                xmlns="http://www.w3.org/2000/svg"
                className="svg"
              >
                <path d="M 9.9980469 3 C 6.1390469 3 3 6.1419531 3 10.001953 L 3 20.001953 C 3 23.860953 6.1419531 27 10.001953 27 L 20.001953 27 C 23.860953 27 27 23.858047 27 19.998047 L 27 9.9980469 C 27 6.1390469 23.858047 3 19.998047 3 L 9.9980469 3 z M 22 7 C 22.552 7 23 7.448 23 8 C 23 8.552 22.552 9 22 9 C 21.448 9 21 8.552 21 8 C 21 7.448 21.448 7 22 7 z M 15 9 C 18.309 9 21 11.691 21 15 C 21 18.309 18.309 21 15 21 C 11.691 21 9 18.309 9 15 C 9 11.691 11.691 9 15 9 z M 15 11 A 4 4 0 0 0 11 15 A 4 4 0 0 0 15 19 A 4 4 0 0 0 19 15 A 4 4 0 0 0 15 11 z" />
              </svg>
            </span>
          </div>
        </a>
        <a
          href="https://www.youtube.com/ableducation"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="box box2">
            <span className="icon">
              <svg
                viewBox="0 0 576 512"
                xmlns="http://www.w3.org/2000/svg"
                className="svg"
              >
                <path d="M549.655 124.083c-6.281-23.625-24.781-42.125-48.406-48.406C465.781 64 288 64 288 64s-177.781 0-213.25 11.677c-23.625 6.281-42.125 24.781-48.406 48.406C15.667 159.552 15.667 256 15.667 256s0 96.448 10.677 131.917c6.281 23.625 24.781 42.125 48.406 48.406C110.219 448 288 448 288 448s177.781 0 213.25-11.677c23.625-6.281 42.125-24.781 48.406-48.406C560.333 352.448 560.333 256 560.333 256s0-96.448-10.678-131.917zM232 336V176l142.222 80L232 336z" />
              </svg>
            </span>
          </div>
        </a>
        <a
          href="https://www.facebook.com/ABLeducation"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="box box3">
            <span className="icon">
              <svg
                viewBox="0 0 320 512"
                xmlns="http://www.w3.org/2000/svg"
                className="svg"
                style={{ transform: "scale(0.8)" }} // Make the Facebook icon smaller
              >
                <path d="M279.14 288l14.22-92.66h-88.91V134.33c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S253.59 0 217.91 0c-73.22 0-121.09 44.38-121.09 124.72v70.62H22.89V288h73.93v224h89.41V288z" />
              </svg>
            </span>
          </div>
        </a>
        <div className="box box4" />
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .card {
    position: relative;
    width: 200px;
    height: 200px;
    background: lightgrey;
    border-radius: 30px;
    overflow: hidden;
    box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px;
    transition: all 1s ease-in-out;
    border: 2px solid rgb(255, 255, 255);
  }

  .background {
    position: absolute;
    inset: 0;
    background-color: #4158d0;
    background-image: linear-gradient(
      43deg,
      #4158d0 0%,
      #c850c0 46%,
      #ffcc70 100%
    );
  }

  .logo {
    position: absolute;
    right: 50%;
    bottom: 50%;
    transform: translate(50%, 50%);
    transition: all 0.6s ease-in-out;
    font-size: 1em;
    font-weight: 600;
    color: #ffffff;
    letter-spacing: 2px;
  }

  .logo .logo-svg {
    fill: white;
    width: 30px;
    height: 30px;
  }

  .icon {
    display: inline-block;
    width: 20px;
    height: 20px;
  }

  .icon .svg {
    fill: rgba(255, 255, 255, 0.797);
    width: 100%;
    transition: all 0.5s ease-in-out;
  }

  .box {
    position: absolute;
    padding: 10px;
    text-align: right;
    background: rgba(255, 255, 255, 0.389);
    border-top: 2px solid rgb(255, 255, 255);
    border-right: 1px solid white;
    border-radius: 10% 13% 42% 0%/10% 12% 75% 0%;
    box-shadow: rgba(100, 100, 111, 0.364) -7px 7px 29px 0px;
    transform-origin: bottom left;
    transition: all 1s ease-in-out;
  }

  .box::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: 0;
    transition: all 0.5s ease-in-out;
  }

  .box:hover .svg {
    fill: white;
  }

  .box1 {
    width: 70%;
    height: 70%;
    bottom: -70%;
    left: -70%;
  }

  .box1::before {
    background: radial-gradient(
      circle at 30% 107%,
      #fdf497 0%,
      #fdf497 5%,
      #ff53d4 60%,
      #62c2fe 90%
    );
  }

  .box1:hover::before {
    opacity: 1;
  }

  .box1:hover .icon .svg {
    filter: drop-shadow(0 0 5px white);
  }

  .box2 {
    width: 50%;
    height: 50%;
    bottom: -50%;
    left: -50%;
    transition-delay: 0.2s;
  }

  .box2::before {
    background: radial-gradient(circle at 30% 107%, #ff0000 0%, #ff0000 90%);
  }

  .box2:hover::before {
    opacity: 1;
  }

  .box2:hover .icon .svg {
    filter: drop-shadow(0 0 5px white);
  }

  .box3 {
    width: 30%;
    height: 30%;
    bottom: -30%;
    left: -30%;
    transition-delay: 0.4s;
  }

  .box3::before {
    background: radial-gradient(circle at 30% 107%, #3b5998 0%, #3b5998 90%);
  }

  .box3:hover::before {
    opacity: 1;
  }

  .box3:hover .icon .svg {
    filter: drop-shadow(0 0 5px white);
  }

  .box4 {
    width: 10%;
    height: 10%;
    bottom: -10%;
    left: -10%;
    transition-delay: 0.6s;
  }

  .card:hover {
    transform: scale(1.1);
  }

  .card:hover .box {
    bottom: -1px;
    left: -1px;
  }

  .card:hover .logo {
    transform: translate(70px, -52px);
    letter-spacing: 0px;
  }
`;

export default SocialCard;
