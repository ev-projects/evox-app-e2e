import React from "react";
import { usePromiseTracker } from "react-promise-tracker";
import Loader from 'react-loader-spinner'


// Handles the toggle of Showing the Loader image.
const LoaderContainer = () => {
  
  const { promiseInProgress } = usePromiseTracker();

    return (
      promiseInProgress &&
      <div>
        <Loader
          type="Puff"
          color="#00BFFF"
          height={100}
          width={100}
          timeout={3000} //3 secs
        />
      </div>
    );
}

export default LoaderContainer;