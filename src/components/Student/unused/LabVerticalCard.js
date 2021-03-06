import React from "react";
import styled from "styled-components";

import Button from "../../shared/Button";

const NavyCard = styled.div`
    padding: 1rem;
    max-width: 350px;
    min-height: 375px;
    border-radius: 7px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
    background-color: #0b1354;
    text-align: center;
`;

const LabVerticalCard = props => {
    return (
        <NavyCard>
            <img
                className="img-center"
                alt="labLogo"
                src={props.labIcon}
                height="64"
                width="64"
            />
            <h2>{props.labTitle}</h2>
            <p>{props.labDescription}</p>
            <Button
                buttonState="Resume"
                class_name={props.buttonClass}
                clicked={() => props.buttonClicked}
            />

            <style jsx="true">{`
                .img-center {
                    margin-left: auto;
                    margin-right: auto;			
            `}</style>
        </NavyCard>
    );
};

export default LabVerticalCard;
