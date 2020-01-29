import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  padding: 0.5em;

  background-color: ${props => props.theme.bg};
`;

const Elem = styled(Link)`
  width: 3em;
  height: 3em;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
`;

const Logo = styled.img`
  width: 100%;
`;

const Toolbar = props => {
  return (
    <Container>
      <Elem to="/">
        <Logo
          src={require("../../assets/icons/logo.png")}
          alt="Bit Project"
        />
      </Elem>
    </Container>
  );
};

export default Toolbar;