import React from "react";
import { usePromiseTracker } from "react-promise-tracker";
import Loader from 'react-loader-spinner';
import { useLocation } from 'react-router-dom';

import "./LoaderContainer.css";

// Handles the toggle of Showing the Loader image.
const LoaderContainer = () => {
  
  const { promiseInProgress } = usePromiseTracker();
  const location = useLocation();
    
    return (
      (promiseInProgress && location.pathname !== '/app/Dashboard')  &&
      <div className={promiseInProgress?'fadeInLoader overlay':'fadeOutLoader overlay'}>
        <div className="spanner">
          <Loader
            type="ThreeDots"
            color="#82af13"
            height={35}
            width={75}
          />
          Loading
        </div>
      </div>
    );
}

export default LoaderContainer;